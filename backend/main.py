from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import engine, get_db, Base
from models import User
from auth import hash_password, verify_password, create_token
from files import router as files_router
import os
from fastapi.responses import HTMLResponse
from starlette.datastructures import UploadFile as StarletteUploadFile
import uvicorn
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

Base.metadata.create_all(bind=engine)

app = FastAPI(title="HomeServer")

class RangeRequestMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["Accept-Ranges"] = "bytes"
        return response

app.add_middleware(RangeRequestMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(files_router)

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/auth/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    user = User(
        username=data.username,
        email=data.email,
        hashed_password=hash_password(data.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token({"sub": user.username})
    return {"token": token, "username": user.username}

@app.post("/api/auth/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.username})
    return {"token": token, "username": user.username}

# Serve React frontend (after build)

if os.path.exists("../frontend/dist"):
    app.mount("/assets", StaticFiles(directory="../frontend/dist/assets"), name="assets")
    
    @app.get("/favicon.svg")
    def favicon():
        return FileResponse("../frontend/dist/favicon.svg")
    
    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse("../frontend/dist/index.html")