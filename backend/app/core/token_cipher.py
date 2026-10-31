"""Authenticated encryption for GitHub tokens using only the stdlib.

Encrypt-then-MAC: BLAKE2b in counter mode for confidentiality, HMAC-SHA256
for integrity. Both keys are derived from SECRET_KEY with scrypt.
"""
import base64
import hashlib
import hmac
import os

from app.config import settings

_SALT = b"exit-capsule-token-v1"
_NONCE_SIZE = 16
_TAG_SIZE = 32


def _keys() -> tuple[bytes, bytes]:
    digest = hashlib.scrypt(
        settings.SECRET_KEY.encode("utf-8"),
        salt=_SALT,
        n=2 ** 14,
        r=8,
        p=1,
        dklen=64,
    )
    return digest[:32], digest[32:]


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out = bytearray()
    counter = 0
    while len(out) < length:
        out.extend(hashlib.blake2b(nonce + counter.to_bytes(8, "big"), key=key, digest_size=64).digest())
        counter += 1
    return bytes(out[:length])


def encrypt_token(plaintext: str) -> str:
    if not plaintext:
        return ""
    enc_key, mac_key = _keys()
    nonce = os.urandom(_NONCE_SIZE)
    raw = plaintext.encode("utf-8")
    ciphertext = bytes(a ^ b for a, b in zip(raw, _keystream(enc_key, nonce, len(raw))))
    tag = hmac.new(mac_key, nonce + ciphertext, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(nonce + ciphertext + tag).decode("ascii")


def decrypt_token(stored: str) -> str:
    if not stored:
        return ""
    try:
        blob = base64.urlsafe_b64decode(stored.encode("ascii"))
    except Exception as exc:
        raise ValueError("Stored token is not valid ciphertext") from exc
    if len(blob) < _NONCE_SIZE + _TAG_SIZE:
        raise ValueError("Stored token is truncated")
    nonce, ciphertext, tag = blob[:_NONCE_SIZE], blob[_NONCE_SIZE:-_TAG_SIZE], blob[-_TAG_SIZE:]
    enc_key, mac_key = _keys()
    expected = hmac.new(mac_key, nonce + ciphertext, hashlib.sha256).digest()
    if not hmac.compare_digest(tag, expected):
        raise ValueError("Stored token failed integrity check")
    raw = bytes(a ^ b for a, b in zip(ciphertext, _keystream(enc_key, nonce, len(ciphertext))))
    return raw.decode("utf-8")
