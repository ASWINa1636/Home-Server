#!/usr/bin/env python3
"""
CLI script to promote an existing user to admin.

Usage:
    cd backend && source ../env/bin/activate
    python promote_admin.py <username>
"""

import sys
import os

# Ensure dotenv is loaded before any imports that depend on it
from dotenv import load_dotenv
load_dotenv()

from database import SessionLocal
from models import User


def promote(username: str):
    """Promote a user to admin by username."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ User '{username}' not found.")
            print("\nExisting users:")
            users = db.query(User).all()
            for u in users:
                admin_tag = " [ADMIN]" if u.is_admin else ""
                print(f"  - {u.username}{admin_tag}")
            return False

        if user.is_admin:
            print(f"ℹ️  User '{username}' is already an admin.")
            return True

        user.is_admin = True
        db.commit()
        print(f"✅ User '{username}' has been promoted to admin!")
        print(f"   They can now access the admin panel at /admin")
        return True
    finally:
        db.close()


def demote(username: str):
    """Demote an admin user back to regular user."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if not user:
            print(f"❌ User '{username}' not found.")
            return False

        if not user.is_admin:
            print(f"ℹ️  User '{username}' is not an admin.")
            return True

        user.is_admin = False
        db.commit()
        print(f"✅ User '{username}' has been demoted from admin.")
        return True
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python promote_admin.py <username> [--demote]")
        print("\nExamples:")
        print("  python promote_admin.py myuser          # Promote to admin")
        print("  python promote_admin.py myuser --demote  # Demote from admin")
        sys.exit(1)

    target = sys.argv[1]
    if "--demote" in sys.argv:
        demote(target)
    else:
        promote(target)
