from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/itinerary", tags=["Itinerary Items"])

@router.post("/stops/{stop_id}/activities", response_model=schemas.ItineraryItemResponse, status_code=status.HTTP_201_CREATED)
def assign_activity_to_stop(stop_id: str, item_data: schemas.ItineraryItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Verify stop belongs to user
    stop = db.query(models.Stop).join(models.Trip).filter(models.Stop.id == stop_id, models.Trip.user_id == current_user.id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    next_order_index = len(stop.itinerary_items)
    
    new_item = models.ItineraryItem(
        stop_id=stop_id,
        activity_id=item_data.activity_id,
        custom_name=item_data.custom_name,
        scheduled_time=item_data.scheduled_time,
        custom_cost=item_data.custom_cost,
        order_index=next_order_index
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item

@router.put("/stops/{stop_id}/activities/reorder", response_model=List[schemas.ItineraryItemResponse])
def reorder_activities(stop_id: str, order_data: schemas.ReorderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stop = db.query(models.Stop).join(models.Trip).filter(models.Stop.id == stop_id, models.Trip.user_id == current_user.id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    for req_item in order_data.order_list:
        item = db.query(models.ItineraryItem).filter(models.ItineraryItem.id == req_item.item_id, models.ItineraryItem.stop_id == stop_id).first()
        if item:
            item.order_index = req_item.order_index
            
    db.commit()
    items = db.query(models.ItineraryItem).filter(models.ItineraryItem.stop_id == stop_id).order_by(models.ItineraryItem.order_index).all()
    return items

@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_itinerary_item(item_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.ItineraryItem).join(models.Stop).join(models.Trip).filter(
        models.ItineraryItem.id == item_id, 
        models.Trip.user_id == current_user.id
    ).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Itinerary item not found")
        
    db.delete(item)
    db.commit()
    return None
