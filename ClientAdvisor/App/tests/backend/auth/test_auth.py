import base64
import json
from unittest.mock import patch

from backend.auth.auth_utils import get_authenticated_user_details, get_tenantid


def test_get_authenticated_user_details_no_principal_id():
    request_headers = {}
    sample_user_data = {
        "X-Ms-Client-Principal-Id": "default-id",
        "X-Ms-Client-Principal-Name": "default-name",
        "X-Ms-Client-Principal-Idp": "default-idp",
        "X-Ms-Token-Aad-Id-Token": "default-token",
        "X-Ms-Client-Principal": "default-b64",
    }
    with patch("backend.auth.sample_user.sample_user", sample_user_data):
        user_details = get_authenticated_user_details(request_headers)
        assert user_details["user_principal_id"] == "default-id"
        assert user_details["user_name"] == "default-name"
        assert user_details["auth_provider"] == "default-idp"
        assert user_details["auth_token"] == "default-token"
        assert user_details["client_principal_b64"] == "default-b64"


def test_get_authenticated_user_details_with_principal_id():
    request_headers = {
        "X-Ms-Client-Principal-Id": "test-id",
        "X-Ms-Client-Principal-Name": "test-name",
        "X-Ms-Client-Principal-Idp": "test-idp",
        "X-Ms-Token-Aad-Id-Token": "test-token",
        "X-Ms-Client-Principal": "test-b64",
    }
    user_details = get_authenticated_user_details(request_headers)
    assert user_details["user_principal_id"] == "test-id"
    assert user_details["user_name"] == "test-name"
    assert user_details["auth_provider"] == "test-idp"
    assert user_details["auth_token"] == "test-token"
    assert user_details["client_principal_b64"] == "test-b64"


def test_get_tenantid_valid_b64():
    user_info = {"tid": "test-tenant-id"}
    client_principal_b64 = base64.b64encode(
        json.dumps(user_info).encode("utf-8")
    ).decode("utf-8")
    tenant_id = get_tenantid(client_principal_b64)
    assert tenant_id == "test-tenant-id"


def test_get_tenantid_invalid_b64():
    client_principal_b64 = "invalid-b64"
    with patch("backend.auth.auth_utils.logging") as mock_logging:
        tenant_id = get_tenantid(client_principal_b64)
        assert tenant_id == ""
        mock_logging.exception.assert_called_once()


def test_get_tenantid_no_tid():
    user_info = {"some_other_key": "value"}
    client_principal_b64 = base64.b64encode(
        json.dumps(user_info).encode("utf-8")
    ).decode("utf-8")
    tenant_id = get_tenantid(client_principal_b64)
    assert tenant_id is None
