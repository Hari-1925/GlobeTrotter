from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas
from database import get_db

router = APIRouter(prefix="/search", tags=["Search & Discovery"])

@router.get("/cities", response_model=List[schemas.CityResponse])
def search_cities(
    query: Optional[str] = None,
    country: Optional[str] = None,
    min_popularity: Optional[float] = None,
    max_cost_index: Optional[float] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(models.City)
    
    if query:
        base_query = base_query.filter(models.City.name.ilike(f"%{query}%"))
    if country:
        base_query = base_query.filter(models.City.country.ilike(f"%{country}%"))
    if min_popularity is not None:
        base_query = base_query.filter(models.City.popularity_score >= min_popularity)
    if max_cost_index is not None:
        base_query = base_query.filter(models.City.cost_index <= max_cost_index)
        
    return base_query.limit(50).all()

@router.get("/activities", response_model=List[schemas.ActivityResponse])
def search_activities(
    city_id: str,
    type: Optional[str] = None,
    max_cost: Optional[float] = None,
    db: Session = Depends(get_db)
):
    base_query = db.query(models.Activity).filter(models.Activity.city_id == city_id)
    
    if type:
        base_query = base_query.filter(models.Activity.type.ilike(f"%{type}%"))
    if max_cost is not None:
        base_query = base_query.filter(models.Activity.default_cost <= max_cost)
        
    return base_query.all()
