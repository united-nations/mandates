"""Validate verified TLS before any pipeline database connection is opened."""
import ssl

from psycopg2.extensions import parse_dsn, make_dsn


def verified_database_url(url: str) -> str:
    message = "Database URL must explicitly use sslmode=verify-full"
    try:
        options = parse_dsn(url)
    except Exception:
        # libpq's parsing errors may include parts of the credential-bearing URL.
        raise ValueError(message) from None
    if options.get("sslmode") != "verify-full":
        raise ValueError(message)
    # libpq otherwise looks for a per-user root.crt. Use the operating system's
    # trust bundle when available; an explicit operator-provided CA takes priority.
    if not options.get("sslrootcert"):
        cafile = ssl.get_default_verify_paths().cafile
        if not cafile:
            raise ValueError("Configure sslrootcert with a trusted CA bundle")
        options["sslrootcert"] = cafile
    return make_dsn(**options)
