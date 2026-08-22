from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/shared", tags=["Sharing & Public View"])

@router.post("/trips/{trip_id}/share", response_model=schemas.TripResponse)
def generate_public_itinerary_link(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    if not trip.share_token:
        trip.share_token = str(uuid.uuid4())
        db.commit()
        db.refresh(trip)
        
    return trip

@router.get("/{share_token}", response_model=schemas.TripResponse)
def get_public_itinerary(share_token: str, db: Session = Depends(get_db)):
    trip = db.query(models.Trip).filter(models.Trip.share_token == share_token).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Public itinerary not found")
        
    return trip

@router.post("/{share_token}/copy", response_model=schemas.TripResponse, status_code=status.HTTP_201_CREATED)
def copy_public_itinerary(share_token: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    source_trip = db.query(models.Trip).filter(models.Trip.share_token == share_token).first()
    if not source_trip:
        raise HTTPException(status_code=404, detail="Public itinerary not found")
        
    # Clone trip
    new_trip = models.Trip(
        user_id=current_user.id,
        title=f"Copy of {source_trip.title}",
        start_date=source_trip.start_date,
        end_date=source_trip.end_date,
        description=source_trip.description,
        cover_photo_url=source_trip.cover_photo_url
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    
    # Clone stops and itinerary items
    for stop in source_trip.stops:
        new_stop = models.Stop(
            trip_id=new_trip.id,
            city_id=stop.city_id,
            arrival_date=stop.arrival_date,
            departure_date=stop.departure_date,
            order_index=stop.order_index
        )
        db.add(new_stop)
        db.commit()
        db.refresh(new_stop)
        
        for item in stop.itinerary_items:
            new_item = models.ItineraryItem(
                stop_id=new_stop.id,
                activity_id=item.activity_id,
                custom_name=item.custom_name,
                scheduled_time=item.scheduled_time,
                custom_cost=item.custom_cost,
                order_index=item.order_index
            )
            db.add(new_item)
            
    db.commit()
    db.refresh(new_trip)
    return new_trip
