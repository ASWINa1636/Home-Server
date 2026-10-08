import os
import shutil
import sys

# Ensure backend directory is in path so we can import models if needed
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import FileRecord

OLD_DATA_DIR = "/home/aswin/homeserver/data"
OLD_UPLOADS_DIR = os.path.join(OLD_DATA_DIR, "uploads")
OLD_DB_PATH = os.path.join(OLD_DATA_DIR, "homeserver.db")

NEW_DATA_DIR = "/home/aswin/homeserver-data"
NEW_USERS_DIR = os.path.join(NEW_DATA_DIR, "users")
NEW_DB_PATH = os.path.join(NEW_DATA_DIR, "homeserver.db")

def migrate():
    print("========================================")
    print("Starting HomeServer Storage Migration...")
    print("========================================")
    
    os.makedirs(NEW_USERS_DIR, exist_ok=True)
    
    if not os.path.exists(OLD_DB_PATH):
        print(f"Old database not found at {OLD_DB_PATH}. Nothing to migrate.")
        return

    # Copy database if not already there
    if not os.path.exists(NEW_DB_PATH):
        print(f"Copying database from {OLD_DB_PATH} to {NEW_DB_PATH}...")
        try:
            shutil.copy2(OLD_DB_PATH, NEW_DB_PATH)
            print("Database copied successfully.")
        except Exception as e:
            print(f"CRITICAL: Failed to copy database: {e}")
            return
    else:
        print(f"Database already exists at {NEW_DB_PATH}. Using it.")

    # Connect to the NEW database to fetch records
    try:
        engine = create_engine(f"sqlite:///{NEW_DB_PATH}")
        Session = sessionmaker(bind=engine)
        db = Session()
    except Exception as e:
        print(f"Failed to connect to database {NEW_DB_PATH}: {e}")
        return

    try:
        records = db.query(FileRecord).all()
        total_records = len(records)
    except Exception as e:
        print(f"Failed to query FileRecords: {e}")
        return
    
    total_physical = 0
    if os.path.exists(OLD_UPLOADS_DIR):
        total_physical = len([f for f in os.listdir(OLD_UPLOADS_DIR) if os.path.isfile(os.path.join(OLD_UPLOADS_DIR, f))])

    success = 0
    already_migrated = 0
    missing = 0
    failed = 0
    size_mismatch = 0

    print(f"\nFound {total_records} file records in database.")
    print(f"Found {total_physical} physical files in {OLD_UPLOADS_DIR}.\n")

    for record in records:
        src = os.path.join(OLD_UPLOADS_DIR, record.filename)
        dest_dir = os.path.join(NEW_USERS_DIR, str(record.owner_id))
        os.makedirs(dest_dir, exist_ok=True)
        dest = os.path.join(dest_dir, record.filename)

        # Check if already migrated
        if os.path.exists(dest):
            dest_size = os.path.getsize(dest)
            if dest_size == record.size:
                already_migrated += 1
            else:
                print(f"Size mismatch for {dest}. Expected: {record.size}, Actual: {dest_size}")
                size_mismatch += 1
            continue

        # Check if source exists
        if not os.path.exists(src):
            missing += 1
            print(f"Missing source file: {src}")
            continue
            
        # Perform safe copy
        try:
            shutil.copy2(src, dest)
            dest_size = os.path.getsize(dest)
            if dest_size == record.size:
                success += 1
            else:
                failed += 1
                print(f"Failed to copy (size mismatch after copy): {src} -> {dest}")
        except Exception as e:
            failed += 1
            print(f"Failed to copy {src} to {dest}: {e}")

    print("\n========================================")
    print("Migration Report:")
    print("========================================")
    print(f"total database records     : {total_records}")
    print(f"total physical files found : {total_physical}")
    print(f"successfully migrated      : {success}")
    print(f"already migrated           : {already_migrated}")
    print(f"missing source files       : {missing}")
    print(f"failed migrations          : {failed}")
    print(f"destination size mismatches: {size_mismatch}")
    print("========================================")
    print("IMPORTANT: Please verify everything is working before deleting the old data manually!")

if __name__ == "__main__":
    migrate()
