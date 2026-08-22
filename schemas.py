from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import date, datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    profile_photo_url: Optional[str] = None
    language: Optional[str] = None

class UserResponse(UserBase):
    id: str
    profile_photo_url: Optional[str] = None
    language: str
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# City & Activity Schemas
class CityResponse(BaseModel):
    id: str
    name: str
    country: str
    region: Optional[str]
    popularity_score: float
    cost_index: float

    class Config:
        from_attributes = True

class ActivityResponse(BaseModel):
    id: str
    city_id: str
    name: str
    type: str
    description: Optional[str]
    default_cost: float
    duration_minutes: int

    class Config:
        from_attributes = True

# Itinerary Item Schemas
class ItineraryItemBase(BaseModel):
    activity_id: Optional[str] = None
    custom_name: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    custom_cost: Optional[float] = None

class ItineraryItemCreate(ItineraryItemBase):
    stop_id: str

class ItineraryItemResponse(ItineraryItemBase):
    id: str
    stop_id: str
    order_index: int
    activity: Optional[ActivityResponse] = None

    class Config:
        from_attributes = True

class ReorderItem(BaseModel):
    item_id: str
    order_index: int

class ReorderRequest(BaseModel):
    order_list: List[ReorderItem]

# Stop Schemas
class StopBase(BaseModel):
    city_id: str
    arrival_date: date
    departure_date: date

class StopCreate(StopBase):
    pass

class StopResponse(StopBase):
    id: str
    trip_id: str
    order_index: int
    city: CityResponse
    itinerary_items: List[ItineraryItemResponse] = []

    class Config:
        from_attributes = True

# Trip Schemas
class TripBase(BaseModel):
    title: str
    start_date: date
    end_date: date
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None

class TripCreate(TripBase):
    pass

class TripUpdate(BaseModel):
    title: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None
    cover_photo_url: Optional[str] = None

class TripResponse(TripBase):
    id: str
    user_id: str
    share_token: Optional[str]
    stops: List[StopResponse] = []

    class Config:
        from_attributes = True

class TripSummaryResponse(TripBase):
    id: str
    user_id: str
    stop_count: int

# Budget Schemas
class BudgetCategory(BaseModel):
    transport: float = 0.0
    stay: float = 0.0
    activities: float = 0.0
    meals: float = 0.0

class BudgetResponse(BaseModel):
    trip_id: str
    total_budget: float
    breakdown: BudgetCategory
    
class DailyCost(BaseModel):
    date: date
    total_cost: float
    is_overbudget: bool

class DailyBudgetResponse(BaseModel):
    trip_id: str
    daily_costs: List[DailyCost]
