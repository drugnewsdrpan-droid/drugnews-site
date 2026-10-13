#!/usr/bin/env python3
"""Ingest engine packages (articles / reports) from a downloaded Drive inbox into the repo.

Usage:
  python3 scripts/ingest_engine_inbox.py --raw <downloaded_inbox_dir> [--repo .] [--paths-out FILE]

A package is a top-level folder (or .zip) inside the raw inbox:
  article package : article.md + meta.json + images/          -> content/published/<slug>/
  report package  : report.md + figures/                       -> reports/<slug>.html (+ assets, index, registry)

Each package is validated with the same gates the production deploy uses
(publish_articles.mjs inbox validation + strict audits).  Accepted packages are
staged in the working tree; the caller commits the paths listed in --paths-out.
Results (accepted / rejected / pending, with reasons) are written to
content/engine/inbox-log.json so the engine can read them back from GitHub.

The script never exits non-zero because of a bad package; only because of an
internal error (missing node, broken repo).
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

LOG_REL = Path("content/engine/inbox-log.json")
ARTICLE_FILES = ("article.md", "meta.json")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{2,120}$")
AUDITS = [
    ["npm", "run", "--silent", "audit:references:strict"],
    ["npm", "run", "--silent", "audit:reader:strict"],
    ["npm", "run", "--silent", "audit:english-completeness:strict"],
    ["npm", "run", "--silent", "audit:english-localization"],
]
SITE_BASE = "https://drugnews.com.tw"
GRAPH_API = "https://graph.facebook.com/v21.0"


def schedule_fb_post(meta: dict, url: str, log_entry: dict) -> None:
    """第 0 層：驗證通過的中文文章用 Graph API 建 FB 貼文（未到 publish_at 就排程，到了就直接發）。
    只在 repo secret META_PAGE_TOKEN 存在時執行；已有 fb_post_id 的包不重做；失敗只記 fb_error，不影響上線。"""
    token = os.environ.get("META_PAGE_TOKEN", "").strip()
    if not token or log_entry.get("fb_post_id") or str(meta.get("slug", "")).endswith("-en"):
        return
    page_id = os.environ.get("META_PAGE_ID", "61568446257142").strip()
    try:
        import urllib.parse
        import urllib.request

        text = str(meta.get("fb") or meta.get("summary") or meta.get("title") or "").strip()
        title = str(meta.get("title") or "").strip()
        message = (f"{title}\n\n{text}" if text and title and text != title else text or title) + f"\n\n完整分析：{url}"
        form = {"message": message, "link": url, "access_token": token}
        publish_at = dt.datetime.fromisoformat(str(meta["publish_at"]).replace("Z", "+00:00"))
        lead = (publish_at - dt.datetime.now(dt.timezone.utc)).total_seconds()
        if lead > 15 * 60:
            form.update({"published": "false", "scheduled_publish_time": str(int(publish_at.timestamp()))})
        req = urllib.request.Request(f"{GRAPH_API}/{page_id}/feed",
                                     data=urllib.parse.urlencode(form).encode("utf-8"), method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = json.loads(resp.read().decode("utf-8"))
        log_entry["fb_post_id"] = str(data.get("id") or "")
        log_entry["fb_scheduled"] = form.get("scheduled_publish_time") is not None
        log_entry.pop("fb_error", None)
    except Exception as e:  # noqa: BLE001
        body = ""
        try:
            body = e.read().decode("utf-8")[:300]  # type: ignore[attr-defined]
        except Exception:  # noqa: BLE001
            pass
        log_entry["fb_error"] = f"{type(e).__name__}: {e} {body}".strip()


def now_iso() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def package_hash(root: Path) -> str:
    rows = []
    for p in sorted(root.rglob("*")):
        if p.is_file() and not p.name.startswith("."):
            rows.append(f"{p.relative_to(root).as_posix()}\t{sha256_file(p)}")
    return hashlib.sha256("\n".join(rows).encode("utf-8")).hexdigest()


def run(cmd, cwd: Path, env=None, timeout=1800) -> subprocess.CompletedProcess:
    merged = dict(os.environ)
    if env:
        merged.update(env)
    return subprocess.run(cmd, cwd=str(cwd), env=merged, capture_output=True, text=True, timeout=timeout)


def tail(s: str, n: int = 12) -> str:
    lines = [l for l in (s or "").strip().splitlines() if l.strip()]
    return "\n".join(lines[-n:])


def git(repo: Path, *args) -> subprocess.CompletedProcess:
    return run(["git", *args], repo)


def tracked_or_exists(repo: Path, rel: str) -> bool:
    return (repo / rel).exists()


TAIPEI = dt.timezone(dt.timedelta(hours=8))


def taipei_day(publish_at: str) -> str | None:
    """YYYY-MM-DD of an ISO timestamp in Asia/Taipei, or None if it is not a timezone-aware ISO time."""
    try:
        value = dt.datetime.fromisoformat(publish_at.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    if value.tzinfo is None:
        return None
    return value.astimezone(TAIPEI).strftime("%Y-%m-%d")


def revert_path(repo: Path, rel: str) -> None:
    """Restore a path to HEAD (or delete it if it was untracked)."""
    git(repo, "checkout", "--", rel)
    git(repo, "clean", "-fdq", "--", rel)
    p = repo / rel
    if p.exists() and git(repo, "ls-files", "--error-unmatch", rel).returncode != 0:
        shutil.rmtree(p, ignore_errors=True)


# ---------------------------------------------------------------- discovery

def unpack_zip(zpath: Path, work: Path) -> Path | None:
    target = work / zpath.stem
    target.mkdir(parents=True, exist_ok=True)
    try:
        with zipfile.ZipFile(zpath) as z:
            for member in z.infolist():
                name = member.filename
                if name.startswith("__MACOSX/") or Path(name).name.startswith("."):
                    continue
                dest = (target / name).resolve()
                if not str(dest).startswith(str(target.resolve())):
                    return None  # zip-slip
                if member.is_dir():
                    dest.mkdir(parents=True, exist_ok=True)
                else:
                    dest.parent.mkdir(parents=True, exist_ok=True)
                    with z.open(member) as src, dest.open("wb") as out:
                        shutil.copyfileobj(src, out)
    except zipfile.BadZipFile:
        return None
    return target


def descend(root: Path) -> Path:
    """If a package wraps its files in a single sub-folder, use that folder."""
    for _ in range(3):
        if any((root / f).exists() for f in ("article.md", "report.md")):
            return root
        entries = [e for e in root.iterdir() if not e.name.startswith(".")]
        dirs = [e for e in entries if e.is_dir()]
        files = [e for e in entries if e.is_file()]
        if len(dirs) == 1 and not files:
            root = dirs[0]
            continue
        break
    return root


def discover(raw: Path, work: Path) -> list[tuple[str, Path | None, str | None]]:
    """Return (package_name, package_dir_or_None, error_or_None)."""
    found = []
    for entry in sorted(raw.iterdir()):
        if entry.name.startswith(".") or entry.name.lower().startswith(("00_", "readme")):
            continue
        if entry.is_dir():
            found.append((entry.name, descend(entry), None))
        elif entry.suffix.lower() == ".zip":
            extracted = unpack_zip(entry, work)
            if extracted is None:
                found.append((entry.stem, None, "zip 無法解開（損壞或含不安全路徑）"))
            else:
                found.append((entry.stem, descend(extracted), None))
        # loose files (e.g. a stray md) are ignored silently
    return found


def classify(pkg: Path) -> str:
    if all((pkg / f).is_file() for f in ARTICLE_FILES):
        return "article"
    if (pkg / "report.md").is_file():
        return "report"
    return "unknown"


# ---------------------------------------------------------------- gates

IMG_RE = re.compile(r"!\[[^\]]*]\(([^)]+)\)")


def build_inline_variants(repo: Path, folder: Path, meta: dict) -> tuple[bool, str]:
    """Create the -720/-1400 webp variants the renderer expects for inline PNG figures.

    The publisher only generates variants for the cover; with responsive_inline_images=true the
    article page references <figure>-720.webp / -1400.webp, so they must travel with the package.
    """
    if meta.get("responsive_inline_images") is not True:
        return True, ""
    md = (folder / "article.md").read_text("utf-8", errors="replace")
    sources = []
    for src in IMG_RE.findall(md):
        src = src.strip()
        if src.startswith(("http://", "https://")) or not src.lower().endswith(".png"):
            continue
        p = folder / src
        if p.is_file() and p not in sources:
            sources.append(p)
    for p in sources:
        dest = p.with_suffix("")
        if dest.with_name(dest.name + "-720.webp").exists() and dest.with_name(dest.name + "-1400.webp").exists():
            continue
        js = ("import('./scripts/build_article_media.mjs').then(m => m.buildResponsiveCover(process.argv[1], process.argv[2]))"
              ".then(r => { console.log(JSON.stringify(r)); if (r.some(x => !x.pass)) process.exit(2); })"
              ".catch(e => { console.error(e.message); process.exit(1); })")
        res = run(["node", "--input-type=module", "-e", js, "--", str(p), str(dest)], repo)
        if res.returncode != 0:
            return False, f"圖片 {p.name} 無法產生 webp 變體（請用 1200×675、≤500KB 的 PNG）：{tail(res.stderr or res.stdout)}"
    return True, ""


def run_gates(repo: Path) -> tuple[bool, str]:
    """Run the same deterministic quality gates as the production deploy."""
    for cmd in AUDITS:
        res = run(cmd, repo)
        if res.returncode != 0:
            return False, f"{' '.join(cmd[3:])} 未通過：\n{tail(res.stderr or res.stdout)}"
    return True, ""


def ingest_article(repo: Path, name: str, pkg: Path, log: dict, now: str) -> dict:
    try:
        meta = json.loads((pkg / "meta.json").read_text("utf-8"))
    except Exception as e:  # noqa: BLE001
        return {"status": "rejected", "reason": f"meta.json 不是合法 JSON：{e}"}
    slug = str(meta.get("slug") or "").strip()
    if not SLUG_RE.match(slug):
        return {"status": "rejected", "reason": "meta.json 的 slug 必須是小寫英數與連字號（例：argenx-sjogrens-unity），3–120 字"}
    date = str(meta.get("date") or "")
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        return {"status": "rejected", "reason": "meta.json 的 date 必須是 YYYY-MM-DD"}
    publish_day = taipei_day(str(meta.get("publish_at") or ""))
    if publish_day is None:
        return {"status": "rejected", "slug": slug,
                "reason": "meta.json 的 publish_at 必須是含時區的時間（例 2026-10-14T08:00:00+08:00）"}
    if publish_day != date:
        return {"status": "rejected", "slug": slug,
                "reason": f"publish_at 的台北日期（{publish_day}）必須等於 date（{date}）：網址用 date，首頁排序用 publish_at，兩者不同會錯排"}

    target_rel = f"content/published/{slug}"
    pre_existing = tracked_or_exists(repo, target_rel)
    if pre_existing:
        # a live article's URL is /articles/<date>-<slug>.html; changing date would retire the old URL
        # and the deploy guard (LIVE_INVENTORY_REGRESSION) refuses the whole site build
        try:
            live_date = str(json.loads((repo / target_rel / "meta.json").read_text("utf-8")).get("date") or "")
        except Exception:  # noqa: BLE001
            live_date = ""
        if live_date and live_date != date:
            return {"status": "rejected", "slug": slug,
                    "reason": f"已上線文章的 date 不可改（官網是 {live_date}，投遞是 {date}）：網址會變、部署會被擋。要改只能改標題、內文、summary、tags 或同一天的 publish_at 時間"}
    previously_engine = any(v.get("slug") == slug and v.get("status") == "published" for v in log.values())
    if pre_existing and not previously_engine:
        # an article the engine (or Claude for the engine) placed directly is marked source_platform=Drugnews
        try:
            existing = json.loads((repo / target_rel / "meta.json").read_text("utf-8"))
            previously_engine = existing.get("source_platform") == "Drugnews"
        except Exception:  # noqa: BLE001
            previously_engine = False
    if pre_existing and not previously_engine:
        return {"status": "rejected", "slug": slug, "reason": f"slug「{slug}」官網已存在且不是引擎投遞的文章；請換 slug"}

    # Stage through the publisher's own inbox validation (disclaimer, images, category, dates ...)
    with tempfile.TemporaryDirectory(prefix="engine-inbox-") as tmp:
        inbox = Path(tmp) / "inbox"
        inbox.mkdir()
        shutil.copytree(pkg, inbox / slug)
        # drop stray files that are not part of the package contract
        for stray in (inbox / slug).iterdir():
            if stray.is_file() and (stray.name.startswith("zz_") or stray.name.startswith(".")):
                stray.unlink()
        # text-only update: a package without images for an engine-owned article reuses the images
        # already in the repo (so a title/date/body fix does not require re-uploading figures)
        if pre_existing and previously_engine:
            md_text = (inbox / slug / "article.md").read_text("utf-8", errors="replace")
            wanted = [s.strip() for s in IMG_RE.findall(md_text)] + [
                str(meta.get(k) or "") for k in ("cover_image", "card_image", "homepage_cover_image")]
            for rel in wanted:
                if not rel or rel.startswith(("http://", "https://")):
                    continue
                dst = inbox / slug / rel
                src = repo / target_rel / rel
                if not dst.exists() and src.is_file():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                    for variant in src.parent.glob(src.stem + "-*.webp"):
                        shutil.copy2(variant, dst.parent / variant.name)
        ok, why = build_inline_variants(repo, inbox / slug, meta)
        if not ok:
            return {"status": "rejected", "slug": slug, "reason": why}
        errors_file = repo / "content/publish-errors.json"
        if errors_file.exists():
            errors_file.unlink()
        res = run(["node", "scripts/publish_articles.mjs"], repo,
                  env={"DRUGNEWS_INBOX": str(inbox), "DRUGNEWS_NOW": now, "CI": "true"})
        if res.returncode != 0:
            reason = tail(res.stderr or res.stdout)
            if errors_file.exists():
                try:
                    data = json.loads(errors_file.read_text("utf-8"))
                    reason = "；".join(err for item in data.get("errors", []) for err in item.get("errors", [])) or reason
                except Exception:  # noqa: BLE001
                    pass
                errors_file.unlink()
            revert_path(repo, target_rel)
            return {"status": "rejected", "slug": slug, "reason": reason}
        if (inbox / slug).exists():
            # validated but publish_at is in the future: publisher leaves it in the inbox
            return {"status": "pending", "slug": slug,
                    "reason": f"已驗證，等 publish_at={meta.get('publish_at')} 到時自動上線"}

    ok, why = run_gates(repo)
    if not ok:
        revert_path(repo, target_rel)
        return {"status": "rejected", "slug": slug, "reason": why}
    return {"status": "published", "slug": slug, "paths": [target_rel],
            "url": f"{SITE_BASE}/articles/{date}-{slug}.html"}


def report_gate(repo: Path) -> tuple[bool, str]:
    """Replicate the deploy's report reader contract on a throwaway site copy."""
    with tempfile.TemporaryDirectory(prefix="engine-site-") as tmp:
        site = Path(tmp) / "_site"
        excl = [".git", ".github", "_site", "content", "scripts", "node_modules", "package.json",
                "package-lock.json", "README.md", ".gitignore"]
        cmd = ["rsync", "-a"] + [f"--exclude={e}" for e in excl] + [f"{repo}/", f"{site}/"]
        res = run(cmd, repo)
        if res.returncode != 0:
            return False, "rsync 失敗：" + tail(res.stderr)
        reg = repo / "content/report-reader-assets.json"
        for action in ("prepare", "audit"):
            res = run(["node", "scripts/report_reader_contract.mjs", action, f"--root={site}", f"--registry={reg}"], repo)
            if res.returncode != 0:
                return False, f"report_reader_contract {action} 未通過：" + tail(res.stderr or res.stdout)
    return True, ""


def ingest_report(repo: Path, name: str, pkg: Path, log: dict, now: str) -> dict:
    head = (pkg / "report.md").read_text("utf-8", errors="replace")[:4000]
    m_slug = re.search(r"^slug:\s*(\S+)", head, re.M)
    m_asset = re.search(r"^asset_id:\s*(\S+)", head, re.M)
    if not (m_slug and m_asset):
        return {"status": "rejected", "reason": "report.md 開頭的 front matter 需要 slug 與 asset_id"}
    slug, asset_id = m_slug.group(1).strip("'\""), m_asset.group(1).strip("'\"")
    if not SLUG_RE.match(slug) or not SLUG_RE.match(asset_id):
        return {"status": "rejected", "reason": "report.md 的 slug / asset_id 必須是小寫英數與連字號"}
    page_rel = f"reports/{slug}.html"
    previously_engine = any(v.get("slug") == slug and v.get("status") == "published" for v in log.values())
    if tracked_or_exists(repo, page_rel) and not previously_engine:
        return {"status": "rejected", "slug": slug, "reason": f"報告頁 {page_rel} 已存在且不是引擎投遞；請換 slug"}

    touched = [page_rel, f"assets/reports/{asset_id}", "reports/index.html", "content/report-reader-assets.json"]
    res = run(["python3", "scripts/build_report_page.py", str(pkg), "--write-index", "--register"], repo)
    if res.returncode != 0:
        for rel in touched:
            revert_path(repo, rel)
        return {"status": "rejected", "slug": slug, "reason": "報告頁產生失敗：" + tail(res.stderr or res.stdout)}
    ok, why = report_gate(repo)
    if not ok:
        for rel in touched:
            revert_path(repo, rel)
        return {"status": "rejected", "slug": slug, "reason": why}
    return {"status": "published", "slug": slug, "paths": touched, "url": f"{SITE_BASE}/{page_rel}"}


# ---------------------------------------------------------------- main

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True, help="directory the Drive inbox was downloaded into")
    ap.add_argument("--repo", default=".")
    ap.add_argument("--paths-out", default=None, help="file to receive the repo-relative paths to git add")
    ap.add_argument("--lead-minutes", type=int, default=20,
                    help="treat articles whose publish_at falls within the next N minutes as due (default 20), "
                         "so an 08:00 article staged by the 07:50 run is live by 08:00")
    args = ap.parse_args()

    repo = Path(args.repo).resolve()
    raw = Path(args.raw).resolve()
    now = now_iso()
    # publisher clock: slightly ahead so the scheduled run just before the hour catches on-the-hour articles
    due_clock = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(minutes=max(0, args.lead_minutes))) \
        .replace(microsecond=0).isoformat().replace("+00:00", "Z")
    log_path = repo / LOG_REL
    log_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        log_doc = json.loads(log_path.read_text("utf-8")) if log_path.exists() else {}
    except Exception:  # noqa: BLE001
        log_doc = {}
    log: dict = log_doc.get("packages", {})

    def fingerprint(entries: dict) -> str:
        # ignore the per-run timestamp so a still-pending package does not produce a commit every run
        return json.dumps({k: {kk: vv for kk, vv in v.items() if kk != "checked_at"} for k, v in entries.items()},
                          sort_keys=True, ensure_ascii=False)

    original_log = fingerprint(log)

    paths: list[str] = []
    summary: list[str] = []

    # gdown wraps the download in a directory named after the Drive folder; unwrap it
    while raw.exists():
        entries = [e for e in raw.iterdir() if not e.name.startswith(".")]
        if len(entries) == 1 and entries[0].is_dir() and classify(entries[0]) == "unknown" \
                and not any(f.suffix.lower() == ".zip" for f in entries):
            raw = entries[0]
            continue
        break

    if not raw.exists():
        summary.append("投遞箱下載目錄不存在，本輪略過")
    else:
        with tempfile.TemporaryDirectory(prefix="engine-zips-") as work:
            for name, pkg, err in discover(raw, Path(work)):
                entry_prev = log.get(name, {})
                if err:
                    result = {"status": "rejected", "reason": err}
                    h = None
                else:
                    h = package_hash(pkg)
                    if entry_prev.get("hash") == h and entry_prev.get("status") in ("published", "rejected"):
                        continue  # already handled this exact content
                    kind = classify(pkg)
                    if kind == "article":
                        result = ingest_article(repo, name, pkg, log, due_clock)
                    elif kind == "report":
                        result = ingest_report(repo, name, pkg, log, now)
                    else:
                        result = {"status": "rejected",
                                  "reason": "看不出是文章還是報告：文章要有 article.md + meta.json，報告要有 report.md"}
                    result["kind"] = kind
                    if kind == "article" and result["status"] in ("pending", "published"):
                        # 第 0 層 FB 排程貼文：沿用先前的 fb_post_id（pending 的包每輪都會重驗）
                        for key in ("fb_post_id", "fb_scheduled", "fb_error"):
                            if key in entry_prev and key not in result:
                                result[key] = entry_prev[key]
                        try:
                            fb_meta = json.loads((pkg / "meta.json").read_text("utf-8"))
                            fb_url = result.get("url") or f"{SITE_BASE}/articles/{fb_meta.get('date')}-{fb_meta.get('slug')}.html"
                            schedule_fb_post(fb_meta, fb_url, result)
                        except Exception as e:  # noqa: BLE001
                            result["fb_error"] = f"meta: {e}"
                result.update({"hash": h, "checked_at": now})
                if result["status"] == "published":
                    result["ingested_at"] = now
                    paths.extend(result.pop("paths", []))
                log[name] = result
                summary.append(f"{result['status']:9s} {name}  {result.get('url') or result.get('reason','')}")

    if fingerprint(log) != original_log:
        log_doc = {
            "_readme": "藥時事引擎投遞箱結果。status: published=已進官網 repo 並觸發部署（90 秒後核 url 是否 200）；"
                       "pending=已驗證、等 publish_at；rejected=退件，reason 寫原因，改好重丟同名資料夾即可重驗。",
            "updated_at": now,
            "packages": log,
        }
        log_path.write_text(json.dumps(log_doc, ensure_ascii=False, indent=2) + "\n", "utf-8")
        paths.append(LOG_REL.as_posix())

    if args.paths_out:
        Path(args.paths_out).write_text("\n".join(dict.fromkeys(paths)) + ("\n" if paths else ""), "utf-8")

    text = "\n".join(summary) if summary else "投遞箱沒有新東西"
    print(text)
    step_summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if step_summary:
        with open(step_summary, "a", encoding="utf-8") as f:
            f.write("## 引擎投遞箱\n\n```\n" + text + "\n```\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
