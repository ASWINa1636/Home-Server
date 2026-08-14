import os, uuid, shutil, aiofiles, zipfile
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, Form, Request
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import FileRecord, User
from auth import get_current_user
from dotenv import load_dotenv
from typing import List
import io

load_dotenv()
STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/uploads")
TEMP_PATH = os.getenv("TEMP_PATH", "/tmp/homeserver")
os.makedirs(STORAGE_PATH, exist_ok=True)
os.makedirs(TEMP_PATH, exist_ok=True)

router = APIRouter(prefix="/api/files", tags=["files"])

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("/"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4()}{ext}"

    # Write to SSD temp first (fast buffer)
    temp_path = os.path.join(TEMP_PATH, unique_name)
    async with aiofiles.open(temp_path, "wb") as f:
        while True:
            chunk = await file.read(10 * 1024 * 1024)
            if not chunk:
                break
            await f.write(chunk)

    # Move from SSD to HDD storage
    final_path = os.path.join(STORAGE_PATH, unique_name)
    shutil.move(temp_path, final_path)

    size = os.path.getsize(final_path)
    record = FileRecord(
        filename=unique_name,
        original_name=file.filename,
        size=size,
        mime_type=file.content_type,
        owner_id=user.id,
        folder=folder
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "name": file.filename, "size": size}

@router.get("/list")
def list_files(folder: str = "/", db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if folder == "all":
        files = db.query(FileRecord).filter(FileRecord.owner_id == user.id).all()
    else:
        files = db.query(FileRecord).filter(
            FileRecord.owner_id == user.id,
            FileRecord.folder == folder
        ).all()
    return [{"id": f.id, "name": f.original_name, "size": f.size, "type": f.mime_type, "folder": f.folder, "created": str(f.created_at)} for f in files]

@router.get("/download/{file_id}")
def download_file(file_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    path = os.path.join(STORAGE_PATH, record.filename)
    return FileResponse(path, filename=record.original_name, media_type=record.mime_type)

@router.get("/view/{file_id}")
def view_file(
    file_id: int,
    token: str = None,
    request: Request = None,
    db: Session = Depends(get_db)
):
    from jose import jwt, JWTError
    from fastapi import Request
    SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-change-me")

    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        username = payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    from models import User
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(STORAGE_PATH, record.filename)
    file_size = os.path.getsize(path)
    
    # Handle range requests for video streaming
    range_header = request.headers.get("Range")
    
    if range_header:
        # Parse range header e.g. "bytes=0-1023"
        range_val = range_header.replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else min(start + 10 * 1024 * 1024, file_size - 1)  # 10MB chunks
        
        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")
        
        chunk_size = end - start + 1
        
        def iter_file():
            with open(path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(1024 * 1024, remaining)  # 1MB at a time
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data
        
        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=record.mime_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
                "Content-Disposition": "inline",
            }
        )
    
    # No range header — stream full file
    def iter_full():
        with open(path, "rb") as f:
            while True:
                chunk = f.read(1024 * 1024)  # 1MB chunks
                if not chunk:
                    break
                yield chunk
    
    return StreamingResponse(
        iter_full(),
        media_type=record.mime_type,
        headers={
            "Content-Length": str(file_size),
            "Accept-Ranges": "bytes",
            "Content-Disposition": "inline",
        }
    )

@router.post("/download-multiple")
def download_multiple(
    ids: List[int],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    records = db.query(FileRecord).filter(
        FileRecord.id.in_(ids),
        FileRecord.owner_id == user.id
    ).all()
    if not records:
        raise HTTPException(status_code=404, detail="No files found")

    # Create zip in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for record in records:
            path = os.path.join(STORAGE_PATH, record.filename)
            if os.path.exists(path):
                # Preserve folder structure inside zip
                arcname = os.path.join(record.folder.lstrip("/"), record.original_name) if record.folder != "/" else record.original_name
                zf.write(path, arcname)
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=download.zip"}
    )

@router.delete("/delete-multiple")
def delete_multiple(
    ids: List[int],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    records = db.query(FileRecord).filter(
        FileRecord.id.in_(ids),
        FileRecord.owner_id == user.id
    ).all()
    for record in records:
        path = os.path.join(STORAGE_PATH, record.filename)
        if os.path.exists(path):
            os.remove(path)
        db.delete(record)
    db.commit()
    return {"message": f"Deleted {len(records)} files"}

@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    path = os.path.join(STORAGE_PATH, record.filename)
    if os.path.exists(path):
        os.remove(path)
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}

@router.put("/{file_id}/rename")
def rename_file(file_id: int, new_name: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.owner_id == user.id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    record.original_name = new_name
    db.commit()
    return {"message": "Renamed"}