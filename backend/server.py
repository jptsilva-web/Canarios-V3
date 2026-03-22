from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks, UploadFile, File, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import json
import tempfile
import zipfile
from passlib.context import CryptContext
from jose import JWTError, jwt
import secrets
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[os.environ['DB_NAME']]

# Email configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32)))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_active_season_id(user_id: str) -> Optional[str]:
    """Get the active season ID for a user"""
    season = await db.seasons.find_one({
        "is_active": True,
        "$or": [{"user_id": user_id}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    return season.get("id") if season else None

# Create the main app
app = FastAPI(title="Canary Breeding Control API")

# CORS middleware - allow all origins for now (debugging)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class BirdGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    UNKNOWN = "unknown"

class ClutchStatus(str, Enum):
    LAYING = "laying"
    INCUBATING = "incubating"
    HATCHING = "hatching"
    WEANING = "weaning"
    COMPLETED = "completed"

class EggStatus(str, Enum):
    FRESH = "fresh"
    FERTILE = "fertile"
    INFERTILE = "infertile"
    HATCHED = "hatched"
    DEAD = "dead"

# ============ USER & AUTH MODELS ============
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    password_hash: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    is_active: bool = True

class UserRegister(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    created_at: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PasswordResetToken(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    expires_at: str
    used: bool = False

# Season/Year Model
class Season(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    year: int
    name: str  # e.g., "2024", "2024/2025", "Breeding Season 2024"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = False
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SeasonCreate(BaseModel):
    year: int
    name: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    is_active: bool = False
    notes: Optional[str] = None

# Models
class Zone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    season_id: Optional[str] = None
    name: str
    rows: int = 4
    columns: int = 4
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ZoneCreate(BaseModel):
    name: str
    rows: int = 4
    columns: int = 4

class Cage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    season_id: Optional[str] = None
    zone_id: str
    row: int
    column: int
    label: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CageCreate(BaseModel):
    zone_id: str
    row: int
    column: int
    label: Optional[str] = None

class Bird(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    band_number: str
    band_year: int
    breeder_number: Optional[str] = None
    gender: BirdGender
    species: str = "Canary"
    color: Optional[str] = None
    stam: Optional[str] = None
    class_id: Optional[str] = None
    notes: Optional[str] = None
    parent_male_id: Optional[str] = None
    parent_female_id: Optional[str] = None
    birth_date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BirdCreate(BaseModel):
    band_number: str
    band_year: int
    breeder_number: Optional[str] = None
    gender: BirdGender
    species: str = "Canary"
    color: Optional[str] = None
    stam: Optional[str] = None
    class_id: Optional[str] = None
    notes: Optional[str] = None
    parent_male_id: Optional[str] = None
    parent_female_id: Optional[str] = None
    birth_date: Optional[str] = None

class Pair(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    name: Optional[str] = None
    cage_id: str
    male_id: Optional[str] = None
    female_id: Optional[str] = None
    paired_date: Optional[str] = None
    is_active: bool = True
    season_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PairCreate(BaseModel):
    name: Optional[str] = None
    cage_id: str
    male_id: Optional[str] = None
    female_id: Optional[str] = None
    paired_date: Optional[str] = None
    season_id: Optional[str] = None
    notes: Optional[str] = None

class PairUpdate(BaseModel):
    name: Optional[str] = None
    cage_id: Optional[str] = None
    male_id: Optional[str] = None
    female_id: Optional[str] = None
    paired_date: Optional[str] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class Egg(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    laid_date: str
    status: EggStatus = EggStatus.FRESH
    hatched_date: Optional[str] = None
    band_number: Optional[str] = None
    banded_date: Optional[str] = None
    sex: Optional[str] = None  # male, female, unknown

class Clutch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    season_id: Optional[str] = None
    pair_id: str
    start_date: str
    status: ClutchStatus = ClutchStatus.LAYING
    incubation_start: Optional[str] = None
    expected_hatch_date: Optional[str] = None
    expected_band_date: Optional[str] = None
    expected_wean_date: Optional[str] = None
    eggs: List[Egg] = []
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClutchCreate(BaseModel):
    pair_id: str
    start_date: Optional[str] = None
    notes: Optional[str] = None

class ClutchUpdate(BaseModel):
    status: Optional[ClutchStatus] = None
    incubation_start: Optional[str] = None
    notes: Optional[str] = None

class AddEggRequest(BaseModel):
    laid_date: Optional[str] = None

class UpdateEggRequest(BaseModel):
    status: Optional[EggStatus] = None
    hatched_date: Optional[str] = None
    band_number: Optional[str] = None
    banded_date: Optional[str] = None
    sex: Optional[str] = None  # male, female, unknown

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    name: str
    breeder_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContactCreate(BaseModel):
    name: str
    breeder_number: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

# Dashboard Stats
class DashboardStats(BaseModel):
    total_birds: int
    total_pairs: int
    active_pairs: int
    total_clutches: int
    eggs_laying: int
    eggs_incubating: int
    chicks_hatching: int

class Task(BaseModel):
    id: str
    type: str  # laying, incubation, hatching, banding, weaning
    pair_id: str
    pair_name: Optional[str]
    cage_label: Optional[str]
    due_date: str
    details: str

# Settings Model
class BreedingSettings(BaseModel):
    days_incubation: int = 13
    days_hatching: int = 0
    days_banding: int = 5
    days_separator: int = 21
    days_weaning: int = 35

class EmailSettings(BaseModel):
    notification_email: str = ""
    email_enabled: bool = False
    smtp_email: str = ""
    smtp_password: str = ""
    daily_report_enabled: bool = False
    daily_report_time: str = "08:00"
    user_id: Optional[str] = None

# Manual Task Model
class ManualTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    due_date: str
    task_type: str = "manual"
    completed: bool = False
    email_sent: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ManualTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str
    task_type: str = "manual"

# Season Bird Association - links birds to seasons
class SeasonBird(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    season_id: str
    bird_id: str
    imported_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ImportBirdsRequest(BaseModel):
    bird_ids: List[str]

# Task History - stores completed/dismissed tasks
class TaskHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    season_id: Optional[str] = None
    task_id: str  # Original task ID (e.g., "hatch-xxx", "band-xxx")
    task_type: str  # hatching, banding, weaning, laying, incubation
    pair_id: Optional[str] = None
    pair_name: str
    cage_label: str
    due_date: str
    details: str
    completed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    action: str = "completed"  # completed, dismissed, auto_completed

# Email sending function
async def send_email_notification(to_email: str, subject: str, body: str, smtp_email: str = None, smtp_password: str = None):
    # Use provided credentials or fall back to environment
    email_from = smtp_email or SMTP_EMAIL
    password = smtp_password or SMTP_PASSWORD
    
    if not email_from or not password:
        logging.warning("Email not configured - missing SMTP credentials")
        return False
    
    try:
        message = MIMEMultipart()
        message["From"] = email_from
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=email_from,
            password=password,
        )
        logging.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

# ============ AUTHENTICATION API ============
@api_router.post("/auth/register")
async def register(input: UserRegister):
    # Check if email already exists
    existing = await db.users.find_one({"email": input.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = User(
        email=input.email.lower(),
        name=input.name,
        password_hash=get_password_hash(input.password)
    )
    await db.users.insert_one(user.model_dump())
    
    # Create access token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            created_at=user.created_at
        )
    }

@api_router.post("/auth/login")
async def login(input: UserLogin):
    user = await db.users.find_one({"email": input.email.lower()}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(input.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account is deactivated")
    
    # Create access token
    access_token = create_access_token(data={"sub": user["id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    }

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(input: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    user = await db.users.find_one({"email": input.email.lower()}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a reset link will be sent"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    
    token_record = PasswordResetToken(
        user_id=user["id"],
        token=reset_token,
        expires_at=expires_at
    )
    await db.password_reset_tokens.insert_one(token_record.model_dump())
    
    # Send reset email
    reset_link = f"https://ornituga.com/reset-password?token={reset_token}"
    email_body = f"""
    <h2>Recuperação de Password - OrniTuga</h2>
    <p>Olá {user['name']},</p>
    <p>Recebemos um pedido para recuperar a sua password.</p>
    <p>Use o seguinte código para redefinir a sua password:</p>
    <h3 style="background: #FFC300; padding: 10px; display: inline-block; border-radius: 5px;">{reset_token[:8].upper()}</h3>
    <p>Este código expira em 1 hora.</p>
    <p>Se não solicitou esta recuperação, ignore este email.</p>
    <br>
    <p>Cumprimentos,<br>OrniTuga</p>
    """
    
    # Get SMTP settings from database
    email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    smtp_email = email_settings.get("smtp_email") if email_settings else SMTP_EMAIL
    smtp_password = email_settings.get("smtp_password") if email_settings else SMTP_PASSWORD
    
    if smtp_email and smtp_password:
        background_tasks.add_task(
            send_email_notification,
            user["email"],
            "Recuperação de Password - OrniTuga",
            email_body,
            smtp_email,
            smtp_password
        )
    else:
        logging.warning("SMTP not configured - password reset email not sent")
    
    return {"message": "If the email exists, a reset link will be sent"}

@api_router.post("/auth/reset-password")
async def reset_password(input: ResetPasswordRequest):
    # Find valid token (check both full token and first 8 chars)
    token_record = await db.password_reset_tokens.find_one({
        "$or": [
            {"token": input.token},
            {"token": {"$regex": f"^{input.token.lower()}", "$options": "i"}}
        ],
        "used": False
    }, {"_id": 0})
    
    if not token_record:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    
    # Check if token is expired
    expires_at = datetime.fromisoformat(token_record["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Token has expired")
    
    # Update password
    new_hash = get_password_hash(input.new_password)
    await db.users.update_one(
        {"id": token_record["user_id"]},
        {"$set": {"password_hash": new_hash}}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"id": token_record["id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Password reset successfully"}

# ============ SETTINGS API ============
@api_router.get("/settings")
async def get_settings(current_user: dict = Depends(get_current_user)):
    breeding = await db.settings.find_one({"type": "breeding"}, {"_id": 0})
    email = await db.settings.find_one(
        {"type": "email", "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    # Fallback to global email settings if user-specific not found
    if not email:
        email = await db.settings.find_one({"type": "email", "user_id": {"$exists": False}}, {"_id": 0})
    return {
        "breeding": breeding or BreedingSettings().model_dump(),
        "email": email or EmailSettings().model_dump()
    }

@api_router.post("/settings/breeding")
async def save_breeding_settings(input: BreedingSettings):
    await db.settings.update_one(
        {"type": "breeding"},
        {"$set": {**input.model_dump(), "type": "breeding"}},
        upsert=True
    )
    return {"message": "Breeding settings saved"}

@api_router.post("/settings/email")
async def save_email_settings(input: EmailSettings, current_user: dict = Depends(get_current_user)):
    settings_data = input.model_dump()
    settings_data["user_id"] = current_user["id"]
    settings_data["type"] = "email"
    
    await db.settings.update_one(
        {"type": "email", "user_id": current_user["id"]},
        {"$set": settings_data},
        upsert=True
    )
    return {"message": "Email settings saved"}

@api_router.post("/settings/test-email")
async def test_email(current_user: dict = Depends(get_current_user)):
    email_settings = await db.settings.find_one(
        {"type": "email", "user_id": current_user["id"]}, 
        {"_id": 0}
    )
    if not email_settings:
        email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    
    if not email_settings or not email_settings.get("notification_email"):
        raise HTTPException(status_code=400, detail="No notification email configured")
    
    smtp_email = email_settings.get("smtp_email")
    smtp_password = email_settings.get("smtp_password")
    
    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=400, detail="SMTP credentials not configured. Please enter your Gmail and App Password in settings.")
    
    success = await send_email_notification(
        email_settings["notification_email"],
        "🐤 Canary Control - Test Email",
        "<h2>Test Email</h2><p>Your email notifications are working correctly!</p>",
        smtp_email,
        smtp_password
    )
    
    if success:
        return {"message": "Test email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email. Please check your Gmail App Password.")

# ============ MANUAL TASKS API ============
@api_router.post("/manual-tasks", response_model=ManualTask)
async def create_manual_task(input: ManualTaskCreate, background_tasks: BackgroundTasks):
    task = ManualTask(**input.model_dump())
    doc = task.model_dump()
    await db.manual_tasks.insert_one(doc)
    
    # Send email notification if enabled
    email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    if email_settings and email_settings.get("email_enabled") and email_settings.get("notification_email"):
        smtp_email = email_settings.get("smtp_email")
        smtp_password = email_settings.get("smtp_password")
        if smtp_email and smtp_password:
            background_tasks.add_task(
                send_email_notification,
                email_settings["notification_email"],
                f"🐤 New Task: {task.title}",
                f"<h2>New Task Created</h2><p><strong>{task.title}</strong></p><p>{task.description or 'No description'}</p><p>Due: {task.due_date}</p>",
                smtp_email,
                smtp_password
            )
    
    return task

@api_router.get("/manual-tasks", response_model=List[ManualTask])
async def get_manual_tasks():
    tasks = await db.manual_tasks.find({}, {"_id": 0}).to_list(1000)
    return tasks

@api_router.delete("/manual-tasks/{task_id}")
async def delete_manual_task(task_id: str):
    result = await db.manual_tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.put("/manual-tasks/{task_id}/complete")
async def complete_manual_task(task_id: str):
    result = await db.manual_tasks.update_one(
        {"id": task_id},
        {"$set": {"completed": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task completed"}

# ============ ZONES API ============
@api_router.post("/zones", response_model=Zone)
async def create_zone(input: ZoneCreate, current_user: dict = Depends(get_current_user)):
    # Get active season
    active_season_id = await get_active_season_id(current_user["id"])
    zone = Zone(**input.model_dump(), user_id=current_user["id"], season_id=active_season_id)
    doc = zone.model_dump()
    await db.zones.insert_one(doc)
    return zone

@api_router.get("/zones", response_model=List[Zone])
async def get_zones(current_user: dict = Depends(get_current_user)):
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    
    if active_season_id:
        # When season is active, ONLY show data for that specific season (strict isolation)
        query = {
            "$and": [
                {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]},
                {"season_id": active_season_id}
            ]
        }
    else:
        # No active season - show all data including legacy
        query = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    zones = await db.zones.find(query, {"_id": 0}).to_list(1000)
    return zones

@api_router.get("/zones/{zone_id}", response_model=Zone)
async def get_zone(zone_id: str, current_user: dict = Depends(get_current_user)):
    zone = await db.zones.find_one({
        "id": zone_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.zones.delete_one({
        "id": zone_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    # Delete associated cages
    await db.cages.delete_many({"zone_id": zone_id})
    return {"message": "Zone deleted"}

@api_router.post("/zones/{zone_id}/generate-cages")
async def generate_cages(zone_id: str, current_user: dict = Depends(get_current_user)):
    zone = await db.zones.find_one({
        "id": zone_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Get active season
    active_season_id = await get_active_season_id(current_user["id"])
    
    # Delete existing cages for this zone
    await db.cages.delete_many({"zone_id": zone_id})
    
    # Generate new cages with sequential numbering
    cages = []
    cage_number = 1
    for row in range(1, zone["rows"] + 1):
        for col in range(1, zone["columns"] + 1):
            cage = Cage(
                zone_id=zone_id,
                row=row,
                column=col,
                label=f"{cage_number}",
                user_id=current_user["id"],
                season_id=active_season_id
            )
            cages.append(cage.model_dump())
            cage_number += 1
    
    if cages:
        await db.cages.insert_many(cages)
    
    return {"message": f"Generated {len(cages)} cages", "count": len(cages)}

# ============ CAGES API ============
@api_router.get("/cages", response_model=List[Cage])
async def get_cages(zone_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    
    if active_season_id:
        # When season is active, ONLY show data for that specific season (strict isolation)
        query = {
            "$and": [
                {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]},
                {"season_id": active_season_id}
            ]
        }
    else:
        # No active season - show all data including legacy
        query = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    if zone_id:
        query["zone_id"] = zone_id
    cages = await db.cages.find(query, {"_id": 0}).to_list(1000)
    return cages

@api_router.get("/cages/{cage_id}", response_model=Cage)
async def get_cage(cage_id: str, current_user: dict = Depends(get_current_user)):
    cage = await db.cages.find_one({
        "id": cage_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not cage:
        raise HTTPException(status_code=404, detail="Cage not found")
    return cage

# ============ BIRDS API ============
@api_router.post("/birds", response_model=Bird)
async def create_bird(input: BirdCreate, current_user: dict = Depends(get_current_user)):
    # Validate: birds with same band_number + band_year + gender + stam = duplicate for this user
    if input.stam:
        existing = await db.birds.find_one({
            "band_number": input.band_number,
            "band_year": input.band_year,
            "gender": input.gender,
            "stam": input.stam,
            "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
        }, {"_id": 0})
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"A bird with band {input.band_number}, year {input.band_year}, gender {input.gender}, and STAM {input.stam} already exists"
            )
    
    bird = Bird(**input.model_dump(), user_id=current_user["id"])
    doc = bird.model_dump()
    await db.birds.insert_one(doc)
    
    # Automatically add the bird to the active season
    active_season_id = await get_active_season_id(current_user["id"])
    if active_season_id:
        season_bird = SeasonBird(
            user_id=current_user["id"],
            season_id=active_season_id,
            bird_id=bird.id
        )
        await db.season_birds.insert_one(season_bird.model_dump())
    
    return bird

@api_router.get("/birds/stams", response_model=List[str])
async def get_unique_stams(current_user: dict = Depends(get_current_user)):
    """Get all unique STAM values for auto-suggest"""
    pipeline = [
        {"$match": {
            "stam": {"$ne": None, "$ne": ""},
            "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
        }},
        {"$group": {"_id": "$stam"}},
        {"$sort": {"_id": 1}}
    ]
    results = await db.birds.aggregate(pipeline).to_list(1000)
    return [r["_id"] for r in results]

@api_router.get("/birds", response_model=List[Bird])
async def get_birds(gender: Optional[BirdGender] = None, current_user: dict = Depends(get_current_user)):
    query = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    if gender:
        query["gender"] = gender
    birds = await db.birds.find(query, {"_id": 0}).to_list(1000)
    return birds

@api_router.get("/birds/{bird_id}", response_model=Bird)
async def get_bird(bird_id: str, current_user: dict = Depends(get_current_user)):
    bird = await db.birds.find_one({
        "id": bird_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    return bird

@api_router.put("/birds/{bird_id}", response_model=Bird)
async def update_bird(bird_id: str, input: BirdCreate, current_user: dict = Depends(get_current_user)):
    bird = await db.birds.find_one({
        "id": bird_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    
    # Validate: birds with same band_number + band_year + gender + stam = duplicate (excluding current bird)
    if input.stam:
        existing = await db.birds.find_one({
            "band_number": input.band_number,
            "band_year": input.band_year,
            "gender": input.gender,
            "stam": input.stam,
            "id": {"$ne": bird_id},
            "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
        }, {"_id": 0})
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"A bird with band {input.band_number}, year {input.band_year}, gender {input.gender}, and STAM {input.stam} already exists"
            )
    
    update_data = input.model_dump()
    await db.birds.update_one({"id": bird_id}, {"$set": update_data})
    updated_bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
    return updated_bird

class BirdPartialUpdate(BaseModel):
    gender: Optional[str] = None
    stam: Optional[str] = None
    class_id: Optional[str] = None
    notes: Optional[str] = None

@api_router.patch("/birds/{bird_id}", response_model=Bird)
async def partial_update_bird(bird_id: str, input: BirdPartialUpdate, current_user: dict = Depends(get_current_user)):
    bird = await db.birds.find_one({
        "id": bird_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    
    # Only update fields that were provided
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    if update_data:
        await db.birds.update_one({"id": bird_id}, {"$set": update_data})
    
    updated_bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
    return updated_bird

@api_router.delete("/birds/{bird_id}")
async def delete_bird(bird_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.birds.delete_one({
        "id": bird_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bird not found")
    return {"message": "Bird deleted"}

# ============ SEASON BIRDS API (Import Birds to Season) ============
@api_router.get("/season-birds", response_model=List[Bird])
async def get_season_birds(current_user: dict = Depends(get_current_user)):
    """Get birds imported/associated with the active season"""
    active_season_id = await get_active_season_id(current_user["id"])
    
    if not active_season_id:
        # No active season - return empty
        return []
    
    # Get bird IDs associated with this season (include legacy data without user_id)
    season_bird_docs = await db.season_birds.find({
        "$and": [
            {"season_id": active_season_id},
            {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
        ]
    }, {"_id": 0}).to_list(1000)
    
    bird_ids = [sb["bird_id"] for sb in season_bird_docs]
    
    if not bird_ids:
        return []
    
    # Get the actual bird records
    birds = await db.birds.find({
        "id": {"$in": bird_ids},
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(1000)
    
    return birds

@api_router.get("/season-birds/available", response_model=List[Bird])
async def get_available_birds_to_import(current_user: dict = Depends(get_current_user)):
    """Get all birds that are NOT yet imported into the active season.
    Only shows birds with band_year <= season year (can't import future birds into past seasons)
    """
    active_season_id = await get_active_season_id(current_user["id"])
    
    # Get the active season year
    active_season = await db.seasons.find_one({"id": active_season_id}, {"_id": 0}) if active_season_id else None
    season_year = active_season.get("year") if active_season else None
    
    # Get all birds for this user
    all_birds = await db.birds.find({
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(1000)
    
    if not active_season_id:
        return all_birds
    
    # Get bird IDs already in this season (include legacy data without user_id)
    season_bird_docs = await db.season_birds.find({
        "$and": [
            {"season_id": active_season_id},
            {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
        ]
    }, {"_id": 0}).to_list(1000)
    
    imported_bird_ids = set(sb["bird_id"] for sb in season_bird_docs)
    
    # Return birds NOT in this season AND with band_year <= season year
    # A bird from 2026 cannot be imported into season 2025
    available_birds = []
    for b in all_birds:
        if b["id"] not in imported_bird_ids:
            bird_year = b.get("band_year")
            # If bird has a band_year, it must be <= season year
            if bird_year and season_year:
                try:
                    if int(bird_year) <= int(season_year):
                        available_birds.append(b)
                except (ValueError, TypeError):
                    # If year can't be parsed, include it
                    available_birds.append(b)
            else:
                # If no year info, include it
                available_birds.append(b)
    
    return available_birds

@api_router.post("/season-birds/import")
async def import_birds_to_season(request: ImportBirdsRequest, current_user: dict = Depends(get_current_user)):
    """Import birds from previous seasons into the active season.
    Validates that bird band_year <= season year (can't import future birds into past seasons)
    """
    active_season_id = await get_active_season_id(current_user["id"])
    
    if not active_season_id:
        raise HTTPException(status_code=400, detail="No active season. Please activate a season first.")
    
    # Get the active season year
    active_season = await db.seasons.find_one({"id": active_season_id}, {"_id": 0})
    season_year = active_season.get("year") if active_season else None
    
    imported_count = 0
    skipped_count = 0
    
    for bird_id in request.bird_ids:
        # Check if already imported
        existing = await db.season_birds.find_one({
            "user_id": current_user["id"],
            "season_id": active_season_id,
            "bird_id": bird_id
        })
        
        if existing:
            continue
        
        # Get the bird to validate its year
        bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
        if not bird:
            continue
        
        # Validate: bird band_year must be <= season year
        bird_year = bird.get("band_year")
        if bird_year and season_year:
            try:
                if int(bird_year) > int(season_year):
                    # Can't import a bird from the future into a past season
                    skipped_count += 1
                    continue
            except (ValueError, TypeError):
                pass
        
        season_bird = SeasonBird(
            user_id=current_user["id"],
            season_id=active_season_id,
            bird_id=bird_id
        )
        await db.season_birds.insert_one(season_bird.model_dump())
        imported_count += 1
    
    message = f"Successfully imported {imported_count} birds"
    if skipped_count > 0:
        message += f" ({skipped_count} skipped - bird year is after season year)"
    
    return {"message": message, "imported_count": imported_count, "skipped_count": skipped_count}

@api_router.delete("/season-birds/{bird_id}")
async def remove_bird_from_season(bird_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a bird from the active season (does not delete the bird itself)"""
    active_season_id = await get_active_season_id(current_user["id"])
    
    if not active_season_id:
        raise HTTPException(status_code=400, detail="No active season")
    
    result = await db.season_birds.delete_one({
        "user_id": current_user["id"],
        "season_id": active_season_id,
        "bird_id": bird_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bird not found in this season")
    
    return {"message": "Bird removed from season"}

# ============ PAIRS API ============
@api_router.post("/pairs", response_model=Pair)
async def create_pair(input: PairCreate, current_user: dict = Depends(get_current_user)):
    # Get active season
    active_season_id = await get_active_season_id(current_user["id"])
    # Remove season_id from input if provided and use active season instead
    pair_data = input.model_dump()
    pair_data.pop("season_id", None)  # Remove from input data
    pair = Pair(**pair_data, user_id=current_user["id"], season_id=active_season_id)
    doc = pair.model_dump()
    await db.pairs.insert_one(doc)
    return pair

@api_router.get("/pairs", response_model=List[Pair])
async def get_pairs(active_only: bool = False, current_user: dict = Depends(get_current_user)):
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    
    if active_season_id:
        # When season is active, ONLY show data for that specific season (strict isolation)
        query = {
            "$and": [
                {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]},
                {"season_id": active_season_id}
            ]
        }
    else:
        # No active season - show all data including legacy
        query = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    if active_only:
        query["is_active"] = True
    pairs = await db.pairs.find(query, {"_id": 0}).to_list(1000)
    return pairs

@api_router.get("/pairs/{pair_id}", response_model=Pair)
async def get_pair(pair_id: str, current_user: dict = Depends(get_current_user)):
    pair = await db.pairs.find_one({
        "id": pair_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair

@api_router.put("/pairs/{pair_id}", response_model=Pair)
async def update_pair(pair_id: str, input: PairUpdate, current_user: dict = Depends(get_current_user)):
    pair = await db.pairs.find_one({
        "id": pair_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.pairs.update_one({"id": pair_id}, {"$set": update_data})
    
    updated_pair = await db.pairs.find_one({"id": pair_id}, {"_id": 0})
    return updated_pair

@api_router.delete("/pairs/{pair_id}")
async def delete_pair(pair_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.pairs.delete_one({
        "id": pair_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pair not found")
    return {"message": "Pair deleted"}

# ============ CLUTCHES API ============
@api_router.post("/clutches", response_model=Clutch)
async def create_clutch(input: ClutchCreate, current_user: dict = Depends(get_current_user)):
    # Get active season
    active_season_id = await get_active_season_id(current_user["id"])
    start_date = input.start_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    clutch = Clutch(
        pair_id=input.pair_id,
        start_date=start_date,
        notes=input.notes,
        user_id=current_user["id"],
        season_id=active_season_id
    )
    doc = clutch.model_dump()
    await db.clutches.insert_one(doc)
    return clutch

@api_router.get("/clutches", response_model=List[Clutch])
async def get_clutches(pair_id: Optional[str] = None, status: Optional[ClutchStatus] = None, current_user: dict = Depends(get_current_user)):
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    
    if active_season_id:
        # When season is active, ONLY show data for that specific season (strict isolation)
        query = {
            "$and": [
                {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]},
                {"season_id": active_season_id}
            ]
        }
    else:
        # No active season - show all data including legacy
        query = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    if pair_id:
        query["pair_id"] = pair_id
    if status:
        query["status"] = status
    clutches = await db.clutches.find(query, {"_id": 0}).to_list(1000)
    return clutches

@api_router.get("/clutches/{clutch_id}", response_model=Clutch)
async def get_clutch(clutch_id: str, current_user: dict = Depends(get_current_user)):
    clutch = await db.clutches.find_one({
        "id": clutch_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    return clutch

@api_router.put("/clutches/{clutch_id}", response_model=Clutch)
async def update_clutch(clutch_id: str, input: ClutchUpdate, current_user: dict = Depends(get_current_user)):
    clutch = await db.clutches.find_one({
        "id": clutch_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    
    # Calculate dates when starting incubation
    if input.incubation_start and input.status == ClutchStatus.INCUBATING:
        incubation_date = datetime.strptime(input.incubation_start, "%Y-%m-%d")
        update_data["expected_hatch_date"] = (incubation_date + timedelta(days=13)).strftime("%Y-%m-%d")
        update_data["expected_band_date"] = (incubation_date + timedelta(days=18)).strftime("%Y-%m-%d")
        update_data["expected_wean_date"] = (incubation_date + timedelta(days=35)).strftime("%Y-%m-%d")
    
    if update_data:
        await db.clutches.update_one({"id": clutch_id}, {"$set": update_data})
    
    updated_clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    return updated_clutch

@api_router.post("/clutches/{clutch_id}/eggs", response_model=Clutch)
async def add_egg(clutch_id: str, input: AddEggRequest, current_user: dict = Depends(get_current_user)):
    clutch = await db.clutches.find_one({
        "id": clutch_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    
    laid_date = input.laid_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_egg = Egg(laid_date=laid_date)
    
    eggs = clutch.get("eggs", [])
    eggs.append(new_egg.model_dump())
    
    await db.clutches.update_one({"id": clutch_id}, {"$set": {"eggs": eggs}})
    updated_clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    return updated_clutch

@api_router.put("/clutches/{clutch_id}/eggs/{egg_id}", response_model=Clutch)
async def update_egg(clutch_id: str, egg_id: str, input: UpdateEggRequest, current_user: dict = Depends(get_current_user)):
    clutch = await db.clutches.find_one({
        "id": clutch_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    
    eggs = clutch.get("eggs", [])
    egg_found = False
    egg_data = None
    
    logging.info(f"Updating egg {egg_id} with input: {input.model_dump()}")
    
    for i, egg in enumerate(eggs):
        if egg["id"] == egg_id:
            # Only update fields that are provided
            if input.status is not None:
                eggs[i]["status"] = input.status
            if input.hatched_date is not None:
                eggs[i]["hatched_date"] = input.hatched_date
            if input.band_number is not None:
                eggs[i]["band_number"] = input.band_number
            if input.banded_date is not None:
                eggs[i]["banded_date"] = input.banded_date
            if input.sex is not None:
                eggs[i]["sex"] = input.sex
                logging.info(f"Setting sex to {input.sex} for egg {egg_id}")
            egg_found = True
            egg_data = eggs[i]
            break
    
    if not egg_found:
        raise HTTPException(status_code=404, detail="Egg not found")
    
    logging.info(f"Saving eggs: {eggs}")
    await db.clutches.update_one({"id": clutch_id}, {"$set": {"eggs": eggs}})
    
    # Auto-create bird when egg is banded (has band_number and status is hatched)
    if input.band_number and input.status == "hatched":
        # Get pair info to determine parents
        pair = await db.pairs.find_one({"id": clutch.get("pair_id")}, {"_id": 0})
        
        # Check if bird with this band number already exists
        existing_bird = await db.birds.find_one({"band_number": input.band_number}, {"_id": 0})
        
        if not existing_bird:
            # Create new bird record for the newborn
            new_bird = Bird(
                band_number=input.band_number,
                band_year=datetime.now().year,
                gender="unknown",  # Unknown until determined
                species="Canary",
                stam="",
                notes=f"Newborn from clutch. Hatched: {egg_data.get('hatched_date', 'N/A')}",
                birth_date=egg_data.get("hatched_date"),
                parent_male_id=pair.get("male_id") if pair else None,
                parent_female_id=pair.get("female_id") if pair else None,
                user_id=current_user["id"]
            )
            await db.birds.insert_one(new_bird.model_dump())
            logging.info(f"Auto-created bird record for banded chick: {input.band_number}")
    
    # If sex is updated and egg has band_number, also update the bird record
    if input.sex is not None and egg_data and egg_data.get("band_number"):
        await db.birds.update_one(
            {"band_number": egg_data["band_number"]},
            {"$set": {"gender": input.sex}}
        )
        logging.info(f"Updated bird gender for {egg_data['band_number']} to {input.sex}")
    
    updated_clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    return updated_clutch

@api_router.delete("/clutches/{clutch_id}")
async def delete_clutch(clutch_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clutches.delete_one({
        "id": clutch_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clutch not found")
    return {"message": "Clutch deleted"}

# Migrate existing banded eggs to birds collection
@api_router.post("/migrate-banded-eggs")
async def migrate_banded_eggs(current_user: dict = Depends(get_current_user)):
    """One-time migration to create bird records for existing banded eggs"""
    clutches = await db.clutches.find({
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(10000)
    migrated = 0
    
    for clutch in clutches:
        pair = await db.pairs.find_one({"id": clutch.get("pair_id")}, {"_id": 0})
        
        for egg in clutch.get("eggs", []):
            if egg.get("status") == "hatched" and egg.get("band_number"):
                # Check if bird already exists
                existing = await db.birds.find_one({"band_number": egg["band_number"]}, {"_id": 0})
                if not existing:
                    new_bird = Bird(
                        band_number=egg["band_number"],
                        band_year=datetime.now().year,
                        gender="unknown",
                        species="Canary",
                        stam="",
                        notes=f"Newborn from clutch. Hatched: {egg.get('hatched_date', 'N/A')}",
                        birth_date=egg.get("hatched_date"),
                        parent_male_id=pair.get("male_id") if pair else None,
                        parent_female_id=pair.get("female_id") if pair else None,
                        user_id=current_user["id"]
                    )
                    await db.birds.insert_one(new_bird.model_dump())
                    migrated += 1
    
    return {"message": f"Migrated {migrated} banded eggs to birds collection"}

# ============ CONTACTS API ============
@api_router.post("/contacts", response_model=Contact)
async def create_contact(input: ContactCreate, current_user: dict = Depends(get_current_user)):
    contact = Contact(**input.model_dump(), user_id=current_user["id"])
    doc = contact.model_dump()
    await db.contacts.insert_one(doc)
    return contact

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(current_user: dict = Depends(get_current_user)):
    contacts = await db.contacts.find({
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(1000)
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({
        "id": contact_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, input: ContactCreate, current_user: dict = Depends(get_current_user)):
    contact = await db.contacts.find_one({
        "id": contact_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = input.model_dump()
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    updated_contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated_contact

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.contacts.delete_one({
        "id": contact_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ============ DASHBOARD API ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    user_filter = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    # Season filter for pairs and clutches - strict isolation
    if active_season_id:
        season_filter = {
            "$and": [
                user_filter,
                {"season_id": active_season_id}
            ]
        }
    else:
        season_filter = user_filter
    
    # Birds are global (not filtered by season)
    total_birds = await db.birds.count_documents(user_filter)
    # Pairs and clutches are filtered by season
    total_pairs = await db.pairs.count_documents(season_filter)
    active_pairs = await db.pairs.count_documents({**season_filter, "is_active": True})
    total_clutches = await db.clutches.count_documents(season_filter)
    eggs_laying = await db.clutches.count_documents({**season_filter, "status": ClutchStatus.LAYING})
    eggs_incubating = await db.clutches.count_documents({**season_filter, "status": ClutchStatus.INCUBATING})
    chicks_hatching = await db.clutches.count_documents({**season_filter, "status": ClutchStatus.HATCHING})
    
    return DashboardStats(
        total_birds=total_birds,
        total_pairs=total_pairs,
        active_pairs=active_pairs,
        total_clutches=total_clutches,
        eggs_laying=eggs_laying,
        eggs_incubating=eggs_incubating,
        chicks_hatching=chicks_hatching
    )

@api_router.get("/dashboard/tasks", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = []
    # Get active season and filter by it - strict isolation
    active_season_id = await get_active_season_id(current_user["id"])
    user_filter = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    # Season filter for clutches - strict isolation
    if active_season_id:
        season_filter = {
            "$and": [
                user_filter,
                {"season_id": active_season_id}
            ]
        }
    else:
        season_filter = user_filter
    
    # Get all active clutches for this user and season
    clutches = await db.clutches.find({**season_filter, "status": {"$ne": ClutchStatus.COMPLETED}}, {"_id": 0}).to_list(1000)
    
    for clutch in clutches:
        pair = await db.pairs.find_one({"id": clutch["pair_id"]}, {"_id": 0})
        cage = await db.cages.find_one({"id": pair["cage_id"]}, {"_id": 0}) if pair else None
        
        pair_name = pair.get("name") if pair else "Unknown"
        cage_label = cage.get("label") if cage else "Unknown"
        clutch_status = clutch.get("status", "")
        
        # Check which eggs have been banded
        eggs = clutch.get("eggs", [])
        hatched_eggs = [e for e in eggs if e.get("status") == "hatched"]
        banded_eggs = [e for e in eggs if e.get("banded_date")]
        
        # HATCHING task: only show if status is INCUBATING (not yet hatched)
        if clutch.get("expected_hatch_date") and clutch_status == ClutchStatus.INCUBATING:
            tasks.append(Task(
                id=f"hatch-{clutch['id']}",
                type="hatching",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch["expected_hatch_date"],
                details=f"Expected hatching - {len(eggs)} eggs"
            ))
        
        # BANDING task: only show if status is HATCHING and there are hatched eggs not yet banded
        if clutch.get("expected_band_date") and clutch_status == ClutchStatus.HATCHING:
            unbanded_hatched = len(hatched_eggs) - len(banded_eggs)
            if unbanded_hatched > 0:
                tasks.append(Task(
                    id=f"band-{clutch['id']}",
                    type="banding",
                    pair_id=clutch["pair_id"],
                    pair_name=pair_name,
                    cage_label=cage_label,
                    due_date=clutch["expected_band_date"],
                    details=f"Banding due - {unbanded_hatched} chicks to band"
                ))
        
        # WEANING task: only show if status is WEANING (after banding, before completed)
        if clutch.get("expected_wean_date") and clutch_status == ClutchStatus.WEANING:
            tasks.append(Task(
                id=f"wean-{clutch['id']}",
                type="weaning",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch["expected_wean_date"],
                details=f"Weaning due - {len(banded_eggs)} chicks"
            ))
        
        # Active laying/incubating status tasks
        if clutch_status == ClutchStatus.LAYING:
            tasks.append(Task(
                id=f"laying-{clutch['id']}",
                type="laying",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=today,
                details=f"Currently laying - {len(eggs)} eggs"
            ))
        elif clutch_status == ClutchStatus.INCUBATING:
            tasks.append(Task(
                id=f"incubating-{clutch['id']}",
                type="incubation",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch.get("expected_hatch_date", today),
                details=f"Incubating - {len(eggs)} eggs"
            ))
    
    # Sort by due date
    tasks.sort(key=lambda x: x.due_date)
    return tasks

# ============ TASK HISTORY API ============
@api_router.get("/dashboard/task-history", response_model=List[TaskHistory])
async def get_task_history(current_user: dict = Depends(get_current_user)):
    """Get history of completed/dismissed tasks for the active season"""
    active_season_id = await get_active_season_id(current_user["id"])
    user_filter = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    if active_season_id:
        query = {
            "$and": [
                user_filter,
                {"$or": [{"season_id": active_season_id}, {"season_id": None}, {"season_id": {"$exists": False}}]}
            ]
        }
    else:
        query = user_filter
    
    history = await db.task_history.find(query, {"_id": 0}).sort("completed_at", -1).to_list(100)
    return history

@api_router.post("/dashboard/task-history")
async def add_task_to_history(task: TaskHistory, current_user: dict = Depends(get_current_user)):
    """Add a task to history when it's completed or dismissed"""
    active_season_id = await get_active_season_id(current_user["id"])
    
    task_dict = task.model_dump()
    task_dict["user_id"] = current_user["id"]
    task_dict["season_id"] = active_season_id
    
    await db.task_history.insert_one(task_dict)
    return {"message": "Task added to history"}

@api_router.delete("/dashboard/task-history/{task_id}")
async def remove_from_history(task_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a task from history"""
    result = await db.task_history.delete_one({
        "id": task_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found in history")
    return {"message": "Task removed from history"}

# ============ DAILY EMAIL REPORT ============
@api_router.post("/dashboard/send-daily-report")
async def send_daily_report(background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    """Send daily task report via email"""
    # Get tasks for today
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    active_season_id = await get_active_season_id(current_user["id"])
    user_filter = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    if active_season_id:
        season_filter = {
            "$and": [
                user_filter,
                {"season_id": active_season_id}
            ]
        }
    else:
        season_filter = user_filter
    
    # Get all active clutches
    clutches = await db.clutches.find({**season_filter, "status": {"$ne": ClutchStatus.COMPLETED}}, {"_id": 0}).to_list(1000)
    
    tasks = []
    for clutch in clutches:
        pair = await db.pairs.find_one({"id": clutch["pair_id"]}, {"_id": 0})
        cage = await db.cages.find_one({"id": pair["cage_id"]}, {"_id": 0}) if pair else None
        
        pair_name = pair.get("name") if pair else "Unknown"
        cage_label = cage.get("label") if cage else "Unknown"
        clutch_status = clutch.get("status", "")
        eggs = clutch.get("eggs", [])
        hatched_eggs = [e for e in eggs if e.get("status") == "hatched"]
        banded_eggs = [e for e in eggs if e.get("banded_date")]
        
        # HATCHING task
        if clutch.get("expected_hatch_date") and clutch_status == ClutchStatus.INCUBATING:
            tasks.append({
                "type": "Hatching",
                "pair_name": pair_name,
                "cage_label": cage_label,
                "due_date": clutch["expected_hatch_date"],
                "details": f"Expected hatching - {len(eggs)} eggs"
            })
        
        # BANDING task
        if clutch.get("expected_band_date") and clutch_status == ClutchStatus.HATCHING:
            unbanded_hatched = len(hatched_eggs) - len(banded_eggs)
            if unbanded_hatched > 0:
                tasks.append({
                    "type": "Banding",
                    "pair_name": pair_name,
                    "cage_label": cage_label,
                    "due_date": clutch["expected_band_date"],
                    "details": f"Banding due - {unbanded_hatched} chicks"
                })
        
        # WEANING task
        if clutch.get("expected_wean_date") and clutch_status == ClutchStatus.WEANING:
            tasks.append({
                "type": "Weaning",
                "pair_name": pair_name,
                "cage_label": cage_label,
                "due_date": clutch["expected_wean_date"],
                "details": f"Weaning due - {len(banded_eggs)} chicks"
            })
        
        # Current status tasks
        if clutch_status == ClutchStatus.LAYING:
            tasks.append({
                "type": "Laying",
                "pair_name": pair_name,
                "cage_label": cage_label,
                "due_date": today,
                "details": f"Currently laying - {len(eggs)} eggs"
            })
        elif clutch_status == ClutchStatus.INCUBATING:
            tasks.append({
                "type": "Incubation",
                "pair_name": pair_name,
                "cage_label": cage_label,
                "due_date": clutch.get("expected_hatch_date", today),
                "details": f"Incubating - {len(eggs)} eggs"
            })
    
    # Also get manual tasks
    manual_tasks = await db.manual_tasks.find({
        "completed": {"$ne": True},
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(100)
    
    for mt in manual_tasks:
        tasks.append({
            "type": "Manual",
            "pair_name": mt.get("title", ""),
            "cage_label": "",
            "due_date": mt.get("due_date", today),
            "details": mt.get("description", "")
        })
    
    # Sort tasks by due date
    tasks.sort(key=lambda x: x["due_date"])
    
    # Filter for today and overdue
    def parse_date(d):
        try:
            return datetime.strptime(d, "%Y-%m-%d").date()
        except:
            return None
    
    today_date = datetime.now(timezone.utc).date()
    today_tasks = [t for t in tasks if parse_date(t["due_date"]) == today_date]
    overdue_tasks = [t for t in tasks if parse_date(t["due_date"]) and parse_date(t["due_date"]) < today_date]
    upcoming_tasks = [t for t in tasks if parse_date(t["due_date"]) and parse_date(t["due_date"]) > today_date][:10]  # Next 10
    
    # Build email content
    email_body = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; background-color: #1A2035; color: #ffffff; padding: 20px; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #202940; border-radius: 10px; padding: 20px; }}
            h1 {{ color: #FFC300; }}
            h2 {{ color: #00BFA6; border-bottom: 1px solid #333; padding-bottom: 10px; }}
            .task {{ background-color: #1A2035; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #FFC300; }}
            .task-type {{ color: #FFC300; font-weight: bold; text-transform: uppercase; font-size: 12px; }}
            .task-pair {{ color: #ffffff; font-size: 16px; margin: 5px 0; }}
            .task-details {{ color: #94a3b8; font-size: 14px; }}
            .overdue {{ border-left-color: #E91E63 !important; }}
            .overdue .task-type {{ color: #E91E63; }}
            .empty {{ color: #64748b; text-align: center; padding: 20px; }}
            .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🐤 OrniTuga - Daily Task Report</h1>
            <p style="color: #94a3b8;">Report for {today}</p>
            
            <h2>⚠️ Overdue ({len(overdue_tasks)})</h2>
    """
    
    if overdue_tasks:
        for t in overdue_tasks:
            email_body += f"""
            <div class="task overdue">
                <div class="task-type">{t['type']}</div>
                <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                <div class="task-details">{t['details']} | Due: {t['due_date']}</div>
            </div>
            """
    else:
        email_body += '<p class="empty">No overdue tasks</p>'
    
    email_body += f"""
            <h2>📅 Today ({len(today_tasks)})</h2>
    """
    
    if today_tasks:
        for t in today_tasks:
            email_body += f"""
            <div class="task">
                <div class="task-type">{t['type']}</div>
                <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                <div class="task-details">{t['details']}</div>
            </div>
            """
    else:
        email_body += '<p class="empty">No tasks for today</p>'
    
    email_body += f"""
            <h2>📆 Upcoming ({len(upcoming_tasks)})</h2>
    """
    
    if upcoming_tasks:
        for t in upcoming_tasks:
            email_body += f"""
            <div class="task">
                <div class="task-type">{t['type']}</div>
                <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                <div class="task-details">{t['details']} | Due: {t['due_date']}</div>
            </div>
            """
    else:
        email_body += '<p class="empty">No upcoming tasks</p>'
    
    email_body += """
            <div class="footer">
                <p>OrniTuga - Canary Breeding Management</p>
                <p>This is an automated daily report.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Get SMTP settings
    email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    smtp_email = email_settings.get("smtp_email") if email_settings else SMTP_EMAIL
    smtp_password = email_settings.get("smtp_password") if email_settings else SMTP_PASSWORD
    
    if not smtp_email or not smtp_password:
        raise HTTPException(status_code=400, detail="Email settings not configured. Please configure SMTP in Settings.")
    
    # Send email
    background_tasks.add_task(
        send_email_notification,
        current_user["email"],
        f"OrniTuga - Daily Task Report ({today})",
        email_body,
        smtp_email,
        smtp_password
    )
    
    return {
        "message": "Daily report sent",
        "recipient": current_user["email"],
        "tasks_count": {
            "overdue": len(overdue_tasks),
            "today": len(today_tasks),
            "upcoming": len(upcoming_tasks)
        }
    }

# ============ AUTOMATIC DAILY REPORT SCHEDULER ============
scheduler = AsyncIOScheduler()

async def send_daily_reports_job():
    """Background job to send daily reports to all users with the feature enabled"""
    logger.info("Starting automatic daily report job...")
    
    try:
        # Get all users with daily reports enabled
        users_with_reports = []
        
        # Get all email settings with daily_report_enabled
        async for settings in db.settings.find({"type": "email", "daily_report_enabled": True}, {"_id": 0}):
            users_with_reports.append(settings)
        
        logger.info(f"Found {len(users_with_reports)} users with daily reports enabled")
        
        for email_setting in users_with_reports:
            try:
                user_id = email_setting.get("user_id")
                if not user_id:
                    continue
                
                user = await db.users.find_one({"id": user_id}, {"_id": 0})
                if not user:
                    continue
                
                notification_email = email_setting.get("notification_email") or user.get("email")
                if not notification_email:
                    continue
                
                # Get active season for this user
                active_season_id = None
                season = await db.seasons.find_one({
                    "is_active": True,
                    "$or": [{"user_id": user_id}, {"user_id": None}, {"user_id": {"$exists": False}}]
                }, {"_id": 0})
                if season:
                    active_season_id = season.get("id")
                
                user_filter = {"$or": [{"user_id": user_id}, {"user_id": None}, {"user_id": {"$exists": False}}]}
                
                if active_season_id:
                    season_filter = {
                        "$and": [
                            user_filter,
                            {"season_id": active_season_id}
                        ]
                    }
                else:
                    season_filter = user_filter
                
                today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                
                # Get all active clutches for this user
                clutches = await db.clutches.find({**season_filter, "status": {"$ne": ClutchStatus.COMPLETED}}, {"_id": 0}).to_list(1000)
                
                tasks = []
                for clutch in clutches:
                    pair = await db.pairs.find_one({"id": clutch["pair_id"]}, {"_id": 0})
                    cage = await db.cages.find_one({"id": pair["cage_id"]}, {"_id": 0}) if pair else None
                    
                    pair_name = pair.get("name") if pair else "Unknown"
                    cage_label = cage.get("label") if cage else "Unknown"
                    clutch_status = clutch.get("status", "")
                    eggs = clutch.get("eggs", [])
                    hatched_eggs = [e for e in eggs if e.get("status") == "hatched"]
                    banded_eggs = [e for e in eggs if e.get("banded_date")]
                    
                    if clutch.get("expected_hatch_date") and clutch_status == ClutchStatus.INCUBATING:
                        tasks.append({
                            "type": "Hatching",
                            "pair_name": pair_name,
                            "cage_label": cage_label,
                            "due_date": clutch["expected_hatch_date"],
                            "details": f"Expected hatching - {len(eggs)} eggs"
                        })
                    
                    if clutch.get("expected_band_date") and clutch_status == ClutchStatus.HATCHING:
                        unbanded_hatched = len(hatched_eggs) - len(banded_eggs)
                        if unbanded_hatched > 0:
                            tasks.append({
                                "type": "Banding",
                                "pair_name": pair_name,
                                "cage_label": cage_label,
                                "due_date": clutch["expected_band_date"],
                                "details": f"Banding due - {unbanded_hatched} chicks"
                            })
                    
                    if clutch.get("expected_wean_date") and clutch_status == ClutchStatus.WEANING:
                        tasks.append({
                            "type": "Weaning",
                            "pair_name": pair_name,
                            "cage_label": cage_label,
                            "due_date": clutch["expected_wean_date"],
                            "details": f"Weaning due - {len(banded_eggs)} chicks"
                        })
                    
                    if clutch_status == ClutchStatus.LAYING:
                        tasks.append({
                            "type": "Laying",
                            "pair_name": pair_name,
                            "cage_label": cage_label,
                            "due_date": today,
                            "details": f"Currently laying - {len(eggs)} eggs"
                        })
                    elif clutch_status == ClutchStatus.INCUBATING:
                        tasks.append({
                            "type": "Incubation",
                            "pair_name": pair_name,
                            "cage_label": cage_label,
                            "due_date": clutch.get("expected_hatch_date", today),
                            "details": f"Incubating - {len(eggs)} eggs"
                        })
                
                # Also get manual tasks
                manual_tasks = await db.manual_tasks.find({
                    "completed": {"$ne": True},
                    "$or": [{"user_id": user_id}, {"user_id": None}, {"user_id": {"$exists": False}}]
                }, {"_id": 0}).to_list(100)
                
                for mt in manual_tasks:
                    tasks.append({
                        "type": "Manual",
                        "pair_name": mt.get("title", ""),
                        "cage_label": "",
                        "due_date": mt.get("due_date", today),
                        "details": mt.get("description", "")
                    })
                
                tasks.sort(key=lambda x: x["due_date"])
                
                def parse_date(d):
                    try:
                        return datetime.strptime(d, "%Y-%m-%d").date()
                    except:
                        return None
                
                today_date = datetime.now(timezone.utc).date()
                today_tasks = [t for t in tasks if parse_date(t["due_date"]) == today_date]
                overdue_tasks = [t for t in tasks if parse_date(t["due_date"]) and parse_date(t["due_date"]) < today_date]
                upcoming_tasks = [t for t in tasks if parse_date(t["due_date"]) and parse_date(t["due_date"]) > today_date][:10]
                
                # Build email content
                email_body = f"""
                <html>
                <head>
                    <style>
                        body {{ font-family: Arial, sans-serif; background-color: #1A2035; color: #ffffff; padding: 20px; }}
                        .container {{ max-width: 600px; margin: 0 auto; background-color: #202940; border-radius: 10px; padding: 20px; }}
                        h1 {{ color: #FFC300; }}
                        h2 {{ color: #00BFA6; border-bottom: 1px solid #333; padding-bottom: 10px; }}
                        .task {{ background-color: #1A2035; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #FFC300; }}
                        .task-type {{ color: #FFC300; font-weight: bold; text-transform: uppercase; font-size: 12px; }}
                        .task-pair {{ color: #ffffff; font-size: 16px; margin: 5px 0; }}
                        .task-details {{ color: #94a3b8; font-size: 14px; }}
                        .overdue {{ border-left-color: #E91E63 !important; }}
                        .overdue .task-type {{ color: #E91E63; }}
                        .empty {{ color: #64748b; text-align: center; padding: 20px; }}
                        .footer {{ text-align: center; color: #64748b; font-size: 12px; margin-top: 20px; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🐤 OrniTuga - Daily Task Report</h1>
                        <p style="color: #94a3b8;">Report for {today} | Season: {season.get('year') if season else 'N/A'}</p>
                        
                        <h2>⚠️ Overdue ({len(overdue_tasks)})</h2>
                """
                
                if overdue_tasks:
                    for t in overdue_tasks:
                        email_body += f"""
                        <div class="task overdue">
                            <div class="task-type">{t['type']}</div>
                            <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                            <div class="task-details">{t['details']} | Due: {t['due_date']}</div>
                        </div>
                        """
                else:
                    email_body += '<p class="empty">No overdue tasks</p>'
                
                email_body += f"""
                        <h2>📅 Today ({len(today_tasks)})</h2>
                """
                
                if today_tasks:
                    for t in today_tasks:
                        email_body += f"""
                        <div class="task">
                            <div class="task-type">{t['type']}</div>
                            <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                            <div class="task-details">{t['details']}</div>
                        </div>
                        """
                else:
                    email_body += '<p class="empty">No tasks for today</p>'
                
                email_body += f"""
                        <h2>📆 Upcoming ({len(upcoming_tasks)})</h2>
                """
                
                if upcoming_tasks:
                    for t in upcoming_tasks:
                        email_body += f"""
                        <div class="task">
                            <div class="task-type">{t['type']}</div>
                            <div class="task-pair">{t['pair_name']} - {t['cage_label']}</div>
                            <div class="task-details">{t['details']} | Due: {t['due_date']}</div>
                        </div>
                        """
                else:
                    email_body += '<p class="empty">No upcoming tasks</p>'
                
                email_body += """
                        <div class="footer">
                            <p>OrniTuga - Canary Breeding Management</p>
                            <p>This is an automated daily report. Configure in Settings.</p>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                # Get SMTP credentials
                smtp_email = email_setting.get("smtp_email") or SMTP_EMAIL
                smtp_password = email_setting.get("smtp_password") or SMTP_PASSWORD
                
                if smtp_email and smtp_password:
                    await send_email_notification(
                        notification_email,
                        f"OrniTuga - Daily Task Report ({today})",
                        email_body,
                        smtp_email,
                        smtp_password
                    )
                    logger.info(f"Daily report sent to {notification_email}")
                
            except Exception as e:
                logger.error(f"Error sending daily report to user: {e}")
                continue
        
        logger.info("Daily report job completed")
    except Exception as e:
        logger.error(f"Error in daily report job: {e}")

def schedule_daily_reports():
    """Schedule daily report jobs for all users"""
    # Remove any existing jobs
    scheduler.remove_all_jobs()
    
    # Add a job that runs every hour to check if reports need to be sent
    # This allows for flexible per-user report times
    scheduler.add_job(
        send_daily_reports_job,
        CronTrigger(minute=0),  # Run at the start of every hour
        id='daily_reports_check',
        replace_existing=True
    )
    
    logger.info("Daily report scheduler configured")

# ============ BREEDING STATISTICS API ============
class BreedingStats(BaseModel):
    total_eggs: int = 0
    fertile_eggs: int = 0
    infertile_eggs: int = 0
    hatched_eggs: int = 0
    dead_eggs: int = 0
    fertility_rate: float = 0.0
    hatch_rate: float = 0.0
    survival_rate: float = 0.0
    total_clutches: int = 0
    completed_clutches: int = 0
    active_clutches: int = 0
    avg_eggs_per_clutch: float = 0.0
    avg_hatched_per_clutch: float = 0.0

@api_router.get("/reports/breeding-stats", response_model=BreedingStats)
async def get_breeding_stats():
    """Get comprehensive breeding statistics"""
    clutches = await db.clutches.find({}, {"_id": 0}).to_list(10000)
    
    total_eggs = 0
    fertile_eggs = 0
    infertile_eggs = 0
    hatched_eggs = 0
    dead_eggs = 0
    completed_clutches = 0
    active_clutches = 0
    total_hatched_per_clutch = []
    
    for clutch in clutches:
        eggs = clutch.get("eggs", [])
        total_eggs += len(eggs)
        clutch_hatched = 0
        
        for egg in eggs:
            status = egg.get("status", "fresh")
            if status == "fertile":
                fertile_eggs += 1
            elif status == "infertile":
                infertile_eggs += 1
            elif status == "hatched":
                hatched_eggs += 1
                clutch_hatched += 1
            elif status == "dead":
                dead_eggs += 1
        
        if clutch.get("status") == "completed":
            completed_clutches += 1
            total_hatched_per_clutch.append(clutch_hatched)
        else:
            active_clutches += 1
    
    # Calculate rates (prevent division by zero)
    fertility_rate = (fertile_eggs + hatched_eggs) / total_eggs * 100 if total_eggs > 0 else 0
    hatch_rate = hatched_eggs / (fertile_eggs + hatched_eggs) * 100 if (fertile_eggs + hatched_eggs) > 0 else 0
    survival_rate = hatched_eggs / total_eggs * 100 if total_eggs > 0 else 0
    avg_eggs_per_clutch = total_eggs / len(clutches) if clutches else 0
    avg_hatched_per_clutch = sum(total_hatched_per_clutch) / len(total_hatched_per_clutch) if total_hatched_per_clutch else 0
    
    return BreedingStats(
        total_eggs=total_eggs,
        fertile_eggs=fertile_eggs,
        infertile_eggs=infertile_eggs,
        hatched_eggs=hatched_eggs,
        dead_eggs=dead_eggs,
        fertility_rate=round(fertility_rate, 1),
        hatch_rate=round(hatch_rate, 1),
        survival_rate=round(survival_rate, 1),
        total_clutches=len(clutches),
        completed_clutches=completed_clutches,
        active_clutches=active_clutches,
        avg_eggs_per_clutch=round(avg_eggs_per_clutch, 1),
        avg_hatched_per_clutch=round(avg_hatched_per_clutch, 1)
    )

@api_router.get("/reports/breeding-trends")
async def get_breeding_trends():
    """Get monthly breeding performance trends"""
    clutches = await db.clutches.find({}, {"_id": 0}).to_list(10000)
    
    # Group clutches by month
    monthly_data = {}
    
    for clutch in clutches:
        # Use start_date or created_at
        date_str = clutch.get("start_date") or clutch.get("created_at", "")[:10]
        if not date_str:
            continue
            
        # Extract year-month
        year_month = date_str[:7]  # YYYY-MM
        
        if year_month not in monthly_data:
            monthly_data[year_month] = {
                "total_eggs": 0,
                "fertile_eggs": 0,
                "hatched_eggs": 0,
                "infertile_eggs": 0,
                "clutches": 0
            }
        
        monthly_data[year_month]["clutches"] += 1
        
        for egg in clutch.get("eggs", []):
            monthly_data[year_month]["total_eggs"] += 1
            status = egg.get("status", "fresh")
            if status == "fertile":
                monthly_data[year_month]["fertile_eggs"] += 1
            elif status == "hatched":
                monthly_data[year_month]["hatched_eggs"] += 1
                monthly_data[year_month]["fertile_eggs"] += 1  # hatched counts as fertile
            elif status == "infertile":
                monthly_data[year_month]["infertile_eggs"] += 1
    
    # Calculate rates and format for chart
    trends = []
    for month, data in sorted(monthly_data.items()):
        fertility_rate = (data["fertile_eggs"] / data["total_eggs"] * 100) if data["total_eggs"] > 0 else 0
        hatch_rate = (data["hatched_eggs"] / data["fertile_eggs"] * 100) if data["fertile_eggs"] > 0 else 0
        
        trends.append({
            "month": month,
            "total_eggs": data["total_eggs"],
            "fertile_eggs": data["fertile_eggs"],
            "hatched_eggs": data["hatched_eggs"],
            "clutches": data["clutches"],
            "fertility_rate": round(fertility_rate, 1),
            "hatch_rate": round(hatch_rate, 1)
        })
    
    return trends

# ============ GENEALOGY API ============
class BirdWithParents(BaseModel):
    id: str
    band_number: str
    band_year: int
    gender: str
    stam: Optional[str] = None
    class_id: Optional[str] = None
    parent_male: Optional[dict] = None
    parent_female: Optional[dict] = None
    children: List[dict] = []

@api_router.get("/birds/{bird_id}/genealogy")
async def get_bird_genealogy(bird_id: str):
    """Get genealogy tree for a bird (parents and children)"""
    bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    
    result = {
        "bird": bird,
        "parents": {
            "male": None,
            "female": None
        },
        "grandparents": {
            "paternal": {"male": None, "female": None},
            "maternal": {"male": None, "female": None}
        },
        "children": [],
        "siblings": []
    }
    
    # Get parents
    if bird.get("parent_male_id"):
        parent_male = await db.birds.find_one({"id": bird["parent_male_id"]}, {"_id": 0})
        result["parents"]["male"] = parent_male
        # Get paternal grandparents
        if parent_male:
            if parent_male.get("parent_male_id"):
                gp = await db.birds.find_one({"id": parent_male["parent_male_id"]}, {"_id": 0})
                result["grandparents"]["paternal"]["male"] = gp
            if parent_male.get("parent_female_id"):
                gp = await db.birds.find_one({"id": parent_male["parent_female_id"]}, {"_id": 0})
                result["grandparents"]["paternal"]["female"] = gp
    
    if bird.get("parent_female_id"):
        parent_female = await db.birds.find_one({"id": bird["parent_female_id"]}, {"_id": 0})
        result["parents"]["female"] = parent_female
        # Get maternal grandparents
        if parent_female:
            if parent_female.get("parent_male_id"):
                gp = await db.birds.find_one({"id": parent_female["parent_male_id"]}, {"_id": 0})
                result["grandparents"]["maternal"]["male"] = gp
            if parent_female.get("parent_female_id"):
                gp = await db.birds.find_one({"id": parent_female["parent_female_id"]}, {"_id": 0})
                result["grandparents"]["maternal"]["female"] = gp
    
    # Get children
    children = await db.birds.find({
        "$or": [
            {"parent_male_id": bird_id},
            {"parent_female_id": bird_id}
        ]
    }, {"_id": 0}).to_list(1000)
    result["children"] = children
    
    # Get siblings (same parents)
    if bird.get("parent_male_id") or bird.get("parent_female_id"):
        siblings_query = {"id": {"$ne": bird_id}}
        if bird.get("parent_male_id"):
            siblings_query["parent_male_id"] = bird["parent_male_id"]
        if bird.get("parent_female_id"):
            siblings_query["parent_female_id"] = bird["parent_female_id"]
        siblings = await db.birds.find(siblings_query, {"_id": 0}).to_list(1000)
        result["siblings"] = siblings
    
    return result

# ============ EXPORT API ============
from io import BytesIO, StringIO
import csv
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

@api_router.get("/export/birds/csv")
async def export_birds_csv():
    """Export birds list to CSV"""
    birds = await db.birds.find({}, {"_id": 0}).to_list(10000)
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Band Number', 'Year', 'Gender', 'STAM', 'Class ID', 'Species', 'Notes', 'Birth Date', 'Created'])
    
    # Data
    for bird in birds:
        writer.writerow([
            bird.get('band_number', ''),
            bird.get('band_year', ''),
            bird.get('gender', ''),
            bird.get('stam', ''),
            bird.get('class_id', ''),
            bird.get('species', ''),
            bird.get('notes', ''),
            bird.get('birth_date', ''),
            bird.get('created_at', '')[:10] if bird.get('created_at') else ''
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=birds_export.csv"}
    )

@api_router.get("/export/birds/pdf")
async def export_birds_pdf():
    """Export birds list to PDF"""
    birds = await db.birds.find({}, {"_id": 0}).to_list(10000)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=1*cm, leftMargin=1*cm, topMargin=1*cm, bottomMargin=1*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=18, textColor=colors.HexColor('#1A2035'))
    elements.append(Paragraph('Canary Control - Bird Registry', title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Table data
    data = [['Band', 'Year', 'Gender', 'STAM', 'Class', 'Species']]
    for bird in birds:
        data.append([
            bird.get('band_number', '')[:15],
            str(bird.get('band_year', '')),
            bird.get('gender', '').capitalize(),
            bird.get('stam', '')[:15] if bird.get('stam') else '-',
            bird.get('class_id', '') or '-',
            bird.get('species', '')[:15]
        ])
    
    # Create table
    table = Table(data, colWidths=[3*cm, 2*cm, 2*cm, 4*cm, 2*cm, 3*cm])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A2035')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#F5F5F5')),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.HexColor('#333333')),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F8F8')]),
    ]))
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=birds_export.pdf"}
    )

@api_router.get("/export/breeding-report/csv")
async def export_breeding_report_csv():
    """Export breeding report to CSV"""
    pairs = await db.pairs.find({}, {"_id": 0}).to_list(10000)
    birds = await db.birds.find({}, {"_id": 0}).to_list(10000)
    clutches = await db.clutches.find({}, {"_id": 0}).to_list(10000)
    
    birds_dict = {b["id"]: b for b in birds}
    
    output = StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Pair Name', 'Male Band', 'Female Band', 'Clutch Date', 'Status', 'Total Eggs', 'Fertile', 'Hatched', 'Hatch Rate'])
    
    # Data
    for pair in pairs:
        male = birds_dict.get(pair.get("male_id"), {})
        female = birds_dict.get(pair.get("female_id"), {})
        pair_clutches = [c for c in clutches if c.get("pair_id") == pair["id"]]
        
        for clutch in pair_clutches:
            eggs = clutch.get("eggs", [])
            total = len(eggs)
            fertile = sum(1 for e in eggs if e.get("status") in ["fertile", "hatched"])
            hatched = sum(1 for e in eggs if e.get("status") == "hatched")
            hatch_rate = f"{(hatched/fertile*100):.0f}%" if fertile > 0 else "N/A"
            
            writer.writerow([
                pair.get('name', f"Pair {pair['id'][:6]}"),
                male.get('band_number', 'N/A'),
                female.get('band_number', 'N/A'),
                clutch.get('start_date', ''),
                clutch.get('status', ''),
                total,
                fertile,
                hatched,
                hatch_rate
            ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=breeding_report.csv"}
    )

@api_router.get("/export/breeding-report/pdf")
async def export_breeding_report_pdf():
    """Export breeding statistics report to PDF"""
    stats = await get_breeding_stats()
    pairs = await db.pairs.find({}, {"_id": 0}).to_list(10000)
    birds = await db.birds.find({}, {"_id": 0}).to_list(10000)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, textColor=colors.HexColor('#1A2035'), spaceAfter=20)
    elements.append(Paragraph('Breeding Statistics Report', title_style))
    elements.append(Spacer(1, 0.5*cm))
    
    # Stats summary
    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#333333'), spaceBefore=15, spaceAfter=10)
    elements.append(Paragraph('Overview', subtitle_style))
    
    stats_data = [
        ['Metric', 'Value'],
        ['Total Birds', str(len(birds))],
        ['Active Pairs', str(len([p for p in pairs if p.get('is_active')]))],
        ['Total Clutches', str(stats.total_clutches)],
        ['Total Eggs', str(stats.total_eggs)],
        ['Hatched Chicks', str(stats.hatched_eggs)],
    ]
    
    stats_table = Table(stats_data, colWidths=[8*cm, 4*cm])
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1A2035')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 1*cm))
    
    # Performance metrics
    elements.append(Paragraph('Performance Metrics', subtitle_style))
    
    perf_data = [
        ['Metric', 'Rate'],
        ['Fertility Rate', f"{stats.fertility_rate}%"],
        ['Hatch Rate', f"{stats.hatch_rate}%"],
        ['Survival Rate', f"{stats.survival_rate}%"],
        ['Avg Eggs/Clutch', f"{stats.avg_eggs_per_clutch}"],
        ['Avg Hatched/Clutch', f"{stats.avg_hatched_per_clutch}"],
    ]
    
    perf_table = Table(perf_data, colWidths=[8*cm, 4*cm])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#00BFA6')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#DDDDDD')),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
    ]))
    elements.append(perf_table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=breeding_report.pdf"}
    )

# ============ BACKUP & RESTORE API ============
@api_router.get("/backup/create")
async def create_backup():
    """Create a full database backup as JSON"""
    try:
        # Collections to backup
        collections = ['birds', 'pairs', 'clutches', 'zones', 'cages', 'contacts', 'seasons', 'settings', 'manual_tasks']
        
        backup_data = {
            "backup_date": datetime.now(timezone.utc).isoformat(),
            "version": "1.0.0",
            "collections": {}
        }
        
        for collection_name in collections:
            collection = db[collection_name]
            docs = await collection.find({}, {"_id": 0}).to_list(100000)
            backup_data["collections"][collection_name] = docs
        
        # Create JSON backup
        json_content = json.dumps(backup_data, ensure_ascii=False, indent=2)
        
        # Create filename with date
        filename = f"ornituga_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        return StreamingResponse(
            iter([json_content]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logging.error(f"Backup failed: {e}")
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

@api_router.post("/backup/restore")
async def restore_backup(file: UploadFile = File(...)):
    """Restore database from a JSON backup file"""
    try:
        # Read and parse the backup file
        content = await file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        # Validate backup structure
        if "collections" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        # Collections to restore
        collections = ['birds', 'pairs', 'clutches', 'zones', 'cages', 'contacts', 'seasons', 'settings', 'manual_tasks']
        
        restored_counts = {}
        
        for collection_name in collections:
            if collection_name in backup_data["collections"]:
                collection = db[collection_name]
                docs = backup_data["collections"][collection_name]
                
                if docs:
                    # Clear existing data
                    await collection.delete_many({})
                    # Insert backup data
                    await collection.insert_many(docs)
                    restored_counts[collection_name] = len(docs)
                else:
                    # Clear collection if backup has empty array
                    await collection.delete_many({})
                    restored_counts[collection_name] = 0
        
        return {
            "message": "Backup restored successfully",
            "backup_date": backup_data.get("backup_date", "Unknown"),
            "restored_counts": restored_counts
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        logging.error(f"Restore failed: {e}")
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Canary Breeding Control API", "version": "1.0.0"}

# ============ SEASONS API ============
@api_router.get("/seasons", response_model=List[Season])
async def get_seasons(current_user: dict = Depends(get_current_user)):
    seasons = await db.seasons.find({
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0}).to_list(100)
    return seasons

@api_router.post("/seasons", response_model=Season)
async def create_season(input: SeasonCreate, current_user: dict = Depends(get_current_user)):
    # Check if a season with this year already exists for this user
    existing_season = await db.seasons.find_one({
        "year": input.year,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if existing_season:
        raise HTTPException(
            status_code=400, 
            detail=f"A season for year {input.year} already exists. Each year must be unique."
        )
    
    # If this season is set as active, deactivate all others for this user
    if input.is_active:
        await db.seasons.update_many({
            "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
        }, {"$set": {"is_active": False}})
    
    season = Season(**input.model_dump(), user_id=current_user["id"])
    await db.seasons.insert_one(season.model_dump())
    return season

@api_router.put("/seasons/{season_id}", response_model=Season)
async def update_season(season_id: str, input: SeasonCreate, current_user: dict = Depends(get_current_user)):
    # If this season is set as active, deactivate all others for this user
    if input.is_active:
        await db.seasons.update_many({
            "id": {"$ne": season_id},
            "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
        }, {"$set": {"is_active": False}})
    
    await db.seasons.update_one(
        {"id": season_id},
        {"$set": input.model_dump()}
    )
    updated = await db.seasons.find_one({"id": season_id}, {"_id": 0})
    if not updated:
        raise HTTPException(status_code=404, detail="Season not found")
    return updated

@api_router.delete("/seasons/{season_id}")
async def delete_season(season_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.seasons.delete_one({
        "id": season_id,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Season not found")
    return {"message": "Season deleted"}

@api_router.get("/seasons/active")
async def get_active_season(current_user: dict = Depends(get_current_user)):
    """Get the currently active season"""
    season = await db.seasons.find_one({
        "is_active": True,
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"_id": 0})
    if not season:
        # Return current year as default if no active season
        current_year = datetime.now().year
        return {"year": current_year, "name": str(current_year), "is_active": True}
    return season

@api_router.post("/seasons/{season_id}/activate")
async def activate_season(season_id: str, current_user: dict = Depends(get_current_user)):
    """Set a season as the active one"""
    # Deactivate all seasons for this user
    await db.seasons.update_many({
        "$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]
    }, {"$set": {"is_active": False}})
    # Activate the selected one
    result = await db.seasons.update_one({"id": season_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Season not found")
    return {"message": "Season activated"}

# ============ YEAR-OVER-YEAR COMPARISON API ============
@api_router.get("/reports/year-comparison")
async def get_year_comparison(year1: int = None, year2: int = None, current_user: dict = Depends(get_current_user)):
    """Compare breeding statistics between two years"""
    current_year = datetime.now().year
    year1 = year1 or current_year - 1
    year2 = year2 or current_year
    user_filter = {"$or": [{"user_id": current_user["id"]}, {"user_id": None}, {"user_id": {"$exists": False}}]}
    
    async def get_year_stats(year: int):
        # Get clutches for the year
        clutches = await db.clutches.find(user_filter, {"_id": 0}).to_list(10000)
        year_clutches = [c for c in clutches if c.get("start_date", "").startswith(str(year))]
        
        total_eggs = 0
        fertile_eggs = 0
        hatched_eggs = 0
        infertile_eggs = 0
        
        for clutch in year_clutches:
            for egg in clutch.get("eggs", []):
                total_eggs += 1
                status = egg.get("status", "fresh")
                if status == "fertile":
                    fertile_eggs += 1
                elif status == "hatched":
                    hatched_eggs += 1
                    fertile_eggs += 1
                elif status == "infertile":
                    infertile_eggs += 1
        
        fertility_rate = (fertile_eggs / total_eggs * 100) if total_eggs > 0 else 0
        hatch_rate = (hatched_eggs / fertile_eggs * 100) if fertile_eggs > 0 else 0
        
        # Get pairs for the year
        pairs = await db.pairs.find({}, {"_id": 0}).to_list(10000)
        year_pairs = [p for p in pairs if p.get("created_at", "").startswith(str(year)) or p.get("season_id") == str(year)]
        
        # Get birds born in this year
        birds = await db.birds.find({"band_year": year}, {"_id": 0}).to_list(10000)
        
        return {
            "year": year,
            "total_pairs": len(year_pairs) if year_pairs else len([p for p in pairs if p.get("is_active")]),
            "total_clutches": len(year_clutches),
            "total_eggs": total_eggs,
            "fertile_eggs": fertile_eggs,
            "hatched_eggs": hatched_eggs,
            "infertile_eggs": infertile_eggs,
            "fertility_rate": round(fertility_rate, 1),
            "hatch_rate": round(hatch_rate, 1),
            "birds_born": len(birds)
        }
    
    stats1 = await get_year_stats(year1)
    stats2 = await get_year_stats(year2)
    
    return {
        "year1": stats1,
        "year2": stats2,
        "comparison": {
            "eggs_diff": stats2["total_eggs"] - stats1["total_eggs"],
            "hatched_diff": stats2["hatched_eggs"] - stats1["hatched_eggs"],
            "fertility_diff": round(stats2["fertility_rate"] - stats1["fertility_rate"], 1),
            "hatch_rate_diff": round(stats2["hatch_rate"] - stats1["hatch_rate"], 1)
        }
    }

# ============ PRINTABLE BREEDING CARDS API ============
@api_router.get("/print/breeding-cards")
async def get_breeding_cards_data():
    """Get data for printable breeding cards"""
    pairs = await db.pairs.find({"is_active": True}, {"_id": 0}).to_list(1000)
    birds = await db.birds.find({}, {"_id": 0}).to_list(10000)
    cages = await db.cages.find({}, {"_id": 0}).to_list(10000)
    zones = await db.zones.find({}, {"_id": 0}).to_list(100)
    clutches = await db.clutches.find({}, {"_id": 0}).to_list(10000)
    
    birds_dict = {b["id"]: b for b in birds}
    cages_dict = {c["id"]: c for c in cages}
    zones_dict = {z["id"]: z for z in zones}
    
    cards = []
    for pair in pairs:
        male = birds_dict.get(pair.get("male_id"), {})
        female = birds_dict.get(pair.get("female_id"), {})
        cage = cages_dict.get(pair.get("cage_id"), {})
        zone = zones_dict.get(cage.get("zone_id"), {}) if cage else {}
        
        # Get clutches for this pair
        pair_clutches = [c for c in clutches if c.get("pair_id") == pair["id"]]
        total_eggs = sum(len(c.get("eggs", [])) for c in pair_clutches)
        hatched = sum(1 for c in pair_clutches for e in c.get("eggs", []) if e.get("status") == "hatched")
        
        cards.append({
            "pair_id": pair["id"],
            "pair_name": pair.get("name") or f"Pair {pair['id'][:6]}",
            "cage_label": cage.get("label", "N/A"),
            "zone_name": zone.get("name", "N/A"),
            "male": {
                "band_number": male.get("band_number", "N/A"),
                "stam": male.get("stam", "-"),
                "year": male.get("band_year", "-"),
            },
            "female": {
                "band_number": female.get("band_number", "N/A"),
                "stam": female.get("stam", "-"),
                "year": female.get("band_year", "-"),
            },
            "paired_date": pair.get("paired_date", "N/A"),
            "clutches": len(pair_clutches),
            "total_eggs": total_eggs,
            "hatched": hatched,
            "is_active": pair.get("is_active", True),
        })
    
    return cards

# Include the router in the main app
app.include_router(api_router)

# Health check endpoint (outside /api prefix for Railway)
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "ornituga-api"}


@app.get("/")
async def root_index():
    return {"message": "OrniTuga API", "status": "online", "docs": "/docs"}


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Start the scheduler on app startup"""
    try:
        logger.info("Starting application...")
        # Temporarily disabled scheduler to debug
        # schedule_daily_reports()
        # scheduler.start()
        logger.info("Application started (scheduler disabled for debug)")
    except Exception as e:
        logger.error(f"Startup error: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        # scheduler.shutdown()
        client.close()
    except Exception as e:
        logger.error(f"Shutdown error: {e}")
