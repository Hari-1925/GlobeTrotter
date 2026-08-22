from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    profile_photo_url = Column(String, nullable=True)
    language = Column(String, default="en")
    
    trips = relationship("Trip", back_populates="owner", cascade="all, delete-orphan")

class Trip(Base):
    __tablename__ = "trips"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    description = Column(String, nullable=True)
    cover_photo_url = Column(String, nullable=True)
    share_token = Column(String, unique=True, index=True, nullable=True) # For public sharing
    
    owner = relationship("User", back_populates="trips")
    stops = relationship("Stop", back_populates="trip", cascade="all, delete-orphan", order_by="Stop.order_index")
    collaborators = relationship("TripCollaborator", back_populates="trip", cascade="all, delete-orphan")

class TripCollaborator(Base):
    __tablename__ = "trip_collaborators"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="viewer") # 'editor' or 'viewer'
    
    trip = relationship("Trip", back_populates="collaborators")
    user = relationship("User")

class City(Base):
    __tablename__ = "cities"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    name = Column(String, nullable=False, index=True)
    country = Column(String, nullable=False)
    region = Column(String, nullable=True)
    popularity_score = Column(Float, default=0.0)
    cost_index = Column(Float, default=1.0) # 1.0 is average

class Stop(Base):
    __tablename__ = "stops"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    trip_id = Column(String, ForeignKey("trips.id"), nullable=False)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False)
    arrival_date = Column(Date, nullable=False)
    departure_date = Column(Date, nullable=False)
    order_index = Column(Integer, nullable=False)
    
    trip = relationship("Trip", back_populates="stops")
    city = relationship("City")
    itinerary_items = relationship("ItineraryItem", back_populates="stop", cascade="all, delete-orphan", order_by="ItineraryItem.order_index")

class Activity(Base):
    __tablename__ = "activities"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    city_id = Column(String, ForeignKey("cities.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False) # e.g., food, sightseeing
    description = Column(String, nullable=True)
    default_cost = Column(Float, default=0.0)
    duration_minutes = Column(Integer, default=60)
    
    city = relationship("City")

class ItineraryItem(Base):
    __tablename__ = "itinerary_items"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    stop_id = Column(String, ForeignKey("stops.id"), nullable=False)
    activity_id = Column(String, ForeignKey("activities.id"), nullable=True)
    custom_name = Column(String, nullable=True) # Used if activity_id is null
    scheduled_time = Column(DateTime, nullable=True)
    custom_cost = Column(Float, nullable=True) # Overrides activity default_cost
    order_index = Column(Integer, nullable=False, default=0)
    
    stop = relationship("Stop", back_populates="itinerary_items")
    activity = relationship("Activity")
