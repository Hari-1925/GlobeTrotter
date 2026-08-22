from fastapi import APIRouter, HTTPException
import httpx
from typing import Dict, Any

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("/{city_name}", response_model=Dict[str, Any])
async def get_city_weather(city_name: str):
    """
    Fetches the current weather for a given city using the free Open-Meteo API.
    """
    async with httpx.AsyncClient() as client:
        # Step 1: Geocoding to get latitude and longitude
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city_name}&count=1&language=en&format=json"
        try:
            geo_response = await client.get(geocode_url)
            geo_response.raise_for_status()
            geo_data = geo_response.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to geocode city: {str(e)}")
            
        if not geo_data.get("results"):
            raise HTTPException(status_code=404, detail=f"City '{city_name}' not found in weather database")
            
        location = geo_data["results"][0]
        lat = location["latitude"]
        lon = location["longitude"]
        
        # Step 2: Fetch weather forecast
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&timezone=auto"
        try:
            weather_response = await client.get(weather_url)
            weather_response.raise_for_status()
            weather_data = weather_response.json()
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch weather: {str(e)}")
            
        current = weather_data.get("current_weather", {})
        
        # WMO Weather interpretation codes (simplified)
        code = current.get("weathercode", 0)
        condition = "Clear"
        icon = "☀️"
        
        if code in [1, 2, 3]:
            condition = "Partly Cloudy"
            icon = "⛅"
        elif code in [45, 48]:
            condition = "Fog"
            icon = "🌫️"
        elif code in [51, 53, 55, 56, 57]:
            condition = "Drizzle"
            icon = "🌧️"
        elif code in [61, 63, 65, 66, 67]:
            condition = "Rain"
            icon = "🌧️"
        elif code in [71, 73, 75, 77]:
            condition = "Snow"
            icon = "❄️"
        elif code in [80, 81, 82]:
            condition = "Showers"
            icon = "🌦️"
        elif code in [95, 96, 99]:
            condition = "Thunderstorm"
            icon = "⛈️"
            
        return {
            "city": city_name,
            "temperature": current.get("temperature"),
            "condition": condition,
            "icon": icon,
            "windspeed": current.get("windspeed"),
            "is_day": current.get("is_day")
        }
