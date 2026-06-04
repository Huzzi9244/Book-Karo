from datetime import datetime, timedelta
from bson.objectid import ObjectId
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from fastapi import FastAPI
from pydantic import BaseModel
from pymongo import MongoClient
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connects to your local laptop database
client = MongoClient("mongodb://localhost:27017/")
db = client.sports_booking_db 

# --- 1. YOUR DATABASE BLUEPRINTS (MODELS) ---

class UserSchema(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    phone: str
    role: str = "user" # You will manually change yours to "admin" later

class CourtSchema(BaseModel):
    court_id: str
    sport_type: str
    hourly_rate: int

class BookingSchema(BaseModel):
    user_email: str
    court_id: str
    date: str
    start_time: str
    duration_hours: int
    status: str = "Reserved"
    total_charged: int

class LoginSchema(BaseModel):
    email: str
    password: str

class AdminUpdateSchema(BaseModel):
    court_id: str
    date: str
    start_time: str
    duration_hours: int


# --- 2. YOUR APP ROUTES (ENDPOINTS) ---

@app.get("/")
def home():
    return {"message": "Backend is running!"}


@app.post("/setup-courts")
def setup_courts():
    """This creates your 5 specific courts in the database automatically."""
    
    # Check if courts already exist so we don't make duplicates
    if db.courts.count_documents({}) > 0:
        return {"message": "Courts are already set up!"}

    # The exact courts and prices you requested
    courts_data = [
        {"court_id": "B1", "sport_type": "Badminton", "hourly_rate": 1500},
        {"court_id": "B2", "sport_type": "Badminton", "hourly_rate": 1500},
        {"court_id": "P1", "sport_type": "Padel", "hourly_rate": 4000},
        {"court_id": "P2", "sport_type": "Padel", "hourly_rate": 4000},
        {"court_id": "P3", "sport_type": "Padel", "hourly_rate": 4000}
    ]
    
    # Insert them into your local MongoDB
    db.courts.insert_many(courts_data)
    
    return {"message": "Success! 2 Badminton and 3 Padel courts added to database."}


@app.post("/book-court")
def book_court(booking: BookingSchema):
    """This takes a user's booking, prevents double-bookings, calculates price, and saves it."""
    
    # 1. Look up the specific court in the database to get its hourly rate
    court = db.courts.find_one({"court_id": booking.court_id})
    
    if not court:
        return JSONResponse(
            status_code=400, 
            content={"error": "Court not found! Please select a valid court."}
        )
    
    # --- 2. DOUBLE BOOKING PREVENTION ENGINE ---
    new_start = int(booking.start_time.split(':')[0])
    new_end = new_start + booking.duration_hours
    
    daily_bookings = db.bookings.find({
        "court_id": booking.court_id,
        "date": booking.date
    })
    
    for b in daily_bookings:
        b_start = int(b["start_time"].split(':')[0])
        b_end = b_start + b["duration_hours"]
        
        if max(new_start, b_start) < min(new_end, b_end):
            return JSONResponse(
                status_code=400, 
                content={"error": f"Court {booking.court_id} is already booked during this time."}
            )
    # ------------------------------------------
    
    # 3. Calculate the price
    calculated_total = court["hourly_rate"] * booking.duration_hours
    
    # 4. Create the final booking document
    new_booking = {
        "user_email": booking.user_email,
        "court_id": booking.court_id,
        "date": booking.date,
        "start_time": booking.start_time,
        "duration_hours": booking.duration_hours,
        "status": "Reserved",
        "total_charged": calculated_total
    }
    
    # 5. Save this booking into a brand new 'bookings' collection
    db.bookings.insert_one(new_booking)
    
    return {
        "message": "Booking successful!", 
        "court": booking.court_id,
        "total_paid": calculated_total
    }


@app.post("/signup")
def sign_up(user: UserSchema):
    """Registers a brand new user into the database."""
    existing_user = db.users.find_one({"email": user.email})
    if existing_user:
        return {"error": "This email is already registered!"}
    
    user_dict = user.dict()
    db.users.insert_one(user_dict)
    
    return {
        "message": "Sign up successful!", 
        "first_name": user.first_name
    }


@app.post("/signin")
def sign_in(credentials: LoginSchema):
    """Verifies existing users and sends back their details for the Welcome screen."""
    user = db.users.find_one({
        "email": credentials.email,
        "password": credentials.password
    })
    
    if not user:
        return {"error": "Invalid email or password!"}
    
    return {
        "message": "Login successful!",
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"]
    }


# --- GET USER BOOKINGS ---
@app.get("/my-bookings/{email}")
async def get_my_bookings(email: str):
    user_bookings = list(db.bookings.find({"user_email": email}))
    now = datetime.now()
    
    for booking in user_bookings:
        # 1. Calculate the exact end time of this specific booking
        start_dt = datetime.strptime(f"{booking['date']} {booking['start_time']}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=booking['duration_hours'])
        
        # 2. If the end time is in the past AND it still says Reserved, update the database!
        if end_dt < now and booking.get("status") == "Reserved":
            db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "Completed"}})
            booking["status"] = "Completed"
            
        booking["_id"] = str(booking["_id"])
        
    return user_bookings


# --- FIXED ADMIN MASTER ROUTE ---
@app.get("/admin/all-bookings")
def get_all_bookings():
    """Fetches every single booking and attaches the user's name and phone."""
    
    # 1. Fetch all bookings
    bookings_cursor = db.bookings.find({})
    all_bookings = list(bookings_cursor)
    now = datetime.now()
    
    # 2. Convert ObjectIds to strings AND fetch the user's details
    for booking in all_bookings:
        
        # --- LAZY EVALUATION FOR STATUS UPDATE ---
        start_dt = datetime.strptime(f"{booking['date']} {booking['start_time']}", "%Y-%m-%d %H:%M")
        end_dt = start_dt + timedelta(hours=booking['duration_hours'])
        
        if end_dt < now and booking.get("status") == "Reserved":
            db.bookings.update_one({"_id": booking["_id"]}, {"$set": {"status": "Completed"}})
            booking["status"] = "Completed"
        # -----------------------------------------

        booking["_id"] = str(booking["_id"])
        
        # Look up the user matching the email on the booking
        user = db.users.find_one({"email": booking.get("user_email")})
        
        # Safely attach the data to the booking dictionary
        if user:
            booking["user_name"] = f"{user.get('first_name', '')} {user.get('last_name', '')}".strip()
            booking["user_phone"] = user.get("phone", "N/A")
        else:
            booking["user_name"] = "Unknown Player"
            booking["user_phone"] = "N/A"
            
    return all_bookings


@app.delete("/cancel-booking/{booking_id}")
def cancel_booking(booking_id: str):
    """Finds a booking by its MongoDB _id and deletes it."""
    try:
        result = db.bookings.delete_one({"_id": ObjectId(booking_id)})
        if result.deleted_count == 1:
            return {"message": "Booking successfully cancelled."}
        else:
            return {"error": "Booking not found."}
    except Exception as e:
        return {"error": "Invalid booking ID format."}
    

# --- ADMIN ROUTES ---

@app.delete("/admin/cancel-booking/{booking_id}")
def admin_cancel_booking(booking_id: str):
    """Admin route to violently delete any booking from the system."""
    try:
        result = db.bookings.delete_one({"_id": ObjectId(booking_id)})
        if result.deleted_count == 1:
            return {"message": "Booking successfully wiped by Admin."}
        else:
            return JSONResponse(status_code=404, content={"error": "Booking not found in database."})
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": "Invalid booking ID format."})


@app.put("/admin/update-booking/{booking_id}")
def admin_update_booking(booking_id: str, update_data: AdminUpdateSchema):
    """Admin route to modify a booking, heavily guarded by the Double-Booking Engine."""
    try:
        target_id = ObjectId(booking_id)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": "Invalid booking ID format."})

    court = db.courts.find_one({"court_id": update_data.court_id})
    if not court:
        return JSONResponse(status_code=400, content={"error": "Target court does not exist!"})

    # --- DOUBLE BOOKING ENGINE (UPDATE MODE) ---
    new_start = int(update_data.start_time.split(':')[0])
    new_end = new_start + update_data.duration_hours
    
    daily_bookings = db.bookings.find({
        "court_id": update_data.court_id,
        "date": update_data.date,
        "_id": {"$ne": target_id} 
    })
    
    for b in daily_bookings:
        b_start = int(b["start_time"].split(':')[0])
        b_end = b_start + b["duration_hours"]
        
        if max(new_start, b_start) < min(new_end, b_end):
            return JSONResponse(
                status_code=400, 
                content={"error": f"Conflict: Court {update_data.court_id} is already booked during this adjusted time."}
            )
    # ----------------------------------------------

    new_total_charged = court["hourly_rate"] * update_data.duration_hours

    # Admin updates should default the status back to Reserved in case they pushed a past booking to the future.
    result = db.bookings.update_one(
        {"_id": target_id},
        {"$set": {
            "court_id": update_data.court_id,
            "date": update_data.date,
            "start_time": update_data.start_time,
            "duration_hours": update_data.duration_hours,
            "total_charged": new_total_charged,
            "status": "Reserved" 
        }}
    )

    if result.matched_count == 0:
        return JSONResponse(status_code=404, content={"error": "Booking not found."})

    return {
        "message": "Booking systematically updated!", 
        "new_total": new_total_charged
    }