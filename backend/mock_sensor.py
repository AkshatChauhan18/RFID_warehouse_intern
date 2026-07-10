import json
import logging
import random
import time
import uuid
from datetime import datetime, timezone
import paho.mqtt.client as mqtt

# Configure logging to match zebra_client style
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("MockZebraSensor")

CONTROL_TOPIC = "c-req"
RESPONSE_TOPIC = "c-res"
DATA_TOPIC = "d-evt"
MANAGEMENT_TOPIC = "m-evt"

class MockZebraSensor:
    def __init__(self, broker="localhost", port=1883):
        self._broker = broker
        self._port = port
        self._is_running = False
        
        self._client = mqtt.Client(
            client_id=f"mock-sensor-{uuid.uuid4().hex}",
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,  # type: ignore
        )
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def connect(self):
        logger.info("Connecting to broker at %s:%s", self._broker, self._port)
        self._client.connect(self._broker, self._port, keepalive=60)
        self._client.loop_start()

    def disconnect(self):
        self._is_running = False
        self._client.loop_stop()
        self._client.disconnect()
        logger.info("Disconnected from broker")

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            logger.error("Connection failed: %s", reason_code)
            return
        logger.info("Connected successfully")
        client.subscribe(CONTROL_TOPIC)
        logger.info("Subscribed to %s", CONTROL_TOPIC)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        logger.info("Disconnected from broker")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
        except Exception:
            return

        if msg.topic == CONTROL_TOPIC:
            command = payload.get("command")
            cmd_id = payload.get("command_id", "unknown")
            
            if command == "start":
                logger.info("Received START command from application")
                self._is_running = True
                self._send_response(cmd_id, "start", "success")
            elif command == "stop":
                logger.info("Received STOP command from application")
                self._is_running = False
                self._send_response(cmd_id, "stop", "success")

    def _send_response(self, command_id, command, status):
        res = {
            "command": command,
            "command_id": command_id,
            "status": status
        }
        self._client.publish(RESPONSE_TOPIC, json.dumps(res))
        logger.info("Sent response for %s command", command)

    def run_simulation(self):
        logger.info("Mock sensor simulation ready. Waiting for START command...")
        
        epcs = [
            "E280113030000207865239CA",
            "1234567890ABCDEF12345678",
            "AABBCCDDEEFF001122334455",
            "99887766554433221100FFEE"
        ]
        
        try:
            while True:
                if self._is_running:
                    # Generate INVENTORY data matching zebra_client.py expectation
                    data = {
                        "type": "INVENTORY",
                        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
                        "data": {
                            "idHex": random.choice(epcs),
                            "antenna": random.randint(1, 4),
                            "peakRssi": random.randint(-90, -40),
                        }
                    }
                    self._client.publish(DATA_TOPIC, json.dumps(data))
                    logger.info("Published tag read: %s (Antenna: %s)", data["data"]["idHex"], data["data"]["antenna"])
                
                # Send a heartbeat every loop iteration just in case the client expects it
                heartbeat = {"type": "heartbeat", "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")}
                self._client.publish(MANAGEMENT_TOPIC, json.dumps(heartbeat))
                
                time.sleep(2)
        except KeyboardInterrupt:
            logger.info("Shutting down mock sensor...")
        finally:
            self.disconnect()

if __name__ == "__main__":
    sensor = MockZebraSensor()
    sensor.connect()
    sensor.run_simulation()
