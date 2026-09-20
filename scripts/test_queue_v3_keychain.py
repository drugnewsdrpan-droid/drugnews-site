"""Synthetic-only tests: no network, Keychain access, or operational key."""
import base64
import unittest
from nacl.public import PrivateKey, SealedBox
from queue_v3_keychain import BASE, SECRET, SafeFailure, provision


class FakeCustody:
    def __init__(self, existing=False):
        self.existing = existing
        self.creates = 0
        self.value = bytes([0x63]) * 32

    def exists(self):
        return self.existing

    def create_once(self):
        self.creates += 1
        self.existing = True

    def read(self):
        return bytearray(self.value)


class FakeGitHub:
    login = "synthetic-user"

    def __init__(self, existing=False, refuse=False, changed_old=False):
        self.key = PrivateKey(bytes([0x32]) * 32)
        self.existing, self.refuse, self.changed_old = existing, refuse, changed_old
        self.puts = []
        self.metadata_calls = 0

    def old_metadata(self):
        self.metadata_calls += 1
        return {"v1": "unchanged", "v2": "changed" if self.changed_old and self.metadata_calls > 1 else "unchanged"}

    def request(self, method, path, payload=None):
        if method == "GET" and path == BASE + "/public-key":
            return 200, {"key": base64.b64encode(bytes(self.key.public_key)).decode(), "key_id": "synthetic-public-id"}
        if path != BASE + "/" + SECRET:
            raise AssertionError("unexpected endpoint")
        if method == "GET":
            return (200, {"name": SECRET, "created_at": "synthetic"}) if self.existing else (404, {})
        if method != "PUT":
            raise AssertionError("unexpected mutation")
        self.puts.append(payload)
        if self.refuse:
            raise SafeFailure("GITHUB_PUT_HTTP_403")
        self.existing = True
        return 201, {}


class CustodyTests(unittest.TestCase):
    def test_sealed_box_only_v3_and_old_metadata_preserved(self):
        api, custody = FakeGitHub(), FakeCustody()
        receipt = provision(api, custody)
        self.assertEqual(receipt["status"], "V3_CREATED_KEYCHAIN_AND_ENVIRONMENT")
        self.assertEqual(custody.creates, 1)
        self.assertEqual(len(api.puts), 1)
        sealed = base64.b64decode(api.puts[0]["encrypted_value"])
        self.assertNotIn(custody.value, sealed)
        self.assertEqual(SealedBox(api.key).decrypt(sealed), base64.b64encode(custody.value))
        self.assertFalse(receipt["key_value_disclosed"])

    def test_existing_remote_slot_never_overwritten(self):
        api, custody = FakeGitHub(existing=True), FakeCustody()
        with self.assertRaisesRegex(SafeFailure, "V3_ALREADY_EXISTS_NO_OVERWRITE"):
            provision(api, custody)
        self.assertEqual(api.puts, [])
        self.assertEqual(custody.creates, 0)

    def test_retry_reuses_persisted_v3_not_rotation(self):
        api, custody = FakeGitHub(), FakeCustody(existing=True)
        provision(api, custody)
        self.assertEqual(custody.creates, 0)

    def test_permission_refusal_retains_local_custody_and_stops(self):
        api, custody = FakeGitHub(refuse=True), FakeCustody()
        with self.assertRaisesRegex(SafeFailure, "GITHUB_PUT_HTTP_403"):
            provision(api, custody)
        self.assertTrue(custody.existing)
        self.assertEqual(len(api.puts), 1)

    def test_changed_old_secret_metadata_is_not_accepted(self):
        with self.assertRaisesRegex(SafeFailure, "SECRET_METADATA_ACCEPTANCE_FAILED_STOP"):
            provision(FakeGitHub(changed_old=True), FakeCustody())


if __name__ == "__main__":
    unittest.main()
