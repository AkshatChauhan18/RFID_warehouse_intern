# ? New file for automated MQTT Area Tracking
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app import models
from app.database import SessionLocal

logger = logging.getLogger(__name__)


class TrackingService:
    def __init__(self, ws_manager, enrollment_service):
        self._ws = ws_manager
        self._enrollment = enrollment_service
        self._loop = None

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def on_tag_discovered(self, uid: str, antenna: int, rssi: int):
        # 1. If enrollment is active, ignore (let enrollment service handle it)
        if self._enrollment.is_active:
            return

        logger.info("Tracking: Tag %s seen at antenna %s", uid, antenna)

        # 2. Process tracking logic in a separate background DB session
        db = SessionLocal()
        try:
            self._process_scan(uid, antenna, db)
        except Exception as e:
            logger.error("Tracking: Failed to process scan: %s", e)
        finally:
            db.close()

    def _process_scan(self, uid: str, antenna: int, db: Session):
        # We assume antenna 1 is the main entrance area
        # Fetch the default area (you can map specific antennas to specific areas later)
        area = db.query(models.Area).first()
        if not area:
            logger.warning("Tracking: No Area configured in database")
            return

        tag_record = (
            db.query(models.RFIDTag).filter(models.RFIDTag.rfid_uid == uid).first()
        )
        if not tag_record:
            return  # Unknown tag

        # Check last transaction for the anti-bounce cooldown
        last_tx = (
            db.query(models.Transaction)
            .filter(models.Transaction.scanned_rfid_uid == uid)
            .order_by(models.Transaction.tx_timestamp.desc())
            .first()
        )

        inferred_action = "IN"
        if last_tx:
            now_utc = datetime.now(timezone.utc)
            tx_time = last_tx.tx_timestamp
            if tx_time.tzinfo is None:
                tx_time = tx_time.replace(tzinfo=timezone.utc)

            # ? 30 SECOND COOLDOWN for large parts passing through doors
            if (now_utc - tx_time) < timedelta(seconds=5):
                return  # Still passing through, ignore

            inferred_action = "OUT" if last_tx.tx_type == "IN" else "IN"

        part_id = tag_record.part_id

        # Update inventory
        inv_record = (
            db.query(models.Inventory)
            .filter(
                models.Inventory.part_id == part_id, models.Inventory.bin_id == area.id
            )
            .first()
        )

        if not inv_record:
            if inferred_action == "OUT":
                return  # Cannot remove what is not there
            inv_record = models.Inventory(part_id=part_id, bin_id=area.id, quantity=0)
            db.add(inv_record)

        if inferred_action == "IN":
            inv_record.quantity += 1
        elif inferred_action == "OUT":
            if inv_record.quantity < 1:
                return
            inv_record.quantity -= 1

        # Log transaction
        new_tx = models.Transaction(
            part_id=part_id,
            bin_id=area.id,
            tx_type=inferred_action,
            quantity=1,
            scanned_rfid_uid=uid,
        )
        db.add(new_tx)
        db.commit()

        logger.info(
            "Tracking: Successfully processed %s for tag %s", inferred_action, uid
        )

        # Broadcast update to UI dashboard
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._ws.broadcast({"event": "inventory_updated"}), self._loop
            )
