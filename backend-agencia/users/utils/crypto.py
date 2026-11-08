import base64
import hashlib
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

PREFIX = "enc::"


def _get_fernet() -> Fernet:
    secret = getattr(settings, "FIELD_ENCRYPTION_SECRET", settings.SECRET_KEY)
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def is_encrypted_text(value: str) -> bool:
    if not isinstance(value, str):
        return False
    return value.startswith(PREFIX) or value.startswith("gAAAAAB")


def encrypt_text(value: str) -> str:
    if not value or is_encrypted_text(value):
        return value
    token = _get_fernet().encrypt(value.encode("utf-8")).decode("utf-8")
    return f"{PREFIX}{token}"


def decrypt_text(value: str) -> str:
    if not value:
        return value
    raw = value[len(PREFIX):] if value.startswith(PREFIX) else value
    try:
        return _get_fernet().decrypt(raw.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return value

