from app.database import SessionLocal
from app import models
from app.auth import get_password_hash

def seed_database():
    db = SessionLocal()
    
    try:
        # Check if already seeded to prevent unique constraint crashes
        if db.query(models.Part).first():
            print("Database already contains data. Skipping seed operation.")
            return

        print("1. Creating Catalog (Parts)...")
        p_esp = models.Part(sku="MCU-ESP32", name="ESP32 WROOM Dev Board", description="Wi-Fi and Bluetooth Microcontroller")
        p_mpu = models.Part(sku="SENS-MPU", name="MPU6050 Gyroscope", description="6-DOF Accelerometer and Gyroscope")
        p_servo = models.Part(sku="MTR-MG996R", name="MG996R Servo", description="High-torque metal gear servo motor")
        db.add_all([p_esp, p_mpu, p_servo])
        db.commit() # Commit to generate the IDs

        print("2. Creating Warehouse Locations (Bins)...")
        b_alpha = models.Area(bin_label="Zone_a", rfid_tag_id="BIN-A1-TAG")
        b_beta = models.Area(bin_label="Zone_b", rfid_tag_id="BIN-B1-TAG")
        db.add_all([b_alpha, b_beta])
        db.commit()

        print("3. Manager Desk: Pre-Enrolling Tags (Printing Stickers)...")
        # Linking specific physical UIDs to our catalog parts
        tag1 = models.RFIDTag(rfid_uid="UID-ESP-001", part_id=p_esp.id)
        tag2 = models.RFIDTag(rfid_uid="UID-ESP-002", part_id=p_esp.id)
        tag3 = models.RFIDTag(rfid_uid="UID-MPU-001", part_id=p_mpu.id)
        # Leave a pre-enrolled servo tag that is NOT put in inventory yet (Simulating a staging area)
        tag4 = models.RFIDTag(rfid_uid="UID-SRV-001", part_id=p_servo.id)
        
        db.add_all([tag1, tag2, tag3, tag4])
        db.commit()

        print("4. Smart Bins: Simulating Initial Drops (Stock IN)...")
        # Placing both ESP32s in RACK-A-1
        inv_esp = models.Inventory(part_id=p_esp.id, bin_id=b_alpha.id, quantity=2)
        # Placing the MPU6050 in RACK-B-1
        inv_mpu = models.Inventory(part_id=p_mpu.id, bin_id=b_beta.id, quantity=1)
        db.add_all([inv_esp, inv_mpu])

        # Writing the corresponding transactions for the audit log
        tx1 = models.Transaction(part_id=p_esp.id, bin_id=b_alpha.id, tx_type="IN", quantity=1, scanned_rfid_uid="UID-ESP-001")
        tx2 = models.Transaction(part_id=p_esp.id, bin_id=b_alpha.id, tx_type="IN", quantity=1, scanned_rfid_uid="UID-ESP-002")
        tx3 = models.Transaction(part_id=p_mpu.id, bin_id=b_beta.id, tx_type="IN", quantity=1, scanned_rfid_uid="UID-MPU-001")
        db.add_all([tx1, tx2, tx3])
        
        db.commit()

        # !ansh: seed admin user for authentication
        print("5. Creating Default Operator User...")
        if not db.query(models.User).filter(models.User.email == "admin@logistix.com").first():
            admin = models.User(
                email="admin@logistix.com",
                username="Admin",
                hashed_password=get_password_hash("admin123"),
            )
            db.add(admin)
            db.commit()
            print("   ✅ Admin user created (email: admin@logistix.com / password: admin123)")
        else:
            print("   ⏭️  Admin user already exists, skipping.")

        print("✅ Database successfully seeded with decoupled identity workflow!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()