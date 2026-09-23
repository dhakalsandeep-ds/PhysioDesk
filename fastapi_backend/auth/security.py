from datetime import datetime, timedelta, timezone 
import jwt 
from config import settings
import bcrypt
import secrets

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        plain_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        return False

def create_tokens(email: str, current_version: int) -> dict:
    now = datetime.now(timezone.utc)

    access_expiry = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_payload = {"sub": email, "type": "access", "version": current_version, "exp": access_expiry}
    access_token = jwt.encode(access_payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

    refresh_expiry = now + timedelta(days=7)
    refresh_jti = secrets.token_hex(16)
    refresh_payload = {"sub": email, "type": "refresh", "jti": refresh_jti, "version": current_version, "exp": refresh_expiry}
    refresh_token = jwt.encode(refresh_payload, settings.JWT_SECRET_KEY, algorithm=settings.ALGORITHM)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token
    }

def decode_token_raw(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.PyJWTError:
        return None

