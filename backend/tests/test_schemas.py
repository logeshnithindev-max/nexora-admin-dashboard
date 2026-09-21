from datetime import date

import pytest
from pydantic import ValidationError

from app.utils.naming import names_for, slug
from app.schemas.workspace_schema import WorkspaceRequest


def request(**overrides):
    data = {
        "client": {"client_id": "acme-123", "name": "Acme"},
        "project": {"project_id": "store-123", "name": "Store", "origins": ["https://acme.test"]},
        "subscription": {"plan_id": 1, "status": "active", "start_date": date.today().isoformat()},
    }
    data.update(overrides)
    return WorkspaceRequest.model_validate(data)


def test_names_are_stable_when_ids_are_supplied():
    names = names_for(request())
    assert names.mysql == "nexora_acme_123_store_123"
    assert names.clickhouse == names.mysql
    assert names.project_key.startswith("acme-123-store-123-key-")


def test_generated_ids_are_based_on_client_and_project_names():
    payload = request(
        client={"name": "Acme Commerce"},
        project={"name": "Mobile Store", "origins": []},
    )
    names = names_for(payload)
    assert names.client_id.startswith("acme-commerce-")
    assert names.project_id.startswith("acme-commerce-mobile-store-")
    assert names.project_key.startswith(f"{names.client_id}-{names.project_id}-key-")
    assert len(names.client_id) <= 50
    assert len(names.project_id) <= 50
    assert len(names.project_key) <= 255


def test_slug_cannot_create_an_identifier_escape():
    assert slug("A` ; DROP DATABASE prod") == "a_drop_database_prod"


def test_invalid_origin_is_rejected():
    with pytest.raises(ValidationError):
        request(project={"name": "Store", "origins": ["javascript:alert(1)"]})


def test_trial_requires_an_end_date():
    with pytest.raises(ValidationError):
        request(subscription={"plan_id": 1, "status": "trial", "start_date": "2026-08-18"})


def test_optional_tenant_user_is_normalized_and_validated():
    payload = request(user={
        "name": "Acme Admin", "email": " ADMIN@ACME.TEST ",
        "password": "ChangeMe@2026", "mobile": "+966500000000",
        "timezone": "Asia/Riyadh",
    })
    assert payload.user.email == "admin@acme.test"
    assert payload.user.password == "ChangeMe@2026"

    with pytest.raises(ValidationError):
        request(user={"name": "Acme Admin", "email": "not-an-email", "password": "short"})

    without_password = request(user={"name": "Acme Admin", "email": "admin@acme.test"})
    assert without_password.user.password is None


def test_send_mail_requires_user_details():
    with pytest.raises(ValidationError):
        request(send_mail=True)

    payload = request(
        send_mail=True,
        user={"name": "Acme Admin", "email": "admin@acme.test", "password": "ChangeMe@2026"},
    )
    assert payload.send_mail is True
