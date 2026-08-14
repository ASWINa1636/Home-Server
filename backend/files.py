"""
File management routes for HomeServer.
Handles upload, download, view (with range-request streaming), rename, delete.
All file operations are scoped to the authenticated user.
"""

import os
import re
import uuid
import shutil
import zipfile
import io
from typing import List

import aiofiles
from fastapi import (
    APIRouter, UploadFile, File, Depends, HTTPException,
    Query, Form, Request
)
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db
from models import FileRecord, User
from auth import get_current_user, SECRET_KEY, ALGORITHM

load_dotenv()

STORAGE_PATH = os.getenv("STORAGE_PATH", "/data/uploads")
TEMP_PATH = os.getenv("TEMP_PATH", "/tmp/homeserver")
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(50 * 1024 * 1024 * 1024)))  # 50 GB default

os.makedirs(STORAGE_PATH, exist_ok=True)
os.makedirs(TEMP_PATH, exist_ok=True)

router = APIRouter(prefix="/api/files", tags=["files"])


# ---------------------------------------------------------------------------
# Sanitization helpers
# ---------------------------------------------------------------------------
def sanitize_filename(name: str) -> str:
    """
    Sanitize a filename to prevent path traversal and other attacks.
    Strips path separators, .., null bytes, and limits length.
    """
    if not name:
        return "unnamed"

    # Remove null bytes
    name = name.replace("\x00", "")

    # Extract just the filename (strip any directory components)
    name = name.replace("\\", "/")
    name = name.split("/")[-1]

    # Remove .. sequences
    name = name.replace("..", "")

    # Remove control characters
    name = re.sub(r"[\x00-\x1f\x7f]", "", name)

    # Strip leading/trailing whitespace and dots
    name = name.strip().strip(".")

    # Limit length to 255 characters
    if len(name) > 255:
        base, ext = os.path.splitext(name)
        name = base[:255 - len(ext)] + ext

    return name if name else "unnamed"


def sanitize_folder_path(folder: str) -> str:
    """
    Sanitize a folder path to prevent path traversal.
    Normalizes the path, rejects '..' components, ensures it starts with '/'.
    """
    if not folder:
        return "/"

    # Remove null bytes
    folder = folder.replace("\x00", "")

    # Normalize separators
    folder = folder.replace("\\", "/")

    # Reject any path with '..' components
    parts = folder.split("/")
    clean_parts = [p for p in parts if p and p != "." and p != ".."]

    if not clean_parts:
        return "/"

    # Rebuild the path ensuring it starts with /
    result = "/" + "/".join(clean_parts)

    # Limit total path length
    if len(result) > 1024:
        raise HTTPException(status_code=400, detail="Folder path too long")

    return result


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------
@router.post("/upload")
async def upload_file(
    request: Request,
    file: UploadFile = File(...),
    folder: str = Form("/"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Upload a file to the server. Supports large files with streaming write."""

    # Check Content-Length header if provided
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
        )

    # Sanitize inputs
    safe_name = sanitize_filename(file.filename)
    safe_folder = sanitize_folder_path(folder)

    ext = os.path.splitext(safe_name)[1]
    unique_name = f"{uuid.uuid4()}{ext}"

    # Write to SSD temp first (fast buffer), tracking total bytes
    temp_path = os.path.join(TEMP_PATH, unique_name)
    total_bytes = 0
    try:
        async with aiofiles.open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(10 * 1024 * 1024)  # 10 MB chunks
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    # Clean up and reject
                    await f.close()
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
                    )
                await f.write(chunk)
    except HTTPException:
        raise
    except Exception:
        # Clean up temp file on any error
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail="Upload failed")

    # Move from SSD temp to HDD storage
    final_path = os.path.join(STORAGE_PATH, unique_name)
    shutil.move(temp_path, final_path)

    size = os.path.getsize(final_path)
    record = FileRecord(
        filename=unique_name,
        original_name=safe_name,
        size=size,
        mime_type=file.content_type or "application/octet-stream",
        owner_id=user.id,
        folder=safe_folder,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return {"id": record.id, "name": safe_name, "size": size}


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------
@router.get("/list")
def list_files(
    folder: str = "/",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """List all files belonging to the current user, optionally filtered by folder."""
    if folder == "all":
        files = db.query(FileRecord).filter(FileRecord.owner_id == user.id).all()
    else:
        safe_folder = sanitize_folder_path(folder)
        files = (
            db.query(FileRecord)
            .filter(FileRecord.owner_id == user.id, FileRecord.folder == safe_folder)
            .all()
        )

    return [
        {
            "id": f.id,
            "name": f.original_name,
            "size": f.size,
            "type": f.mime_type,
            "folder": f.folder,
            "created": str(f.created_at),
        }
        for f in files
    ]


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------
@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download a file by ID (requires auth). Returns the file as an attachment."""
    record = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.owner_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(STORAGE_PATH, record.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(path, filename=record.original_name, media_type=record.mime_type)


# ---------------------------------------------------------------------------
# View (supports range-request streaming for video)
# ---------------------------------------------------------------------------
@router.get("/view/{file_id}")
def view_file_endpoint(
    file_id: int,
    token: str = None,
    request: Request = None,
    db: Session = Depends(get_db),
):
    """
    View/stream a file. Authentication via query-string token (for <video>/<img> src).
    Supports HTTP Range requests for video streaming.
    """
    from jose import jwt, JWTError

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

    # Validate token securely using the central SECRET_KEY and ALGORITHM
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Authentication required")
    except JWTError:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    record = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.owner_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(STORAGE_PATH, record.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")

    file_size = os.path.getsize(path)

    # Handle range requests for video streaming
    range_header = request.headers.get("Range") if request else None

    if range_header:
        # Parse range header, e.g. "bytes=0-1023"
        range_val = range_header.replace("bytes=", "")
        parts = range_val.split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else min(start + 10 * 1024 * 1024, file_size - 1)

        if start >= file_size:
            raise HTTPException(status_code=416, detail="Range not satisfiable")

        # Clamp end to file size
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(1024 * 1024, remaining)  # 1 MB at a time
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
            },
        )

    # No range header — stream the full file
    def iter_full():
        with open(path, "rb") as f:
            while True:
                chunk = f.read(1024 * 1024)  # 1 MB chunks
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
        },
    )


# ---------------------------------------------------------------------------
# Download multiple (zip)
# ---------------------------------------------------------------------------
@router.post("/download-multiple")
def download_multiple(
    ids: List[int],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Download multiple files as a zip archive."""
    records = (
        db.query(FileRecord)
        .filter(FileRecord.id.in_(ids), FileRecord.owner_id == user.id)
        .all()
    )
    if not records:
        raise HTTPException(status_code=404, detail="No files found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for record in records:
            path = os.path.join(STORAGE_PATH, record.filename)
            if os.path.exists(path):
                arcname = (
                    os.path.join(record.folder.lstrip("/"), record.original_name)
                    if record.folder != "/"
                    else record.original_name
                )
                zf.write(path, arcname)
    zip_buffer.seek(0)

    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=download.zip"},
    )


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------
@router.delete("/delete-multiple")
def delete_multiple(
    ids: List[int],
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete multiple files by ID."""
    records = (
        db.query(FileRecord)
        .filter(FileRecord.id.in_(ids), FileRecord.owner_id == user.id)
        .all()
    )
    for record in records:
        path = os.path.join(STORAGE_PATH, record.filename)
        if os.path.exists(path):
            os.remove(path)
        db.delete(record)
    db.commit()
    return {"message": f"Deleted {len(records)} files"}


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Delete a single file by ID."""
    record = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.owner_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    path = os.path.join(STORAGE_PATH, record.filename)
    if os.path.exists(path):
        os.remove(path)
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}


# ---------------------------------------------------------------------------
# Rename
# ---------------------------------------------------------------------------
@router.put("/{file_id}/rename")
def rename_file(
    file_id: int,
    new_name: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rename a file (changes the display name, not the stored filename)."""
    record = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.owner_id == user.id)
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="File not found")

    safe_name = sanitize_filename(new_name)
    if not safe_name or safe_name == "unnamed":
        raise HTTPException(status_code=400, detail="Invalid filename")

    record.original_name = safe_name
    db.commit()
    return {"message": "Renamed"}