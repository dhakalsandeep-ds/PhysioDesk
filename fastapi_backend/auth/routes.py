from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlmodel import Session, select
from database import get_session

from unified_response import SuccessResponse

from auth.models import User, RefreshTokenBlock

from auth.request_validations import UserCreateRequest, UserLoginRequest, RefreshTokenRequest

from auth.responses import UserDataResponse, TokenDataResponse, UserProfileResponse

from auth.security import hash_password, verify_password, create_tokens, decode_token_raw
from auth.dependencies import require_admin, extract_login_credentials, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication Layer"])


@router.post("/signup", response_model=SuccessResponse[UserDataResponse])
def create_user(
    payload: UserCreateRequest, 
    session: Session = Depends(get_session), 
    current_admin: User = Depends(require_admin)
):
    existing = session.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This email is already registered.")

    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role
    )
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    
    return SuccessResponse(
        message="New staff account provisioned successfully.",
        data=UserDataResponse(id=new_user.id, email=new_user.email, role=new_user.role)
    )


@router.post("/login", 
    openapi_extra={
        "requestBody": {
            "content": {
                "application/json": {
                    "schema": {
                        "type": "object",
                        "properties": {
                            "email": {"type": "string", "format": "email", "example": "admin@physiodesk.com"},
                            "password": {"type": "string", "format": "password", "example": "admin123"}
                        },
                        "required": ["email", "password"]
                    }
                }
            }
        }
    }
)
def login(
    request: Request, 
    payload: UserLoginRequest = Depends(extract_login_credentials),
    session: Session = Depends(get_session)
):
    user = session.query(User).filter(User.email == payload.email).first()
    
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password combination.")
        
    tokens = create_tokens(user.email, user.token_version)
    
    if getattr(request.state, "is_swagger_oauth2", False):
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "token_type": "bearer"
        }
        
    return SuccessResponse(
        message="Authentication successful.",
        data=TokenDataResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"]
        )
    )


@router.post("/refresh", response_model=SuccessResponse[TokenDataResponse])
def refresh_token(payload: RefreshTokenRequest, session: Session = Depends(get_session)):
    raw_payload = decode_token_raw(payload.refresh_token)
    if not raw_payload or raw_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
        
    email = raw_payload.get("sub")
    token_jti = raw_payload.get("jti")
    token_version = raw_payload.get("version")
    expiry = raw_payload.get("exp")

    user = session.query(User).filter(User.email == email).first()
    if not user or user.token_version != token_version:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked globally.")
        
    is_blocked = session.exec(select(RefreshTokenBlock).where(RefreshTokenBlock.token_jti == token_jti)).first()
    if is_blocked:
        user.token_version += 1  
        session.add(user)
        session.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Security breach detected: This refresh token has already been consumed. Logged out everywhere."
        )
        
    session.add(RefreshTokenBlock(token_jti=token_jti, expires_at=expiry))

    new_tokens = create_tokens(user.email, user.token_version)
    session.commit()

    return SuccessResponse(
        message="Session tokens rotated successfully.",
        data=TokenDataResponse(access_token=new_tokens["access_token"], refresh_token=new_tokens["refresh_token"])
    )


@router.post("/logout-all", response_model=SuccessResponse[dict])
def logout_everywhere(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    current_user.token_version += 1
    session.add(current_user)
    session.commit()
    
    return SuccessResponse(
        message="Logged out from all active device sessions successfully.",
        data={"revoked_user": current_user.email}
    )


@router.get("/me", response_model=SuccessResponse[UserProfileResponse])
def get_current_user_info(current_user: User = Depends(get_current_user)):
    display_name = current_user.full_name or current_user.email.split("@")[0].title()
    
    return SuccessResponse(
        message="Current user profile retrieved successfully.",
        data=UserProfileResponse(
            id=current_user.id,
            email=current_user.email,
            full_name=display_name,
            role=current_user.role,
        ),
    )

