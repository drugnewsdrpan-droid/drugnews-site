"""Mac-only V3 custody bridge. No export command, argv secret, or plaintext key file.

Requires PyNaCl 1.6.2 for the official GitHub sealed-box Secret API.
Uses the existing Git credential helper; never creates or changes auth tokens.
Only one exact V3 item and one exact environment Secret are writable.
"""
import argparse
import base64
import ctypes
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import urllib.error
import urllib.request

REPO = "drugnewsdrpan-droid/drugnews-site"
ENVIRONMENT = "github-pages"
SECRET = "DRUGNEWS_QUEUE_KEY_B64_V3"
SERVICE = b"com.drugnews.scheduler.queue.v3"
ACCOUNT = (REPO + ":" + ENVIRONMENT).encode()
ROOT = Path(__file__).resolve().parent.parent
BASE = f"/repos/{REPO}/environments/{ENVIRONMENT}/secrets"


class SafeFailure(Exception):
    pass


def safe_env():
    env = dict(os.environ)
    for name in list(env):
        if name.startswith("DRUGNEWS_QUEUE_KEY") or name.startswith("GIT_TRACE"):
            env.pop(name)
    env.update(GIT_TERMINAL_PROMPT="0", GIT_CURL_VERBOSE="0")
    return env


def git_credential():
    result = subprocess.run(["git", "credential", "fill"], input=b"protocol=https\nhost=github.com\n\n",
                            cwd=ROOT, env=safe_env(), stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=15)
    if result.returncode:
        raise SafeFailure("EXISTING_GIT_CREDENTIAL_UNAVAILABLE")
    fields = dict(line.split(b"=", 1) for line in result.stdout.splitlines() if b"=" in line)
    if not fields.get(b"password"):
        raise SafeFailure("EXISTING_GIT_CREDENTIAL_UNAVAILABLE")
    return fields[b"password"].decode()


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        raise SafeFailure("API_REDIRECT_REJECTED")


class GitHub:
    def __init__(self, expected_login):
        self.token = git_credential()
        self.opener = urllib.request.build_opener(NoRedirect)
        status, user = self.request("GET", "/user")
        if status != 200 or user.get("login") != expected_login:
            raise SafeFailure("AUTHENTICATED_ACCOUNT_MISMATCH")
        status, repo = self.request("GET", f"/repos/{REPO}")
        if status != 200 or repo.get("full_name") != REPO or not repo.get("permissions", {}).get("push"):
            raise SafeFailure("EXACT_REPO_WRITE_ACCESS_REQUIRED")
        status, env = self.request("GET", f"/repos/{REPO}/environments/{ENVIRONMENT}")
        if status != 200 or env.get("name") != ENVIRONMENT:
            raise SafeFailure("EXISTING_ENVIRONMENT_REQUIRED")
        self.login = expected_login

    def request(self, method, path, payload=None):
        if path != "/user" and not path.startswith(f"/repos/{REPO}"):
            raise SafeFailure("API_TARGET_FORBIDDEN")
        if method not in ("GET", "PUT") or (method == "PUT" and path != f"{BASE}/{SECRET}"):
            raise SafeFailure("API_MUTATION_FORBIDDEN")
        data = None if payload is None else json.dumps(payload).encode()
        req = urllib.request.Request("https://api.github.com" + path, data=data, method=method,
              headers={"Authorization": "Bearer " + self.token, "Accept": "application/vnd.github+json",
                       "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Drugnews-V3-Custody",
                       "Content-Type": "application/json"})
        try:
            with self.opener.open(req, timeout=20) as response:
                raw = response.read()
                return response.status, json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            if error.code == 404 and method == "GET":
                return 404, {}
            raise SafeFailure(f"GITHUB_{method}_HTTP_{error.code}") from None

    def old_metadata(self):
        result = {}
        for scope, prefix in (("environment", BASE), ("repository", f"/repos/{REPO}/actions/secrets")):
            for name in ("DRUGNEWS_QUEUE_KEY_B64", "DRUGNEWS_QUEUE_KEY_B64_V2"):
                status, data = self.request("GET", prefix + "/" + name)
                result[scope + "/" + name] = {"status": status, **{k: data.get(k) for k in ("name", "created_at", "updated_at")}}
        return result


class Keychain:
    def __init__(self):
        if sys.platform != "darwin":
            raise SafeFailure("MACOS_KEYCHAIN_REQUIRED")
        self.api = ctypes.CDLL("/System/Library/Frameworks/Security.framework/Security")
        self.api.SecKeychainSetUserInteractionAllowed.argtypes = [ctypes.c_bool]
        self.api.SecKeychainSetUserInteractionAllowed(False)
        self.api.SecKeychainFindGenericPassword.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p,
            ctypes.c_uint32, ctypes.c_void_p, ctypes.POINTER(ctypes.c_uint32), ctypes.POINTER(ctypes.c_void_p), ctypes.c_void_p]
        self.api.SecKeychainAddGenericPassword.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p,
            ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32, ctypes.c_void_p, ctypes.c_void_p]
        self.api.SecKeychainItemFreeContent.argtypes = [ctypes.c_void_p, ctypes.c_void_p]

    def exists(self):
        status = self.api.SecKeychainFindGenericPassword(None, len(SERVICE), SERVICE, len(ACCOUNT), ACCOUNT, None, None, None)
        if status not in (0, -25300):
            raise SafeFailure(f"KEYCHAIN_LOOKUP_STATUS_{status}")
        return status == 0

    def read(self):
        size, pointer = ctypes.c_uint32(), ctypes.c_void_p()
        status = self.api.SecKeychainFindGenericPassword(None, len(SERVICE), SERVICE, len(ACCOUNT), ACCOUNT,
                                                        ctypes.byref(size), ctypes.byref(pointer), None)
        if status != 0:
            raise SafeFailure(f"KEYCHAIN_READ_STATUS_{status}")
        try:
            if size.value != 32:
                raise SafeFailure("KEYCHAIN_V3_LENGTH_INVALID")
            return bytearray(ctypes.string_at(pointer, size.value))
        finally:
            self.api.SecKeychainItemFreeContent(None, pointer)

    def create_once(self):
        key = bytearray(os.urandom(32))
        try:
            buffer = (ctypes.c_ubyte * len(key)).from_buffer(key)
            status = self.api.SecKeychainAddGenericPassword(None, len(SERVICE), SERVICE, len(ACCOUNT), ACCOUNT, len(key), buffer, None)
            if status != 0:
                raise SafeFailure(f"KEYCHAIN_ADD_STATUS_{status}")
            actual = self.read()
            try:
                if actual != key:
                    raise SafeFailure("KEYCHAIN_PERSISTENCE_MISMATCH")
            finally:
                actual[:] = b"\0" * len(actual)
        finally:
            key[:] = b"\0" * len(key)


def provision(api, custody):
    from nacl.public import PublicKey, SealedBox
    if api.request("GET", f"{BASE}/{SECRET}")[0] != 404:
        raise SafeFailure("V3_ALREADY_EXISTS_NO_OVERWRITE")
    before = api.old_metadata()
    status, public = api.request("GET", BASE + "/public-key")
    if status != 200:
        raise SafeFailure("ENVIRONMENT_PUBLIC_KEY_REQUIRED")
    public_key = PublicKey(base64.b64decode(public["key"], validate=True))
    if not custody.exists():
        custody.create_once()
    key = custody.read()
    try:
        encrypted = base64.b64encode(SealedBox(public_key).encrypt(base64.b64encode(key))).decode()
        # Check again immediately before the sole permitted write; never rotate a slot.
        if api.request("GET", f"{BASE}/{SECRET}")[0] != 404:
            raise SafeFailure("V3_APPEARED_ABORT_NO_OVERWRITE")
        status, _ = api.request("PUT", f"{BASE}/{SECRET}", {"encrypted_value": encrypted, "key_id": public["key_id"]})
        if status != 201:
            raise SafeFailure("V3_CREATION_RESPONSE_NOT_201_STOP")
        read_status, metadata = api.request("GET", f"{BASE}/{SECRET}")
        if read_status != 200 or metadata.get("name") != SECRET or api.old_metadata() != before:
            raise SafeFailure("SECRET_METADATA_ACCEPTANCE_FAILED_STOP")
        return {"status": "V3_CREATED_KEYCHAIN_AND_ENVIRONMENT", "login": api.login, "repo": REPO,
                "environment": ENVIRONMENT, "secret_name": SECRET, "created_at": metadata.get("created_at"),
                "old_secret_metadata_unchanged": True, "key_value_disclosed": False}
    finally:
        key[:] = b"\0" * len(key)


def pack(custody, args):
    key = custody.read()
    try:
        result = subprocess.run([args.node, str(ROOT / "scripts/queue_v3_pack.mjs"), str(Path(args.input).resolve()),
                                 str(Path(args.output).resolve())], input=key, stdout=subprocess.PIPE,
                                 stderr=subprocess.PIPE, cwd=ROOT, env=safe_env(), timeout=180)
        if result.returncode:
            raise SafeFailure("V3_PACK_FAILED_NO_SENSITIVE_OUTPUT")
        data = json.loads(result.stdout)
        if data.get("status") != "V3_PACKED_NATIVE_GATES_PASS":
            raise SafeFailure("V3_PACK_RECEIPT_INVALID")
        return data
    finally:
        key[:] = b"\0" * len(key)


def main():
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("probe", "provision", "pack"))
    parser.add_argument("--expected-login")
    parser.add_argument("--node")
    parser.add_argument("--input")
    parser.add_argument("--output")
    args = parser.parse_args()
    custody = Keychain()
    if args.command == "pack":
        if not all((args.node, args.input, args.output)):
            raise SafeFailure("PACK_PATH_ARGUMENTS_REQUIRED")
        result = pack(custody, args)
    else:
        if not args.expected_login:
            raise SafeFailure("EXPECTED_LOGIN_REQUIRED")
        api = GitHub(args.expected_login)
        if args.command == "probe":
            result = {"status": "READ_ONLY_PROBE", "login": api.login, "repo": REPO, "environment": ENVIRONMENT,
                      "keychain_v3_exists": custody.exists(), "remote_v3_exists": api.request("GET", f"{BASE}/{SECRET}")[0] == 200,
                      "old_secret_metadata": api.old_metadata()}
        else:
            result = provision(api, custody)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except SafeFailure as error:
        print(json.dumps({"status": "FAIL_CLOSED", "reason": str(error)}))
        sys.exit(1)
    except Exception:
        # Never serialize exceptions from HTTP/subprocess/crypto, which may include request data.
        print(json.dumps({"status": "FAIL_CLOSED", "reason": "UNEXPECTED_FAILURE_DETAILS_SUPPRESSED"}))
        sys.exit(1)
