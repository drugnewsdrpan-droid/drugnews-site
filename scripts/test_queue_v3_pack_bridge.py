"""Changed pack argv and key-zeroing tests; no network or real Keychain."""
import argparse
import json
import subprocess
import unittest
from unittest.mock import patch
from queue_v3_keychain import pack


class Custody:
    def __init__(self):
        self.value = bytearray([0x55] * 32)

    def read(self):
        return self.value


class PackBridgeTests(unittest.TestCase):
    def run_case(self, recovery):
        custody = Custody()
        args = argparse.Namespace(node="synthetic-node", input="/private/input", output="/queue", recover_overdue=recovery)
        result = subprocess.CompletedProcess([], 0, json.dumps({"status": "V3_PACKED_NATIVE_GATES_PASS"}), "")
        with patch("queue_v3_keychain.subprocess.run", return_value=result) as run:
            pack(custody, args)
        command = run.call_args.args[0]
        self.assertEqual(command[0], "synthetic-node")
        self.assertEqual(command[2:4], ["/private/input", "/queue"])
        self.assertEqual(command[4:], ["--recover-overdue=" + recovery] if recovery else [])
        self.assertEqual(custody.value, bytearray(32))

    def test_default_future_only_argv_preserved(self):
        self.run_case(None)

    def test_exact_recovery_hash_forwarded_and_key_zeroed(self):
        self.run_case("a" * 64)


if __name__ == "__main__":
    unittest.main()
