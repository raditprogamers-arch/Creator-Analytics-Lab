import pytest
from core.config import normalize_sqlalchemy_url, mask_database_url
from core.database import test_connection as check_db_conn, Platform, Content


def test_normalize_sqlalchemy_url():
    url_pg = "postgresql://user:pass@host.neon.tech/neondb"
    norm = normalize_sqlalchemy_url(url_pg)
    assert norm.startswith("postgresql+psycopg://")

    url_already_norm = "postgresql+psycopg://user:pass@host.neon.tech/neondb"
    assert normalize_sqlalchemy_url(url_already_norm) == url_already_norm


def test_mask_database_url():
    url = "postgresql://myuser:supersecretpassword@ep-sample-123.aws.neon.tech/neondb?sslmode=require"
    masked = mask_database_url(url)
    assert "supersecretpassword" not in masked
    assert "myuser" in masked
    assert "****" in masked


def test_database_connection_live():
    res = check_db_conn()
    assert res["success"] is True
    assert "neondb" in res["database"]
    assert len(res["tables"]) >= 4
