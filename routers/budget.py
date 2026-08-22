from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
import models, schemas
from database import get_db
from routers.auth import get_current_user
from typing import Dict, List

router = APIRouter(prefix="/budget", tags=["Budget Calculation"])

@router.get("/trips/{trip_id}", response_model=schemas.BudgetResponse)
def calculate_trip_budget(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    transport_cost = 0.0
    stay_cost = 0.0
    activities_cost = 0.0
    meals_cost = 0.0
    
    # Calculate costs based on stops and activities
    for stop in trip.stops:
        # A simple estimation based on city cost index
        days_in_city = (stop.departure_date - stop.arrival_date).days or 1
        city_index = stop.city.cost_index if stop.city else 1.0
        
        stay_cost += 100 * days_in_city * city_index
        meals_cost += 50 * days_in_city * city_index
        transport_cost += 30 * city_index # Assuming some local transport per stop
        
        for item in stop.itinerary_items:
            if item.custom_cost is not None:
                activities_cost += item.custom_cost
            elif item.activity:
                activities_cost += item.activity.default_cost
                
    total = transport_cost + stay_cost + activities_cost + meals_cost
    
    return {
        "trip_id": trip_id,
        "total_budget": total,
        "breakdown": {
            "transport": transport_cost,
            "stay": stay_cost,
            "activities": activities_cost,
            "meals": meals_cost
        }
    }

@router.get("/trips/{trip_id}/daily", response_model=schemas.DailyBudgetResponse)
def get_daily_cost_averages(trip_id: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    trip = db.query(models.Trip).filter(models.Trip.id == trip_id, models.Trip.user_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
        
    daily_costs_map: Dict[str, float] = {}
    
    for stop in trip.stops:
        days = (stop.departure_date - stop.arrival_date).days or 1
        city_index = stop.city.cost_index if stop.city else 1.0
        daily_base = (100 + 50 + 10) * city_index # stay + meals + transport
        
        current_date = stop.arrival_date
        for i in range(days):
            date_str = (current_date + timedelta(days=i)).isoformat()
            if date_str not in daily_costs_map:
                daily_costs_map[date_str] = 0.0
            daily_costs_map[date_str] += daily_base
            
        for item in stop.itinerary_items:
            if item.scheduled_time:
                date_str = item.scheduled_time.date().isoformat()
                cost = item.custom_cost if item.custom_cost is not None else (item.activity.default_cost if item.activity else 0)
                if date_str not in daily_costs_map:
                    daily_costs_map[date_str] = 0.0
                daily_costs_map[date_str] += cost
                
    DAILY_BUDGET_THRESHOLD = 300.0 # Alert threshold
    
    result = []
    for date_str, cost in sorted(daily_costs_map.items()):
        result.append({
            "date": date_str,
            "total_cost": cost,
            "is_overbudget": cost > DAILY_BUDGET_THRESHOLD
        })
        
    return {
        "trip_id": trip_id,
        "daily_costs": result
    }
