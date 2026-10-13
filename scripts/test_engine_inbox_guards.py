#!/usr/bin/env python3
"""Guard-level regressions for scripts/ingest_engine_inbox.py (no node, no network).

Run: python3 scripts/test_engine_inbox_guards.py
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("ingest_engine_inbox", ROOT / "scripts" / "ingest_engine_inbox.py")
mod = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(mod)

BASE_META = {
    "title": "t", "slug": "guard-test-article", "date": "2026-10-13",
    "publish_at": "2026-10-13T08:00:00+08:00", "category": "商業分析系列",
    "tags": ["x"], "summary": "s", "source_platform": "Drugnews",
}


def package(tmp: Path, meta: dict) -> Path:
    pkg = tmp / "2026-10-13_guard-test-article"
    pkg.mkdir(parents=True, exist_ok=True)
    (pkg / "article.md").write_text("# t\n\n內文。\n\n*本文為產業與公司分析，不構成投資或醫療建議。*\n", "utf-8")
    (pkg / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), "utf-8")
    return pkg


def live_article(repo: Path, meta: dict) -> None:
    target = repo / "content" / "published" / meta["slug"]
    target.mkdir(parents=True, exist_ok=True)
    (target / "meta.json").write_text(json.dumps(meta, ensure_ascii=False), "utf-8")
    (target / "article.md").write_text("# t\n", "utf-8")


def run_case(name: str, meta: dict, live: dict | None, expect_reason: str | None) -> bool:
    with tempfile.TemporaryDirectory() as raw, tempfile.TemporaryDirectory() as repo:
        pkg = package(Path(raw), meta)
        if live:
            live_article(Path(repo), live)
        result = mod.ingest_article(Path(repo), pkg.name, pkg, {}, "2026-10-13T00:00:00Z")
        reason = str(result.get("reason") or "")
        ok = (result.get("status") == "rejected" and expect_reason in reason) if expect_reason else (
            # guards passed → the function proceeds to the publisher (which is absent here) and reports
            # a rejection that is NOT one of the guard reasons
            not any(k in reason for k in ("publish_at 的台北日期", "不可改", "必須是含時區")))
        print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" → {result}"))
        return ok


def main() -> int:
    assert mod.taipei_day("2026-10-14T08:00:00+08:00") == "2026-10-14"
    assert mod.taipei_day("2026-10-13T23:30:00Z") == "2026-10-14"
    assert mod.taipei_day("2026-10-14T08:00:00") is None
    assert mod.taipei_day("") is None
    results = [
        run_case("publish_at on another Taipei day is rejected",
                 {**BASE_META, "publish_at": "2026-10-14T08:00:00+08:00"}, None, "publish_at 的台北日期"),
        run_case("naive publish_at is rejected",
                 {**BASE_META, "publish_at": "2026-10-13T08:00:00"}, None, "必須是含時區"),
        run_case("changing a live article's date is rejected",
                 {**BASE_META, "date": "2026-10-12", "publish_at": "2026-10-12T20:00:00+08:00"},
                 BASE_META, "不可改"),
        run_case("same-day time change on a live article passes the guards",
                 {**BASE_META, "publish_at": "2026-10-13T07:30:00+08:00"}, BASE_META, None),
        run_case("new article with consistent dates passes the guards", BASE_META, None, None),
    ]
    failed = results.count(False)
    print(json.dumps({"suite": "engine-inbox-guards", "tests": len(results), "passed": len(results) - failed, "failed": failed}))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
