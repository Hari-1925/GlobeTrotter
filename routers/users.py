from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/users", tags=["User Management"])

@router.put("/me", response_model=schemas.UserResponse)
def update_profile(user_update: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if user_update.name is not None:
        current_user.name = user_update.name
    if user_update.profile_photo_url is not None:
        current_user.profile_photo_url = user_update.profile_photo_url
    if user_update.language is not None:
        current_user.language = user_update.language
        
    db.commit()
    db.refresh(current_user)
    return current_user

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db.delete(current_user)
    db.commit()
    return None
