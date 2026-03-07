from fastapi import FastAPI, APIRouter, HTTPException, Query, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Email configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_EMAIL = os.environ.get('SMTP_EMAIL', '')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')

# Create the main app
app = FastAPI(title="Canary Breeding Control API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class BirdGender(str, Enum):
    MALE = "male"
    FEMALE = "female"

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

# Models
class Zone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    name: Optional[str] = None
    cage_id: str
    male_id: Optional[str] = None
    female_id: Optional[str] = None
    paired_date: Optional[str] = None
    is_active: bool = True
    notes: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PairCreate(BaseModel):
    name: Optional[str] = None
    cage_id: str
    male_id: Optional[str] = None
    female_id: Optional[str] = None
    paired_date: Optional[str] = None
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

class Clutch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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
    status: EggStatus
    hatched_date: Optional[str] = None
    band_number: Optional[str] = None
    banded_date: Optional[str] = None

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
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

# Email sending function
async def send_email_notification(to_email: str, subject: str, body: str):
    if not SMTP_EMAIL or not SMTP_PASSWORD:
        logging.warning("Email not configured")
        return False
    
    try:
        message = MIMEMultipart()
        message["From"] = SMTP_EMAIL
        message["To"] = to_email
        message["Subject"] = subject
        message.attach(MIMEText(body, "html"))
        
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_EMAIL,
            password=SMTP_PASSWORD,
        )
        logging.info(f"Email sent to {to_email}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {e}")
        return False

# ============ SETTINGS API ============
@api_router.get("/settings")
async def get_settings():
    breeding = await db.settings.find_one({"type": "breeding"}, {"_id": 0})
    email = await db.settings.find_one({"type": "email"}, {"_id": 0})
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
async def save_email_settings(input: EmailSettings):
    await db.settings.update_one(
        {"type": "email"},
        {"$set": {**input.model_dump(), "type": "email"}},
        upsert=True
    )
    return {"message": "Email settings saved"}

@api_router.post("/settings/test-email")
async def test_email():
    email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    if not email_settings or not email_settings.get("notification_email"):
        raise HTTPException(status_code=400, detail="No notification email configured")
    
    success = await send_email_notification(
        email_settings["notification_email"],
        "🐤 Canary Control - Test Email",
        "<h2>Test Email</h2><p>Your email notifications are working correctly!</p>"
    )
    
    if success:
        return {"message": "Test email sent successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send test email")

# ============ MANUAL TASKS API ============
@api_router.post("/manual-tasks", response_model=ManualTask)
async def create_manual_task(input: ManualTaskCreate, background_tasks: BackgroundTasks):
    task = ManualTask(**input.model_dump())
    doc = task.model_dump()
    await db.manual_tasks.insert_one(doc)
    
    # Send email notification if enabled
    email_settings = await db.settings.find_one({"type": "email"}, {"_id": 0})
    if email_settings and email_settings.get("email_enabled") and email_settings.get("notification_email"):
        background_tasks.add_task(
            send_email_notification,
            email_settings["notification_email"],
            f"🐤 New Task: {task.title}",
            f"<h2>New Task Created</h2><p><strong>{task.title}</strong></p><p>{task.description or 'No description'}</p><p>Due: {task.due_date}</p>"
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
async def create_zone(input: ZoneCreate):
    zone = Zone(**input.model_dump())
    doc = zone.model_dump()
    await db.zones.insert_one(doc)
    return zone

@api_router.get("/zones", response_model=List[Zone])
async def get_zones():
    zones = await db.zones.find({}, {"_id": 0}).to_list(1000)
    return zones

@api_router.get("/zones/{zone_id}", response_model=Zone)
async def get_zone(zone_id: str):
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@api_router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str):
    result = await db.zones.delete_one({"id": zone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Zone not found")
    # Delete associated cages
    await db.cages.delete_many({"zone_id": zone_id})
    return {"message": "Zone deleted"}

@api_router.post("/zones/{zone_id}/generate-cages")
async def generate_cages(zone_id: str):
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
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
                label=f"{cage_number}"
            )
            cages.append(cage.model_dump())
            cage_number += 1
    
    if cages:
        await db.cages.insert_many(cages)
    
    return {"message": f"Generated {len(cages)} cages", "count": len(cages)}

# ============ CAGES API ============
@api_router.get("/cages", response_model=List[Cage])
async def get_cages(zone_id: Optional[str] = None):
    query = {}
    if zone_id:
        query["zone_id"] = zone_id
    cages = await db.cages.find(query, {"_id": 0}).to_list(1000)
    return cages

@api_router.get("/cages/{cage_id}", response_model=Cage)
async def get_cage(cage_id: str):
    cage = await db.cages.find_one({"id": cage_id}, {"_id": 0})
    if not cage:
        raise HTTPException(status_code=404, detail="Cage not found")
    return cage

# ============ BIRDS API ============
@api_router.post("/birds", response_model=Bird)
async def create_bird(input: BirdCreate):
    # Validate: birds with same band_number + band_year + gender + stam = duplicate
    if input.stam:
        existing = await db.birds.find_one({
            "band_number": input.band_number,
            "band_year": input.band_year,
            "gender": input.gender,
            "stam": input.stam
        }, {"_id": 0})
        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"A bird with band {input.band_number}, year {input.band_year}, gender {input.gender}, and STAM {input.stam} already exists"
            )
    
    bird = Bird(**input.model_dump())
    doc = bird.model_dump()
    await db.birds.insert_one(doc)
    return bird

@api_router.get("/birds/stams", response_model=List[str])
async def get_unique_stams():
    """Get all unique STAM values for auto-suggest"""
    pipeline = [
        {"$match": {"stam": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$stam"}},
        {"$sort": {"_id": 1}}
    ]
    results = await db.birds.aggregate(pipeline).to_list(1000)
    return [r["_id"] for r in results]

@api_router.get("/birds", response_model=List[Bird])
async def get_birds(gender: Optional[BirdGender] = None):
    query = {}
    if gender:
        query["gender"] = gender
    birds = await db.birds.find(query, {"_id": 0}).to_list(1000)
    return birds

@api_router.get("/birds/{bird_id}", response_model=Bird)
async def get_bird(bird_id: str):
    bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    return bird

@api_router.put("/birds/{bird_id}", response_model=Bird)
async def update_bird(bird_id: str, input: BirdCreate):
    bird = await db.birds.find_one({"id": bird_id}, {"_id": 0})
    if not bird:
        raise HTTPException(status_code=404, detail="Bird not found")
    
    # Validate: birds with same band_number + band_year + gender + stam = duplicate (excluding current bird)
    if input.stam:
        existing = await db.birds.find_one({
            "band_number": input.band_number,
            "band_year": input.band_year,
            "gender": input.gender,
            "stam": input.stam,
            "id": {"$ne": bird_id}
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

@api_router.delete("/birds/{bird_id}")
async def delete_bird(bird_id: str):
    result = await db.birds.delete_one({"id": bird_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bird not found")
    return {"message": "Bird deleted"}

# ============ PAIRS API ============
@api_router.post("/pairs", response_model=Pair)
async def create_pair(input: PairCreate):
    pair = Pair(**input.model_dump())
    doc = pair.model_dump()
    await db.pairs.insert_one(doc)
    return pair

@api_router.get("/pairs", response_model=List[Pair])
async def get_pairs(active_only: bool = False):
    query = {}
    if active_only:
        query["is_active"] = True
    pairs = await db.pairs.find(query, {"_id": 0}).to_list(1000)
    return pairs

@api_router.get("/pairs/{pair_id}", response_model=Pair)
async def get_pair(pair_id: str):
    pair = await db.pairs.find_one({"id": pair_id}, {"_id": 0})
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    return pair

@api_router.put("/pairs/{pair_id}", response_model=Pair)
async def update_pair(pair_id: str, input: PairUpdate):
    pair = await db.pairs.find_one({"id": pair_id}, {"_id": 0})
    if not pair:
        raise HTTPException(status_code=404, detail="Pair not found")
    
    update_data = {k: v for k, v in input.model_dump().items() if v is not None}
    if update_data:
        await db.pairs.update_one({"id": pair_id}, {"$set": update_data})
    
    updated_pair = await db.pairs.find_one({"id": pair_id}, {"_id": 0})
    return updated_pair

@api_router.delete("/pairs/{pair_id}")
async def delete_pair(pair_id: str):
    result = await db.pairs.delete_one({"id": pair_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pair not found")
    return {"message": "Pair deleted"}

# ============ CLUTCHES API ============
@api_router.post("/clutches", response_model=Clutch)
async def create_clutch(input: ClutchCreate):
    start_date = input.start_date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    clutch = Clutch(
        pair_id=input.pair_id,
        start_date=start_date,
        notes=input.notes
    )
    doc = clutch.model_dump()
    await db.clutches.insert_one(doc)
    return clutch

@api_router.get("/clutches", response_model=List[Clutch])
async def get_clutches(pair_id: Optional[str] = None, status: Optional[ClutchStatus] = None):
    query = {}
    if pair_id:
        query["pair_id"] = pair_id
    if status:
        query["status"] = status
    clutches = await db.clutches.find(query, {"_id": 0}).to_list(1000)
    return clutches

@api_router.get("/clutches/{clutch_id}", response_model=Clutch)
async def get_clutch(clutch_id: str):
    clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    return clutch

@api_router.put("/clutches/{clutch_id}", response_model=Clutch)
async def update_clutch(clutch_id: str, input: ClutchUpdate):
    clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
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
async def add_egg(clutch_id: str, input: AddEggRequest):
    clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
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
async def update_egg(clutch_id: str, egg_id: str, input: UpdateEggRequest):
    clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    if not clutch:
        raise HTTPException(status_code=404, detail="Clutch not found")
    
    eggs = clutch.get("eggs", [])
    egg_found = False
    for egg in eggs:
        if egg["id"] == egg_id:
            egg["status"] = input.status
            if input.hatched_date:
                egg["hatched_date"] = input.hatched_date
            if input.band_number:
                egg["band_number"] = input.band_number
            if input.banded_date:
                egg["banded_date"] = input.banded_date
            egg_found = True
            break
    
    if not egg_found:
        raise HTTPException(status_code=404, detail="Egg not found")
    
    await db.clutches.update_one({"id": clutch_id}, {"$set": {"eggs": eggs}})
    updated_clutch = await db.clutches.find_one({"id": clutch_id}, {"_id": 0})
    return updated_clutch

@api_router.delete("/clutches/{clutch_id}")
async def delete_clutch(clutch_id: str):
    result = await db.clutches.delete_one({"id": clutch_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Clutch not found")
    return {"message": "Clutch deleted"}

# ============ CONTACTS API ============
@api_router.post("/contacts", response_model=Contact)
async def create_contact(input: ContactCreate):
    contact = Contact(**input.model_dump())
    doc = contact.model_dump()
    await db.contacts.insert_one(doc)
    return contact

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(1000)
    return contacts

@api_router.get("/contacts/{contact_id}", response_model=Contact)
async def get_contact(contact_id: str):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact

@api_router.put("/contacts/{contact_id}", response_model=Contact)
async def update_contact(contact_id: str, input: ContactCreate):
    contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    
    update_data = input.model_dump()
    await db.contacts.update_one({"id": contact_id}, {"$set": update_data})
    updated_contact = await db.contacts.find_one({"id": contact_id}, {"_id": 0})
    return updated_contact

@api_router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    result = await db.contacts.delete_one({"id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contact not found")
    return {"message": "Contact deleted"}

# ============ DASHBOARD API ============
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    total_birds = await db.birds.count_documents({})
    total_pairs = await db.pairs.count_documents({})
    active_pairs = await db.pairs.count_documents({"is_active": True})
    total_clutches = await db.clutches.count_documents({})
    eggs_laying = await db.clutches.count_documents({"status": ClutchStatus.LAYING})
    eggs_incubating = await db.clutches.count_documents({"status": ClutchStatus.INCUBATING})
    chicks_hatching = await db.clutches.count_documents({"status": ClutchStatus.HATCHING})
    
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
async def get_tasks():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    tasks = []
    
    # Get all active clutches
    clutches = await db.clutches.find({"status": {"$ne": ClutchStatus.COMPLETED}}, {"_id": 0}).to_list(1000)
    
    for clutch in clutches:
        pair = await db.pairs.find_one({"id": clutch["pair_id"]}, {"_id": 0})
        cage = await db.cages.find_one({"id": pair["cage_id"]}, {"_id": 0}) if pair else None
        
        pair_name = pair.get("name") if pair else "Unknown"
        cage_label = cage.get("label") if cage else "Unknown"
        
        # Check for upcoming events
        if clutch.get("expected_hatch_date"):
            tasks.append(Task(
                id=f"hatch-{clutch['id']}",
                type="hatching",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch["expected_hatch_date"],
                details=f"Expected hatching - {len(clutch.get('eggs', []))} eggs"
            ))
        
        if clutch.get("expected_band_date"):
            tasks.append(Task(
                id=f"band-{clutch['id']}",
                type="banding",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch["expected_band_date"],
                details="Banding due"
            ))
        
        if clutch.get("expected_wean_date"):
            tasks.append(Task(
                id=f"wean-{clutch['id']}",
                type="weaning",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch["expected_wean_date"],
                details="Weaning due"
            ))
        
        # Active laying/incubating
        if clutch["status"] == ClutchStatus.LAYING:
            tasks.append(Task(
                id=f"laying-{clutch['id']}",
                type="laying",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=today,
                details=f"Currently laying - {len(clutch.get('eggs', []))} eggs"
            ))
        elif clutch["status"] == ClutchStatus.INCUBATING:
            tasks.append(Task(
                id=f"incubating-{clutch['id']}",
                type="incubation",
                pair_id=clutch["pair_id"],
                pair_name=pair_name,
                cage_label=cage_label,
                due_date=clutch.get("expected_hatch_date", today),
                details=f"Incubating - {len(clutch.get('eggs', []))} eggs"
            ))
    
    # Sort by due date
    tasks.sort(key=lambda x: x.due_date)
    return tasks

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "Canary Breeding Control API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
