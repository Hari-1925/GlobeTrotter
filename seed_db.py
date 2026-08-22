import sys
import os
from sqlalchemy.orm import Session
from database import engine, SessionLocal, Base
import models

# Add current path to sys.path just in case
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

def seed():
    print("Creating all tables in the database...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Check if already seeded
        city_count = db.query(models.City).count()
        if city_count > 0:
            print(f"Database already contains {city_count} cities. Skipping seeding.")
            return

        print("Seeding cities and activities...")
        
        # 10 popular cities
        cities_data = [
            {"name": "Tokyo", "country": "Japan", "region": "Asia", "popularity_score": 9.8, "cost_index": 1.2},
            {"name": "Paris", "country": "France", "region": "Europe", "popularity_score": 9.7, "cost_index": 1.4},
            {"name": "New York", "country": "United States", "region": "North America", "popularity_score": 9.6, "cost_index": 1.5},
            {"name": "London", "country": "United Kingdom", "region": "Europe", "popularity_score": 9.5, "cost_index": 1.3},
            {"name": "Rome", "country": "Italy", "region": "Europe", "popularity_score": 9.4, "cost_index": 1.1},
            {"name": "Sydney", "country": "Australia", "region": "Oceania", "popularity_score": 8.9, "cost_index": 1.2},
            {"name": "Cape Town", "country": "South Africa", "region": "Africa", "popularity_score": 8.5, "cost_index": 0.8},
            {"name": "Cairo", "country": "Egypt", "region": "Africa", "popularity_score": 8.2, "cost_index": 0.5},
            {"name": "Bangkok", "country": "Thailand", "region": "Asia", "popularity_score": 9.1, "cost_index": 0.6},
            {"name": "Rio de Janeiro", "country": "Brazil", "region": "South America", "popularity_score": 8.7, "cost_index": 0.7}
        ]
        
        cities = []
        for city_item in cities_data:
            city = models.City(
                name=city_item["name"],
                country=city_item["country"],
                region=city_item["region"],
                popularity_score=city_item["popularity_score"],
                cost_index=city_item["cost_index"]
            )
            db.add(city)
            cities.append(city)
        
        # Commit to generate IDs
        db.commit()
        for c in cities:
            db.refresh(c)
            
        # Map cities to their models for activities seeding
        cities_map = {c.name: c for c in cities}
        
        activities_data = {
            "Tokyo": [
                {"name": "Sushi Making Masterclass", "type": "Food", "description": "Learn the art of authentic sushi preparation from a master chef.", "default_cost": 85.0, "duration_minutes": 120},
                {"name": "Senso-ji Temple Tour", "type": "Sightseeing", "description": "Explore Tokyo's oldest and most iconic Buddhist temple in Asakusa.", "default_cost": 15.0, "duration_minutes": 90},
                {"name": "Shibuya Crossing Photo Walk", "type": "Sightseeing", "description": "Take pictures at the world's busiest pedestrian intersection and explore Shibuya.", "default_cost": 0.0, "duration_minutes": 60},
                {"name": "Sumo Wrestling Practice Viewing", "type": "Culture", "description": "Get a rare look at professional sumo wrestlers training in their stable.", "default_cost": 55.0, "duration_minutes": 120},
                {"name": "Akihabara Gaming & Anime Tour", "type": "Adventure", "description": "Immerse yourself in Tokyo's electronics and otaku culture capital.", "default_cost": 25.0, "duration_minutes": 150}
            ],
            "Paris": [
                {"name": "Louvre Museum Guided Tour", "type": "Sightseeing", "description": "Skip the line and view the Mona Lisa, Venus de Milo, and other masterpieces.", "default_cost": 45.0, "duration_minutes": 180},
                {"name": "Eiffel Tower Summit Access", "type": "Sightseeing", "description": "Ascend to the very top of the Eiffel Tower for panoramic views of Paris.", "default_cost": 32.0, "duration_minutes": 120},
                {"name": "Seine River Dinner Cruise", "type": "Food", "description": "Enjoy a gourmet 3-course meal on a glass-topped boat cruising down the Seine.", "default_cost": 95.0, "duration_minutes": 150},
                {"name": "Croissant Baking Workshop", "type": "Food", "description": "Learn the secrets of making light, flaky, buttery French croissants.", "default_cost": 65.0, "duration_minutes": 120},
                {"name": "Montmartre Walking Tour", "type": "Sightseeing", "description": "Walk the historic cobblestone streets of Paris's artistic district.", "default_cost": 10.0, "duration_minutes": 90}
            ],
            "New York": [
                {"name": "Empire State Building Observatory", "type": "Sightseeing", "description": "View New York City from the famous 86th-floor open-air observatory.", "default_cost": 45.0, "duration_minutes": 90},
                {"name": "Broadway Show Ticket", "type": "Entertainment", "description": "Experience a world-class musical or play in the heart of the theater district.", "default_cost": 125.0, "duration_minutes": 150},
                {"name": "Central Park Bicycle Tour", "type": "Adventure", "description": "Ride around Central Park, seeing Bethesda Fountain, Strawberry Fields, and more.", "default_cost": 30.0, "duration_minutes": 120},
                {"name": "Metropolitan Museum of Art Tour", "type": "Sightseeing", "description": "Explore over 5,000 years of art from around the globe at The Met.", "default_cost": 28.0, "duration_minutes": 180},
                {"name": "Statue of Liberty & Ellis Island Ferry", "type": "Sightseeing", "description": "Ferry ride to Liberty Island and the Ellis Island National Museum of Immigration.", "default_cost": 35.0, "duration_minutes": 180}
            ],
            "London": [
                {"name": "Tower of London & Crown Jewels Tour", "type": "Sightseeing", "description": "Discover London's castle, fortress, and infamous prison housing the Crown Jewels.", "default_cost": 38.0, "duration_minutes": 150},
                {"name": "London Eye Flight", "type": "Sightseeing", "description": "Take a spin on the giant Ferris wheel on the South Bank of the River Thames.", "default_cost": 42.0, "duration_minutes": 45},
                {"name": "Traditional Afternoon Tea at Ritz", "type": "Food", "description": "Indulge in finely cut sandwiches, freshly baked scones, and exquisite pastries.", "default_cost": 75.0, "duration_minutes": 90},
                {"name": "British Museum Highlights Tour", "type": "Sightseeing", "description": "See the Rosetta Stone, Parthenon Sculptures, and Egyptian mummies.", "default_cost": 15.0, "duration_minutes": 120},
                {"name": "Harry Potter Warner Bros Studio Tour", "type": "Adventure", "description": "Walk onto iconic sets like the Great Hall, Diagon Alley, and Dumbledore's office.", "default_cost": 65.0, "duration_minutes": 240}
            ],
            "Rome": [
                {"name": "Colosseum & Roman Forum Guided Tour", "type": "Sightseeing", "description": "Step back in time to the Roman Empire and see the gladiatorial arena.", "default_cost": 50.0, "duration_minutes": 180},
                {"name": "Vatican Museums & Sistine Chapel Tour", "type": "Sightseeing", "description": "Marvel at Michelangelo's famous frescoes and the vast Vatican collection.", "default_cost": 48.0, "duration_minutes": 180},
                {"name": "Pasta & Tiramisu Making Class", "type": "Food", "description": "Prepare fresh handmade Italian pasta and classic tiramisu with local wine.", "default_cost": 68.0, "duration_minutes": 180},
                {"name": "Trevi Fountain & Pantheon Night Walk", "type": "Sightseeing", "description": "Enjoy a stroll through Rome's illuminated piazzas, tossing a coin in Trevi.", "default_cost": 0.0, "duration_minutes": 90},
                {"name": "Gelato Tasting & City Tour", "type": "Food", "description": "Try Rome's finest artisanal gelato while learning about local landmarks.", "default_cost": 15.0, "duration_minutes": 60}
            ],
            "Sydney": [
                {"name": "Sydney Opera House Behind-the-Scenes", "type": "Sightseeing", "description": "Tour the sails of the world's most famous performing arts center.", "default_cost": 38.0, "duration_minutes": 60},
                {"name": "BridgeClimb Sydney (Express)", "type": "Adventure", "description": "Climb the outer arch of the Sydney Harbour Bridge for spectacular harbor views.", "default_cost": 260.0, "duration_minutes": 150},
                {"name": "Bondi to Coogee Coastal Walk", "type": "Sightseeing", "description": "Stunning cliffside walk passing beaches, rockpools, and parks.", "default_cost": 0.0, "duration_minutes": 180},
                {"name": "Taronga Zoo Cruise & Entry", "type": "Adventure", "description": "Ferry across Sydney Harbour to meet koalas, kangaroos, and exotic animals.", "default_cost": 50.0, "duration_minutes": 240}
            ],
            "Cape Town": [
                {"name": "Table Mountain Cableway Ride", "type": "Sightseeing", "description": "Take the rotating cable car to the flat-topped summit of Table Mountain.", "default_cost": 26.0, "duration_minutes": 120},
                {"name": "Cape Peninsula Coastal Day Trip", "type": "Sightseeing", "description": "See Cape Point, Boulders Beach penguins, and Chapman's Peak Drive.", "default_cost": 65.0, "duration_minutes": 480},
                {"name": "Robben Island Museum Tour", "type": "Culture", "description": "Visit the prison where Nelson Mandela spent 18 years, guided by ex-prisoners.", "default_cost": 32.0, "duration_minutes": 210},
                {"name": "Stellenbosch Vineyard Wine Tasting", "type": "Food", "description": "Sample award-winning South African wines paired with local cheese.", "default_cost": 45.0, "duration_minutes": 240}
            ],
            "Cairo": [
                {"name": "Giza Pyramids & Sphinx Guided Tour", "type": "Sightseeing", "description": "Behold the last remaining ancient wonder of the world and the Sphinx.", "default_cost": 35.0, "duration_minutes": 240},
                {"name": "Egyptian Museum Rosetta Highlights", "type": "Sightseeing", "description": "See King Tutankhamun's golden mask and thousands of pharaonic treasures.", "default_cost": 22.0, "duration_minutes": 180},
                {"name": "Nile River Felucca Sunset Sailing", "type": "Adventure", "description": "Sail a traditional wooden boat along the historic Nile River as the sun sets.", "default_cost": 18.0, "duration_minutes": 90},
                {"name": "Khan el-Khalili Bazaar Shopping Walk", "type": "Sightseeing", "description": "Bargain for spices, lanterns, and perfumes in Cairo's oldest market district.", "default_cost": 0.0, "duration_minutes": 120}
            ],
            "Bangkok": [
                {"name": "Grand Palace & Wat Phra Kaew Tour", "type": "Sightseeing", "description": "Explore the official residence of the Kings of Siam and the Emerald Buddha.", "default_cost": 16.0, "duration_minutes": 120},
                {"name": "Damnoen Saduak Floating Market", "type": "Adventure", "description": "Ride a longtail boat through channels packed with vendors selling fresh fruits.", "default_cost": 32.0, "duration_minutes": 300},
                {"name": "Thai Street Food Night Tour by Tuk Tuk", "type": "Food", "description": "Speed through Bangkok on a tuk-tuk, tasting Michelin-starred street eats.", "default_cost": 28.0, "duration_minutes": 210},
                {"name": "Traditional Royal Thai Massage", "type": "Wellness", "description": "Relieve travel tension with a traditional acupressure and yoga-stretch massage.", "default_cost": 22.0, "duration_minutes": 90}
            ],
            "Rio de Janeiro": [
                {"name": "Christ the Redeemer Train Ticket", "type": "Sightseeing", "description": "Ascend Corcovado Mountain by cog train to stand beneath the massive statue.", "default_cost": 25.0, "duration_minutes": 120},
                {"name": "Sugarloaf Mountain Cable Car Ride", "type": "Sightseeing", "description": "Enjoy two cable car rides to the summit for breathtaking bay views.", "default_cost": 30.0, "duration_minutes": 120},
                {"name": "Samba Dance Class in Lapa", "type": "Culture", "description": "Learn the basic rhythms and steps of Brazil's national dance with a pro.", "default_cost": 18.0, "duration_minutes": 60},
                {"name": "Copacabana Beach Food & Walk", "type": "Food", "description": "Sip coconut water and try local street snacks like coxinha along the beach.", "default_cost": 12.0, "duration_minutes": 90}
            ]
        }
        
        for city_name, acts in activities_data.items():
            city_obj = cities_map[city_name]
            for act_item in acts:
                activity = models.Activity(
                    city_id=city_obj.id,
                    name=act_item["name"],
                    type=act_item["type"],
                    description=act_item["description"],
                    default_cost=act_item["default_cost"],
                    duration_minutes=act_item["duration_minutes"]
                )
                db.add(activity)
                
        db.commit()
        print("Database seeded successfully with cities and activities!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed()
