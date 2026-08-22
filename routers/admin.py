from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
import models
from database import get_db

router = APIRouter(prefix="/admin", tags=["Admin & Analytics"])

# In a real app, you would add an admin dependency to restrict access
# def verify_admin(current_user: models.User = Depends(get_current_user)):
#    if current_user.role != "admin": raise HTTPException(...)

@router.get("/analytics")
def get_platform_analytics(db: Session = Depends(get_db)):
    total_users = db.query(models.User).count()
    total_trips = db.query(models.Trip).count()
    total_stops = db.query(models.Stop).count()
    total_activities_scheduled = db.query(models.ItineraryItem).count()
    
    return {
        "total_users": total_users,
        "total_trips": total_trips,
        "total_stops": total_stops,
        "total_activities_scheduled": total_activities_scheduled,
        "average_trips_per_user": total_trips / total_users if total_users > 0 else 0
    }

@router.get("/destinations/popular")
def get_popular_destinations(db: Session = Depends(get_db)):
    # Group by city_id, count stops
    popular = db.query(
        models.Stop.city_id,
        models.City.name,
        models.City.country,
        func.count(models.Stop.id).label("visit_count")
    ).join(models.City, models.Stop.city_id == models.City.id) \
     .group_by(models.Stop.city_id, models.City.name, models.City.country) \
     .order_by(func.count(models.Stop.id).desc()) \
     .limit(10).all()
     
    result = []
    for city_id, name, country, count in popular:
        result.append({
            "city_id": city_id,
            "name": name,
            "country": country,
            "visit_count": count
        })
        
    return result
