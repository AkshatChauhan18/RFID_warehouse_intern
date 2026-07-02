# ? New file created for Zebra MQTT client
import json
import logging

import paho.mqtt.client as mqtt

logger = logging.getLogger(__name__)

CONTROL_TOPIC = "c-req"
RESPONSE_TOPIC = "c-res"
DATA_TOPIC = "d-evt"
MANAGEMENT_TOPIC = "m-evt"

class ZebraMQTTClient:
    # ? Initializes the MQTT client with a callback for tag events
    def __init__(self, broker="localhost", port=1883, on_tag_callback=None):
        self._broker = broker
        self._port = port
        self.on_tag_callback = on_tag_callback

        self._client = mqtt.Client(
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2
        )
        self._client.on_connect = self._on_connect
        self._client.on_disconnect = self._on_disconnect
        self._client.on_message = self._on_message

    def connect(self):
        # ? Connects to broker and starts background loop
        logger.info("MQTT: Connecting to %s:%s", self._broker, self._port)
        self._client.connect(self._broker, self._port, keepalive=60)
        self._client.loop_start()

    def disconnect(self):
        # ? Stops inventory and background loop before disconnecting
        try:
            self.stop_inventory()
        except Exception:
            pass
        self._client.loop_stop()
        self._client.disconnect()
        logger.info("MQTT: Disconnected")

    def start_inventory(self):
        # ? Sends start command to reader
        command = {
            "command": "start",
            "command_id": "1",
            "payload": {"doNotPersistState": True},
        }
        self._client.publish(CONTROL_TOPIC, json.dumps(command), qos=1)
        logger.info("MQTT: START published")

    def stop_inventory(self):
        # ? Sends stop command to reader
        command = {"command": "stop", "command_id": "2", "payload": {}}
        self._client.publish(CONTROL_TOPIC, json.dumps(command), qos=1)
        logger.info("MQTT: STOP published")

    def _on_connect(self, client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            logger.error("MQTT: Connection failed: %s", reason_code)
            return
        logger.info("MQTT: Connected")
        client.subscribe(RESPONSE_TOPIC)
        client.subscribe(DATA_TOPIC)
        client.subscribe(MANAGEMENT_TOPIC)

    def _on_disconnect(self, client, userdata, flags, reason_code, properties):
        logger.info("MQTT: Disconnected from broker")

    def _on_message(self, client, userdata, msg):
        try:
            payload = json.loads(msg.payload.decode())
        except Exception:
            return

        if msg.topic == RESPONSE_TOPIC:
            logger.info("MQTT: Response: %s", json.dumps(payload))
            return

        if msg.topic == DATA_TOPIC:
            if payload.get("type") != "INVENTORY":
                return
            tag = payload.get("data", {})
            uid = tag.get("idHex")
            antenna = tag.get("antenna", 0)
            rssi = tag.get("peakRssi", 0)
            
            # ? Calls the callback when a new tag is scanned
            if uid and self.on_tag_callback:
                self.on_tag_callback(uid, antenna, rssi)
            return

        if msg.topic == MANAGEMENT_TOPIC:
            if payload.get("type") != "heartbeat":
                logger.info("MQTT: Mgmt event: %s", payload.get("type"))
