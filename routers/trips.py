from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
import models, schemas
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/trips", tags=["Trip Management"])

@router.post("", response_model=schemas.TripResponse, status_code=status.HTTP_201_CREATED)
def create_trip(trip: schemas.TripCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    new_trip = models.Trip(
        user_id=current_user.id,
        title=trip.title,
        start_date=trip.start_date,
        end_date=trip.end_date,
        description=trip.description,
        cover_photo_url=trip.cover_photo_url
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)
    return new_trip

@router.get("", response_model=List[schemas.TripSummaryResponse])
def get_trips_by_user(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trips = db.query(models.Trip).filter(models.Trip.user_id == current_user.id).all()
    # Build summary
    summary = []
    for trip in trips:
        summary.append({
            "id": trip.id,
            "user_id": trip.user_id,
            "title": trip.title,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "description": trip.description,
            "cover_photo_url": trip.cover_photo_url,
            "stop_count": len(trip.stops)
        })
    return summary

@router.put("/{trip_id}", response_model=schemas.TripResponse)
def update_trip(trip_id: str, trip_data: schemas.TripUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    update_data = trip_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(trip, key, value)
        
    db.commit()
    db.refresh(trip)
    return trip

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trip(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    
    db.delete(trip)
    db.commit()
    return None

@router.post("/{trip_id}/stops", response_model=schemas.StopResponse, status_code=status.HTTP_201_CREATED)
def add_stop(trip_id: str, stop_data: schemas.StopCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    # Get current max order index
    current_stops = trip.stops
    next_order_index = len(current_stops)
    
    new_stop = models.Stop(
        trip_id=trip_id,
        city_id=stop_data.city_id,
        arrival_date=stop_data.arrival_date,
        departure_date=stop_data.departure_date,
        order_index=next_order_index
    )
    db.add(new_stop)
    db.commit()
    db.refresh(new_stop)
    return new_stop

@router.put("/{trip_id}/stops/reorder", response_model=List[schemas.StopResponse])
def reorder_stops(trip_id: str, order_data: schemas.ReorderRequest, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    for item in order_data.order_list:
        stop = db.query(models.Stop).filter(models.Stop.id == item.item_id, models.Stop.trip_id == trip_id).first()
        if stop:
            stop.order_index = item.order_index
            
    db.commit()
    db.refresh(trip)
    # Return stops sorted by new order
    stops = db.query(models.Stop).filter(models.Stop.trip_id == trip_id).order_by(models.Stop.order_index).all()
    return stops

@router.delete("/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_stop(stop_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    stop = db.query(models.Stop).join(models.Trip).filter(models.Stop.id == stop_id, models.Trip.user_id == current_user.id).first()
    if not stop:
        raise HTTPException(status_code=404, detail="Stop not found")
        
    db.delete(stop)
    db.commit()
    return None
