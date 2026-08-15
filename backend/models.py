"""
Database models for HomeServer.
User, FileRecord, Device, StorageRequest, AuditLog, Message, DeletionRequest.
"""

import os
from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, BigInteger,
    Boolean, Text
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from dotenv import load_dotenv
from database import Base

load_dotenv()

# Default storage quota: 5 GB (configurable via env)
DEFAULT_STORAGE_QUOTA = int(os.getenv("DEFAULT_STORAGE_QUOTA", str(5 * 1024 ** 3)))


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    storage_quota = Column(BigInteger, default=DEFAULT_STORAGE_QUOTA, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Password Reset & Invalidation
    reset_token = Column(String, nullable=True, index=True)
    reset_token_expires = Column(DateTime(timezone=True), nullable=True)
    password_changed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    files = relationship("FileRecord", back_populates="owner", cascade="all, delete-orphan")
    devices = relationship("Device", back_populates="user", cascade="all, delete-orphan")
    storage_requests = relationship("StorageRequest", back_populates="user", cascade="all, delete-orphan")
    messages = relationship("Message", foreign_keys="[Message.user_id]", back_populates="user", cascade="all, delete-orphan")
    deletion_requests = relationship("DeletionRequest", back_populates="user", cascade="all, delete-orphan")


class FileRecord(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    original_name = Column(String)
    size = Column(BigInteger)
    mime_type = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    folder = Column(String, default="/")

    owner = relationship("User", back_populates="files")


class Device(Base):
    """Tracks client devices/sessions that have authenticated."""
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    device_name = Column(String, nullable=False)       # Parsed friendly name
    user_agent = Column(String, nullable=True)          # Raw UA string
    ip_address = Column(String, nullable=False)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="devices")


class StorageRequest(Base):
    """User request for additional storage quota."""
    __tablename__ = "storage_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    requested_amount = Column(BigInteger, nullable=False)   # Requested new quota (bytes)
    current_usage = Column(BigInteger, nullable=False)      # Snapshot at request time
    message = Column(Text, nullable=True)                   # User's reason
    status = Column(String, default="pending", nullable=False)  # pending/approved/rejected
    admin_response = Column(Text, nullable=True)            # Admin's message
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="storage_requests")


class AuditLog(Base):
    """Immutable log of admin actions for accountability."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action = Column(String, nullable=False)                 # e.g. "set_quota", "approve_deletion"
    target_user_id = Column(Integer, nullable=True)         # Affected user (if any)
    details = Column(Text, nullable=True)                   # JSON details
    ip_address = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("User", foreign_keys=[admin_id])


class Message(Base):
    """Support & communication message between user and admin."""
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)    # The client user thread
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)               # Actual sender (user or admin)
    subject = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id], back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])


class DeletionRequest(Base):
    """Account deletion request submitted by a user for admin approval."""
    __tablename__ = "deletion_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reason = Column(Text, nullable=True)
    status = Column(String, default="pending", nullable=False)  # pending/approved/rejected
    admin_response = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="deletion_requests")