# ? New file created for EnrollmentService
import asyncio
import logging

from sqlalchemy.orm import Session

from app import models

logger = logging.getLogger(__name__)


class EnrollmentService:

    def __init__(self, mqtt_client, ws_manager):
        # ? Maintains an in-memory set of unique UIDs
        self._pending_uids: set[str] = set()
        self._is_active: bool = False
        self._mqtt = mqtt_client
        self._ws = ws_manager
        self._loop = None  # main event loop, set during startup

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        # ? Allows scheduling async broadcasts from a synchronous thread
        self._loop = loop

    # ── Session Control ───────────────────────────

    async def start(self):
        # ? Clears the set and starts the inventory scan
        self._pending_uids.clear()
        self._is_active = True
        # self._mqtt.start_inventory()
        logger.info("Enrollment: Started")

    async def cancel(self):
        # ? Stops scan and clears pending data without saving
        # self._mqtt.stop_inventory()
        self._pending_uids.clear()
        self._is_active = False
        logger.info("Enrollment: Cancelled")

    async def confirm(self, part_id: int, db: Session) -> dict:
        if not self._pending_uids:
            return {"status": "error", "message": "No tags scanned", "count": 0, "duplicates": []}

        part = db.query(models.Part).filter(models.Part.id == part_id).first()
        if not part:
            return {"status": "error", "message": f"Part ID {part_id} not found", "count": 0, "duplicates": []}

        # ? Checks if any tags in the pending set are already enrolled
        already = (
            db.query(models.RFIDTag.rfid_uid)
            .filter(models.RFIDTag.rfid_uid.in_(self._pending_uids))
            .all()
        )
        if already:
            # ? Returns an error if duplicates are found
            dupes = [r.rfid_uid for r in already]
            return {
                "status": "error",
                "message": f"Already enrolled: {', '.join(dupes)}",
                "count": 0,
                "duplicates": dupes,
            }

        # ? Inserts all tags in a single database transaction
        try:
            for uid in self._pending_uids:
                db.add(models.RFIDTag(rfid_uid=uid, part_id=part_id))
            db.commit()

            count = len(self._pending_uids)
            # self._mqtt.stop_inventory()
            self._pending_uids.clear()
            self._is_active = False
            logger.info("Enrollment: Committed %d tags", count)
            return {"status": "success", "count": count, "message": "", "duplicates": []}

        except Exception as e:
            db.rollback()
            logger.error("Enrollment: DB error: %s", e)
            return {"status": "error", "message": "Database error", "count": 0, "duplicates": []}

    # ── Tag callback (runs in MQTT thread) ────────

    def on_tag_discovered(self, uid: str, antenna: int, rssi: int):
        if not self._is_active:
            return
            
        # ? Checks the in-memory set to deduplicate tags immediately
        if uid in self._pending_uids:
            return

        self._pending_uids.add(uid)
        logger.info("Enrollment: New tag %s", uid)

        # ? Broadcasts the new unique tag to the WebSocket clients
        if self._loop:
            asyncio.run_coroutine_threadsafe(
                self._ws.broadcast({
                    "type": "enrollment_tag",
                    "uid": uid,
                    "antenna": antenna,
                    "rssi": rssi,
                }),
                self._loop,
            )

    # ── Getters ───────────────────────────────────

    def get_pending_uids(self) -> list[str]:
        return list(self._pending_uids)

    @property
    def is_active(self) -> bool:
        return self._is_active
