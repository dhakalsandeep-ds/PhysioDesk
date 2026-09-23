from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer 
from sqlmodel import Session 
from database import get_session
from auth.models import User
from auth.request_validations import UserLoginRequest  
from pydantic import ValidationError
from auth.security import decode_token_raw

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Session invalid, revoked, or expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token_raw(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception
        
    email = payload.get("sub")
    token_version = payload.get("version")
    
    user = session.query(User).filter(User.email == email).first()
    if not user:
        raise credentials_exception
        
    if user.token_version != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This token session has been globally revoked by a user logout action."
        )
        
    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin permission required")
    return current_user

async def extract_login_credentials(request: Request) -> UserLoginRequest:
    content_type = request.headers.get("content-type", "")
    raw_data = {}

    request.state.is_swagger_oauth2 = False

    if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
        form = await request.form()
        raw_data["email"] = form.get("username") or form.get("email")
        raw_data["password"] = form.get("password")
        
        if "grant_type" in form:
            request.state.is_swagger_oauth2 = True
    else:
        try:
            body = await request.json()
            raw_data["email"] = body.get("email") or body.get("username")
            raw_data["password"] = body.get("password")
        except Exception:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid JSON or Form payload.")

    try:
        return UserLoginRequest(email=raw_data.get("email"), password=raw_data.get("password"))
    except ValidationError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=exc.errors())

