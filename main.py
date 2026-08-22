from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models
from database import engine

# Import routers
from routers import auth, users, trips, search, itinerary, budget, sharing, admin

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="GlobeTrotter API", description="Backend for the GlobeTrotter travel application", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(trips.router)
app.include_router(search.router)
app.include_router(itinerary.router)
app.include_router(budget.router)
app.include_router(sharing.router)
app.include_router(admin.router)

# Serve static files
app.mount("/", StaticFiles(directory="static", html=True), name="static")
