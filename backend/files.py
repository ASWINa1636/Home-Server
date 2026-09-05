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
# Upload Optimization Helpers
# ---------------------------------------------------------------------------
async def fast_move_async(src: str, dst: str):
    """
    Optimally move a file from SSD (temp) to HDD (storage) without blocking the event loop.
    Tries an instant atomic rename (os.replace) if they happen to be on the same drive.
    Falls back to a zero-copy thread-offloaded shutil.move (os.sendfile) for cross-drive moves.
    """
    import asyncio
    import shutil
    try:
        # Atomic rename is instant, O(1), but only works if src and dst are on the same filesystem.
        os.replace(src, dst)
    except OSError as e:
        if e.errno == 18:  # EXDEV: Cross-device link
            # They are on different drives (e.g. SSD -> HDD).
            # Offload to a thread so we don't freeze the FastAPI event loop during the massive copy!
            # shutil.move uses os.sendfile under the hood in Python 3.8+, which is zero-copy kernel transfer.
            await asyncio.to_thread(shutil.move, src, dst)
        else:
            raise

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
    import asyncio
    from sqlalchemy import func as sql_func

    # Check Content-Length header if provided
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
        )

    # --- Strict Quota Pre-Check (Before opening temp file or streaming) ---
    current_usage = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )
    quota = user.storage_quota
    remaining_quota = max(0, quota - current_usage) if quota > 0 else float("inf")

    # Try getting file size from UploadFile or Content-Length header
    file_size_hint = None
    if hasattr(file, "size") and file.size and file.size > 0:
        file_size_hint = file.size
    elif content_length and content_length.isdigit():
        file_size_hint = int(content_length)

    if quota > 0 and file_size_hint is not None and file_size_hint > remaining_quota:
        used_gb = current_usage / (1024 ** 3)
        quota_gb = quota / (1024 ** 3)
        req_gb = file_size_hint / (1024 ** 3)
        raise HTTPException(
            status_code=413,
            detail=f"Upload rejected (Strict Quota Check): File ({req_gb:.2f} GB) exceeds remaining quota. "
                   f"Currently using {used_gb:.2f} GB of {quota_gb:.2f} GB. Request more storage from admin.",
        )

    # Sanitize inputs
    safe_name = sanitize_filename(file.filename)
    safe_folder = sanitize_folder_path(folder)

    ext = os.path.splitext(safe_name)[1]
    unique_name = f"{uuid.uuid4()}{ext}"

    # Write to SSD temp first (fast buffer), checking quota on EACH chunk
    temp_path = os.path.join(TEMP_PATH, unique_name)
    total_bytes = 0
    try:
        # We increase the chunk size to 16MB for massive reduction in I/O syscall overhead
        async with aiofiles.open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(16 * 1024 * 1024)  # 16 MB optimal streaming chunks
                if not chunk:
                    break
                total_bytes += len(chunk)

                # 1) Server max upload check
                if total_bytes > MAX_UPLOAD_SIZE:
                    await f.close()
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
                    )

                # 2) Strict User Quota check per chunk (mid-stream guard)
                if quota > 0 and (current_usage + total_bytes) > quota:
                    await f.close()
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                    used_gb = current_usage / (1024 ** 3)
                    quota_gb = quota / (1024 ** 3)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload aborted: Storage quota exceeded during upload. Using {used_gb:.2f} GB of {quota_gb:.2f} GB.",
                    )

                await f.write(chunk)
    except asyncio.CancelledError:
        # Client aborted upload (Cancel button or closed tab)
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        raise
    except HTTPException:
        raise
    except Exception:
        # Clean up temp file on any error
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Upload failed")

    # Move from SSD temp to HDD storage securely and fast!
    final_path = os.path.join(STORAGE_PATH, unique_name)
    await fast_move_async(temp_path, final_path)

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
# High-Speed Direct Binary Upload (Bypasses multipart overhead)
# ---------------------------------------------------------------------------
@router.post("/upload-direct")
async def upload_file_direct(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    High-speed binary stream upload endpoint.
    Bypasses python-multipart and Starlette spooling completely to maximize network throughput.
    """
    import asyncio
    import urllib.parse
    import mimetypes
    from sqlalchemy import func as sql_func

    # Read metadata from headers
    filename_encoded = request.headers.get("X-File-Name")
    if not filename_encoded:
        raise HTTPException(status_code=400, detail="Missing X-File-Name header")
    filename = urllib.parse.unquote(filename_encoded)
    
    folder_encoded = request.headers.get("X-Folder", "/")
    folder = urllib.parse.unquote(folder_encoded)

    content_length = request.headers.get("content-length")
    file_size_hint = int(content_length) if content_length and content_length.isdigit() else None

    # Strict Quota Pre-Check
    current_usage = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )
    quota = user.storage_quota
    remaining_quota = max(0, quota - current_usage) if quota > 0 else float("inf")

    if file_size_hint and file_size_hint > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum upload size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
        )

    if quota > 0 and file_size_hint is not None and file_size_hint > remaining_quota:
        used_gb = current_usage / (1024 ** 3)
        quota_gb = quota / (1024 ** 3)
        req_gb = file_size_hint / (1024 ** 3)
        raise HTTPException(
            status_code=413,
            detail=f"Upload rejected: File ({req_gb:.2f} GB) exceeds remaining quota. "
                   f"Using {used_gb:.2f} GB of {quota_gb:.2f} GB.",
        )

    # Sanitize inputs
    safe_name = sanitize_filename(filename)
    safe_folder = sanitize_folder_path(folder)
    ext = os.path.splitext(safe_name)[1]
    unique_name = f"{uuid.uuid4()}{ext}"

    # Write to SSD temp first by streaming directly from ASGI socket!
    temp_path = os.path.join(TEMP_PATH, unique_name)
    total_bytes = 0
    try:
        async with aiofiles.open(temp_path, "wb") as f:
            async for chunk in request.stream():
                if not chunk:
                    break
                total_bytes += len(chunk)

                # Server max upload check
                if total_bytes > MAX_UPLOAD_SIZE:
                    await f.close()
                    if os.path.exists(temp_path):
                        try: os.remove(temp_path)
                        except: pass
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024**3)} GB",
                    )

                # Strict User Quota check per chunk
                if quota > 0 and (current_usage + total_bytes) > quota:
                    await f.close()
                    if os.path.exists(temp_path):
                        try: os.remove(temp_path)
                        except: pass
                    used_gb = current_usage / (1024 ** 3)
                    quota_gb = quota / (1024 ** 3)
                    raise HTTPException(
                        status_code=413,
                        detail=f"Upload aborted: Quota exceeded. Using {used_gb:.2f} GB of {quota_gb:.2f} GB.",
                    )

                await f.write(chunk)
                
    except asyncio.CancelledError:
        # Client aborted upload
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except Exception: pass
        raise
    except HTTPException:
        raise
    except Exception:
        # Clean up temp file on any error
        if os.path.exists(temp_path):
            try: os.remove(temp_path)
            except Exception: pass
        raise HTTPException(status_code=500, detail="Upload failed")

    # Move from SSD to HDD securely and fast!
    final_path = os.path.join(STORAGE_PATH, unique_name)
    await fast_move_async(temp_path, final_path)

    size = os.path.getsize(final_path)
    
    mime_type, _ = mimetypes.guess_type(safe_name)
    if not mime_type:
        mime_type = "application/octet-stream"

    record = FileRecord(
        filename=unique_name,
        original_name=safe_name,
        size=size,
        mime_type=mime_type,
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


# ---------------------------------------------------------------------------
# Embedded Subtitles and Metadata (ffprobe/ffmpeg)
# ---------------------------------------------------------------------------
@router.get("/metadata/{file_id}")
async def get_video_metadata(
    file_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Run ffprobe to get embedded subtitles and audio tracks."""
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

    ext = os.path.splitext(record.original_name)[1].lower()
    is_video = record.mime_type.startswith("video/") or ext in [".mp4", ".mkv", ".avi", ".webm", ".mov"]
    
    if not is_video:
        print(f"[Metadata] Skipping non-video file: {record.original_name} (mime: {record.mime_type})")
        return {"subtitles": [], "audio": []}

    try:
        import json
        print(f"[Metadata] Running ffprobe on {path}")
        process = await asyncio.create_subprocess_exec(
            "ffprobe",
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if not stdout:
            print(f"[Metadata] ffprobe returned empty stdout. Stderr: {stderr.decode('utf-8')}")
            return {"subtitles": [], "audio": []}
            
        data = json.loads(stdout.decode('utf-8'))
        
        subtitles = []
        audio = []
        
        for stream in data.get("streams", []):
            codec_type = stream.get("codec_type")
            codec_name = stream.get("codec_name", "")
            index = stream.get("index")
            tags = stream.get("tags", {})
            
            print(f"[Metadata] Found stream {index}: {codec_type} ({codec_name})")
            
            if codec_type == "subtitle":
                # Ensure we only list text-based subtitles that can be converted to webvtt
                if codec_name not in ["subrip", "ass", "ssa", "webvtt", "mov_text", "srt"]:
                    print(f"[Metadata] Skipping unsupported subtitle codec: {codec_name}")
                    continue # Skip image-based subs like hdmv_pgs_subtitle or dvd_subtitle
                    
                lang = tags.get("language", "und")
                title = tags.get("title", "")
                label = title if title else lang.upper()
                if not label or label == "UND":
                    label = f"Track {index}"
                subtitles.append({
                    "index": index,
                    "language": lang,
                    "title": label
                })
            elif codec_type == "audio":
                lang = tags.get("language", "und")
                title = tags.get("title", "")
                label = title if title else lang.upper()
                if not label or label == "UND":
                    label = f"Track {index}"
                audio.append({
                    "index": index,
                    "language": lang,
                    "title": label
                })
                
        print(f"[Metadata] Found {len(subtitles)} subtitles, {len(audio)} audio tracks.")
        return {"subtitles": subtitles, "audio": audio}
    except Exception as e:
        print(f"[Metadata] ffprobe error: {e}")
        return {"subtitles": [], "audio": []}


@router.get("/subtitle/{file_id}/{stream_index}.vtt")
async def extract_subtitle(
    file_id: int,
    stream_index: int,
    token: str = None,
    db: Session = Depends(get_db),
):
    """Extract a subtitle stream on the fly and stream as WebVTT."""
    from jose import jwt, JWTError

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")

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

    print(f"[Subtitle Extractor] Requested file {file_id}, stream {stream_index}")
    
    try:
        print(f"[Subtitle Extractor] Starting ffmpeg for path: {path}")
        process = await asyncio.create_subprocess_exec(
            "ffmpeg",
            "-v", "error",
            "-i", path,
            "-map", f"0:{stream_index}",
            "-f", "webvtt",
            "pipe:1",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            err_msg = stderr.decode('utf-8')
            print(f"[Subtitle Extractor] ffmpeg failed: {err_msg}")
            raise HTTPException(status_code=500, detail="Subtitle extraction failed")
            
        vtt_content = stdout
        print(f"[Subtitle Extractor] Extracted successfully. Size: {len(vtt_content)} bytes")
        
        from fastapi import Response
        return Response(
            content=vtt_content,
            media_type="text/vtt; charset=utf-8",
            headers={
                "Cache-Control": "max-age=3600",
                "Access-Control-Allow-Origin": "*"
            }
        )
    except Exception as e:
        print(f"[Subtitle Extractor] Error: {e}")
        raise HTTPException(status_code=500, detail="Subtitle extraction error")