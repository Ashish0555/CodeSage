from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.database import get_db
from app.models.models import User

password_hash = PasswordHash.recommended()
bearer = HTTPBearer(auto_error=False)


def hash_password(value): return password_hash.hash(value)
def verify_password(value, hashed): return password_hash.verify(value, hashed)

def create_token(user_id):
    settings = get_settings(); expires = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expires_minutes)
    return jwt.encode({'sub': str(user_id), 'exp': expires}, settings.jwt_secret, algorithm='HS256')

def current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    if not credentials: raise HTTPException(401, 'Missing or malformed Authorization header')
    try: payload = jwt.decode(credentials.credentials, get_settings().jwt_secret, algorithms=['HS256']); user_id = payload.get('sub')
    except (JWTError, ValueError): raise HTTPException(401, 'Invalid or expired token')
    user = db.get(User, str(user_id))
    if not user: raise HTTPException(401, 'User no longer exists')
    return user

def admin_user(user: User = Depends(current_user)):
    if user.role.value != 'admin': raise HTTPException(403, 'Requires admin role')
    return user

def safe_user(user):
    return {'id': user.id, '_id': user.id, 'name': user.name, 'email': user.email, 'role': user.role.value, 'stats': user.stats or {}}
