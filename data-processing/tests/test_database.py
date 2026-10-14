import unittest
from unittest.mock import patch

from psycopg2.extensions import parse_dsn
from utils.database import verified_database_url


class DatabaseTlsTests(unittest.TestCase):
    def test_weaker_and_malformed_settings_are_rejected_without_credentials(self):
        for mode in ("disable", "allow", "prefer", "require", "verify-ca", ""):
            with self.subTest(mode=mode), self.assertRaises(ValueError) as error:
                verified_database_url(
                    f"postgresql://reader:private-password@db.invalid/db?sslmode={mode}"
                )
            self.assertNotIn("private-password", str(error.exception))

    def test_verified_mode_uses_system_ca_and_preserves_explicit_ca(self):
        url = "postgresql://reader:private-password@db.invalid/db?sslmode=verify-full"
        with patch("utils.database.ssl.get_default_verify_paths") as defaults:
            defaults.return_value.cafile = "/system/ca-bundle.pem"
            self.assertEqual(parse_dsn(verified_database_url(url))["sslrootcert"], "/system/ca-bundle.pem")
            self.assertEqual(
                parse_dsn(verified_database_url(url + "&sslrootcert=/custom/ca.pem"))["sslrootcert"],
                "/custom/ca.pem",
            )

    def test_missing_trust_bundle_fails_closed(self):
        with patch("utils.database.ssl.get_default_verify_paths") as defaults:
            defaults.return_value.cafile = None
            with self.assertRaisesRegex(ValueError, "sslrootcert"):
                verified_database_url("postgresql://db.invalid/db?sslmode=verify-full")
