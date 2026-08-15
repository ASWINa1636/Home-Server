"""
Admin API router for HomeServer.
All endpoints require admin authentication (is_admin == True).
Includes user management, device management, storage quotas, storage requests,
audit logs, and dashboard statistics.
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func, desc
from pydantic import BaseModel

from database import get_db
from models import User, FileRecord, Device, StorageRequest, AuditLog, Message, DeletionRequest
from auth import get_admin_user, log_admin_action

# Rate limiting
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class SetQuotaRequest(BaseModel):
    quota_gb: float  # In GB


class ToggleActiveRequest(BaseModel):
    is_active: bool


class StorageRequestAction(BaseModel):
    action: str  # "approve" or "reject"
    new_quota_gb: float | None = None  # Required for approve
    response_message: str = ""


class AdminMessageReply(BaseModel):
    content: str


class DeletionRequestAction(BaseModel):
    action: str  # "approve" or "reject"
    response_message: str = ""


# ---------------------------------------------------------------------------
# Helper: format user for response
# ---------------------------------------------------------------------------
def format_user_summary(user: User, db: Session) -> dict:
    """Build a summary dict for a user including storage stats."""
    used = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )
    file_count = (
        db.query(sql_func.count(FileRecord.id))
        .filter(FileRecord.owner_id == user.id)
        .scalar()
    )
    device_count = (
        db.query(sql_func.count(Device.id))
        .filter(Device.user_id == user.id, Device.is_active == True)
        .scalar()
    )
    quota = user.storage_quota
    percentage = round((used / quota) * 100, 1) if quota > 0 else 0

    # Determine status
    status = "active"
    if not user.is_active:
        status = "disabled"
    elif percentage >= 100:
        status = "over_quota"
    elif percentage >= 90:
        status = "near_quota"

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
        "is_active": user.is_active,
        "storage_used": used,
        "storage_quota": quota,
        "storage_percentage": percentage,
        "file_count": file_count,
        "device_count": device_count,
        "status": status,
        "last_login": str(user.last_login) if user.last_login else None,
        "created_at": str(user.created_at),
    }


# ---------------------------------------------------------------------------
# Overview / Dashboard stats
# ---------------------------------------------------------------------------
@router.get("/overview")
def admin_overview(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get admin dashboard overview statistics."""
    total_users = db.query(sql_func.count(User.id)).scalar()
    active_users = db.query(sql_func.count(User.id)).filter(User.is_active == True).scalar()
    total_files = db.query(sql_func.count(FileRecord.id)).scalar()
    total_storage = (
        db.query(sql_func.coalesce(sql_func.sum(FileRecord.size), 0)).scalar()
    )
    total_devices = (
        db.query(sql_func.count(Device.id))
        .filter(Device.is_active == True)
        .scalar()
    )
    pending_requests = (
        db.query(sql_func.count(StorageRequest.id))
        .filter(StorageRequest.status == "pending")
        .scalar()
    )
    pending_deletions = (
        db.query(sql_func.count(DeletionRequest.id))
        .filter(DeletionRequest.status == "pending")
        .scalar()
    )
    unread_messages = (
        db.query(sql_func.count(Message.id))
        .filter(Message.sender_id != admin.id, Message.is_read == False)
        .scalar()
    )

    # Recent signups (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    new_users_week = (
        db.query(sql_func.count(User.id))
        .filter(User.created_at >= week_ago)
        .scalar()
    )

    # Recently active users (logged in within 24h)
    day_ago = datetime.utcnow() - timedelta(hours=24)
    active_24h = (
        db.query(sql_func.count(User.id))
        .filter(User.last_login >= day_ago)
        .scalar()
    )

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_files": total_files,
        "total_storage": total_storage,
        "total_devices": total_devices,
        "pending_requests": pending_requests,
        "pending_deletions": pending_deletions,
        "unread_messages": unread_messages,
        "new_users_week": new_users_week,
        "active_24h": active_24h,
    }


# ---------------------------------------------------------------------------
# Users management
# ---------------------------------------------------------------------------
@router.get("/users")
def list_users(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all users with storage and device stats."""
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [format_user_summary(u, db) for u in users]


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get detailed info for a specific user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    summary = format_user_summary(user, db)

    # Get user's devices
    devices = (
        db.query(Device)
        .filter(Device.user_id == user_id)
        .order_by(Device.last_seen.desc())
        .all()
    )
    summary["devices"] = [
        {
            "id": d.id,
            "device_name": d.device_name,
            "ip_address": d.ip_address,
            "first_seen": str(d.first_seen),
            "last_seen": str(d.last_seen),
            "is_active": d.is_active,
        }
        for d in devices
    ]

    # Get user's storage requests
    requests = (
        db.query(StorageRequest)
        .filter(StorageRequest.user_id == user_id)
        .order_by(StorageRequest.created_at.desc())
        .limit(10)
        .all()
    )
    summary["storage_requests"] = [
        {
            "id": sr.id,
            "requested_amount": sr.requested_amount,
            "status": sr.status,
            "created_at": str(sr.created_at),
        }
        for sr in requests
    ]

    # Recent files (metadata only, not content)
    recent_files = (
        db.query(FileRecord)
        .filter(FileRecord.owner_id == user_id)
        .order_by(FileRecord.created_at.desc())
        .limit(20)
        .all()
    )
    summary["recent_files"] = [
        {
            "id": f.id,
            "name": f.original_name,
            "size": f.size,
            "folder": f.folder,
            "created_at": str(f.created_at),
        }
        for f in recent_files
    ]

    return summary


@router.put("/users/{user_id}/quota")
def set_user_quota(
    user_id: int,
    data: SetQuotaRequest,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Set storage quota for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_quota = user.storage_quota
    new_quota = int(data.quota_gb * (1024 ** 3))
    user.storage_quota = new_quota
    db.commit()

    log_admin_action(
        db, admin, "set_quota",
        target_user_id=user_id,
        details={"old_quota": old_quota, "new_quota": new_quota},
        ip_address=request.client.host if request.client else "",
    )

    return {"message": f"Quota updated to {data.quota_gb} GB", "quota": new_quota}


@router.put("/users/{user_id}/toggle-active")
def toggle_user_active(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Enable or disable a user account."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")

    user.is_active = not user.is_active
    db.commit()

    log_admin_action(
        db, admin, "toggle_active",
        target_user_id=user_id,
        details={"is_active": user.is_active},
        ip_address=request.client.host if request.client else "",
    )

    status = "enabled" if user.is_active else "disabled"
    return {"message": f"User {user.username} {status}", "is_active": user.is_active}


@router.put("/users/{user_id}/toggle-admin")
@limiter.limit("2/minute")
def toggle_user_admin(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Promote or demote a user's admin status."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot change your own admin status")

    user.is_admin = not user.is_admin
    db.commit()

    log_admin_action(
        db, admin, "toggle_admin",
        target_user_id=user_id,
        details={"is_admin": user.is_admin},
        ip_address=request.client.host if request.client else "",
    )

    status = "promoted to admin" if user.is_admin else "demoted from admin"
    return {"message": f"User {user.username} {status}", "is_admin": user.is_admin}


@router.delete("/users/{user_id}/force-logout")
def force_logout_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Revoke all active device sessions for a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    count = (
        db.query(Device)
        .filter(Device.user_id == user_id, Device.is_active == True)
        .update({"is_active": False})
    )
    db.commit()

    log_admin_action(
        db, admin, "force_logout",
        target_user_id=user_id,
        details={"devices_revoked": count},
        ip_address=request.client.host if request.client else "",
    )

    return {"message": f"Revoked {count} device(s) for {user.username}"}


# ---------------------------------------------------------------------------
# Device management
# ---------------------------------------------------------------------------
@router.get("/devices")
def list_all_devices(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all devices across all users."""
    devices = (
        db.query(Device, User.username)
        .join(User, Device.user_id == User.id)
        .order_by(Device.last_seen.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "user_id": d.user_id,
            "username": username,
            "device_name": d.device_name,
            "ip_address": d.ip_address,
            "first_seen": str(d.first_seen),
            "last_seen": str(d.last_seen),
            "is_active": d.is_active,
        }
        for d, username in devices
    ]


@router.delete("/devices/{device_id}")
def revoke_device(
    device_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Revoke a specific device session."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = False
    db.commit()

    log_admin_action(
        db, admin, "revoke_device",
        target_user_id=device.user_id,
        details={"device_id": device_id, "device_name": device.device_name},
        ip_address=request.client.host if request.client else "",
    )

    return {"message": f"Device '{device.device_name}' revoked"}


# ---------------------------------------------------------------------------
# Storage requests management
# ---------------------------------------------------------------------------
@router.get("/storage-requests")
def list_storage_requests(
    status: str = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all storage requests, optionally filtered by status."""
    query = (
        db.query(StorageRequest, User.username)
        .join(User, StorageRequest.user_id == User.id)
    )
    if status:
        query = query.filter(StorageRequest.status == status)

    requests = query.order_by(StorageRequest.created_at.desc()).all()

    return [
        {
            "id": sr.id,
            "user_id": sr.user_id,
            "username": username,
            "requested_amount": sr.requested_amount,
            "current_usage": sr.current_usage,
            "message": sr.message,
            "status": sr.status,
            "admin_response": sr.admin_response,
            "created_at": str(sr.created_at),
            "updated_at": str(sr.updated_at),
        }
        for sr, username in requests
    ]


@router.put("/storage-requests/{request_id}")
def handle_storage_request(
    request_id: int,
    data: StorageRequestAction,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Approve or reject a storage request."""
    sr = db.query(StorageRequest).filter(StorageRequest.id == request_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail="Storage request not found")

    if sr.status != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")

    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    if data.action == "approve":
        if not data.new_quota_gb or data.new_quota_gb <= 0:
            raise HTTPException(status_code=400, detail="Must specify a valid new_quota_gb when approving")

        new_quota = int(data.new_quota_gb * (1024 ** 3))
        user = db.query(User).filter(User.id == sr.user_id).first()
        if user:
            user.storage_quota = new_quota

        sr.status = "approved"
        sr.admin_response = data.response_message or f"Approved. Quota set to {data.new_quota_gb} GB."

        log_admin_action(
            db, admin, "approve_storage_request",
            target_user_id=sr.user_id,
            details={
                "request_id": request_id,
                "new_quota": new_quota,
                "new_quota_gb": data.new_quota_gb,
            },
            ip_address=request.client.host if request.client else "",
        )
    else:
        sr.status = "rejected"
        sr.admin_response = data.response_message or "Request denied."

        log_admin_action(
            db, admin, "reject_storage_request",
            target_user_id=sr.user_id,
            details={"request_id": request_id},
            ip_address=request.client.host if request.client else "",
        )

    db.commit()
    return {"message": f"Storage request {data.action}d", "status": sr.status}


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------
@router.get("/audit-logs")
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    action_filter: str = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get paginated audit logs."""
    query = (
        db.query(AuditLog, User.username)
        .join(User, AuditLog.admin_id == User.id)
    )

    if action_filter:
        query = query.filter(AuditLog.action == action_filter)

    total = query.count()
    offset = (page - 1) * limit

    logs = (
        query
        .order_by(AuditLog.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "logs": [
            {
                "id": log.id,
                "admin_username": username,
                "action": log.action,
                "target_user_id": log.target_user_id,
                "details": json.loads(log.details) if log.details else None,
                "ip_address": log.ip_address,
                "created_at": str(log.created_at),
            }
            for log, username in logs
        ],
    }


# ---------------------------------------------------------------------------
# Chart data endpoints
# ---------------------------------------------------------------------------
@router.get("/charts/storage")
def chart_storage_by_user(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Storage usage per user for bar chart."""
    results = (
        db.query(
            User.username,
            sql_func.coalesce(sql_func.sum(FileRecord.size), 0).label("used"),
            User.storage_quota,
        )
        .outerjoin(FileRecord, FileRecord.owner_id == User.id)
        .group_by(User.id)
        .order_by(desc("used"))
        .all()
    )
    return [
        {
            "username": r.username,
            "used": r.used,
            "quota": r.storage_quota,
            "used_gb": round(r.used / (1024 ** 3), 2),
            "quota_gb": round(r.storage_quota / (1024 ** 3), 2),
        }
        for r in results
    ]


@router.get("/charts/activity")
def chart_activity(
    days: int = Query(30, ge=7, le=90),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Login activity over time for line chart."""
    # Get daily login counts by looking at device last_seen dates
    start = datetime.utcnow() - timedelta(days=days)
    devices = (
        db.query(Device)
        .filter(Device.first_seen >= start)
        .all()
    )

    # Build daily counts
    daily = {}
    for d in devices:
        day = d.first_seen.strftime("%Y-%m-%d") if d.first_seen else None
        if day:
            daily[day] = daily.get(day, 0) + 1

    # Fill in missing days
    result = []
    for i in range(days):
        date = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        result.append({"date": date, "logins": daily.get(date, 0)})

    return result


    return [{"username": r.username, "files": r.count} for r in results]


# ---------------------------------------------------------------------------
# Support messaging endpoints (Admin)
# ---------------------------------------------------------------------------
@router.get("/messages")
def list_admin_conversations(
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List all user support threads with unread counts and last message."""
    # Query distinct user threads
    user_ids = db.query(Message.user_id).distinct().all()
    threads = []

    for (uid,) in user_ids:
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            continue

        last_msg = (
            db.query(Message)
            .filter(Message.user_id == uid)
            .order_by(Message.created_at.desc())
            .first()
        )

        unread_count = (
            db.query(sql_func.count(Message.id))
            .filter(Message.user_id == uid, Message.sender_id != admin.id, Message.is_read == False)
            .scalar()
        )

        threads.append({
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "unread_count": unread_count,
            "last_message": {
                "content": last_msg.content if last_msg else "",
                "subject": last_msg.subject if last_msg else None,
                "is_from_admin": last_msg.sender_id == admin.id if last_msg else False,
                "created_at": str(last_msg.created_at) if last_msg else None,
            }
        })

    # Sort by threads with unread messages first, then by last message time
    threads.sort(key=lambda t: (t["unread_count"] > 0, t["last_message"]["created_at"] or ""), reverse=True)
    return threads


@router.get("/messages/{user_id}")
def get_admin_conversation_thread(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Get full message thread for a specific user and mark incoming messages as read."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    messages = (
        db.query(Message)
        .filter(Message.user_id == user_id)
        .order_by(Message.created_at.asc())
        .all()
    )

    # Mark user messages as read by admin
    unread = [m for m in messages if m.sender_id != admin.id and not m.is_read]
    if unread:
        for m in unread:
            m.is_read = True
        db.commit()

    return {
        "user_id": user.id,
        "username": user.username,
        "email": user.email,
        "messages": [
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "is_from_admin": m.sender_id == admin.id,
                "subject": m.subject,
                "content": m.content,
                "is_read": m.is_read,
                "created_at": str(m.created_at),
            }
            for m in messages
        ]
    }


@router.post("/messages/{user_id}")
def reply_user_message(
    user_id: int,
    data: AdminMessageReply,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin reply to a user support thread."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not data.content.strip():
        raise HTTPException(status_code=400, detail="Reply content cannot be empty")

    msg = Message(
        user_id=user_id,
        sender_id=admin.id,
        content=data.content[:2000].strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "message": f"Reply sent to {user.username}"}


# ---------------------------------------------------------------------------
# Account deletion requests management (Admin)
# ---------------------------------------------------------------------------
@router.get("/deletion-requests")
def list_deletion_requests(
    status: str = Query(None),
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """List account deletion requests."""
    query = (
        db.query(DeletionRequest, User.username, User.email)
        .join(User, DeletionRequest.user_id == User.id)
    )

    if status:
        query = query.filter(DeletionRequest.status == status)

    requests = query.order_by(DeletionRequest.created_at.desc()).all()

    return [
        {
            "id": dr.id,
            "user_id": dr.user_id,
            "username": username,
            "email": email,
            "reason": dr.reason,
            "status": dr.status,
            "admin_response": dr.admin_response,
            "created_at": str(dr.created_at),
            "updated_at": str(dr.updated_at),
        }
        for dr, username, email in requests
    ]


@router.put("/deletion-requests/{request_id}")
def handle_deletion_request(
    request_id: int,
    data: DeletionRequestAction,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Approve or reject an account deletion request. Approving permanently deletes user files & account."""
    import os
    from files import STORAGE_PATH

    dr = db.query(DeletionRequest).filter(DeletionRequest.id == request_id).first()
    if not dr:
        raise HTTPException(status_code=404, detail="Deletion request not found")

    if dr.status != "pending":
        raise HTTPException(status_code=400, detail="Request has already been processed")

    if data.action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")

    user_to_delete = db.query(User).filter(User.id == dr.user_id).first()
    if not user_to_delete:
        raise HTTPException(status_code=404, detail="User target no longer exists")

    if user_to_delete.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own admin account via request")

    target_username = user_to_delete.username
    target_user_id = user_to_delete.id

    if data.action == "approve":
        # 1. Delete physical files from disk
        files = db.query(FileRecord).filter(FileRecord.owner_id == target_user_id).all()
        deleted_file_count = 0
        for f in files:
            file_path = os.path.join(STORAGE_PATH, f.filename)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    deleted_file_count += 1
                except Exception:
                    pass

        # 2. Update request status
        dr.status = "approved"
        dr.admin_response = data.response_message or "Account and all associated files deleted."

        # 3. Log audit BEFORE deleting user record
        log_admin_action(
            db, admin, "approve_account_deletion",
            target_user_id=target_user_id,
            details={
                "username": target_username,
                "files_deleted": deleted_file_count,
                "reason": dr.reason,
            },
            ip_address=request.client.host if request.client else "",
        )

        # 4. Delete user record (Cascades delete to files, devices, messages, requests)
        db.delete(user_to_delete)
        db.commit()

        return {
            "message": f"Account '{target_username}' and {deleted_file_count} file(s) permanently deleted.",
            "status": "approved",
        }
    else:
        dr.status = "rejected"
        dr.admin_response = data.response_message or "Account deletion request denied by admin."
        db.commit()

        log_admin_action(
            db, admin, "reject_account_deletion",
            target_user_id=target_user_id,
            details={"request_id": request_id, "username": target_username},
            ip_address=request.client.host if request.client else "",
        )

        return {"message": f"Deletion request for '{target_username}' rejected.", "status": "rejected"}
