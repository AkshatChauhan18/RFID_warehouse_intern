import json
import signal
import sys
import paho.mqtt.client as mqtt

# ==========================================================
# MQTT Configuration
# ==========================================================

BROKER = "localhost"
PORT = 1883

CONTROL_TOPIC = "c-req"
RESPONSE_TOPIC = "c-res"
DATA_TOPIC = "d-evt"
MANAGEMENT_TOPIC = "m-evt"

# ==========================================================
# Commands
# ==========================================================

def start_inventory(client):
    command = {
        "command": "start",
        "command_id": "1",
        "payload": {
            "doNotPersistState": True
        }
    }

    info = client.publish(
        CONTROL_TOPIC,
        json.dumps(command),
        qos=1
    )

    print(">> START command published")


def stop_inventory(client):
    command = {
        "command": "stop",
        "command_id": "2",
        "payload": {}
    }

    client.publish(
        CONTROL_TOPIC,
        json.dumps(command),
        qos=1
    )

    print(">> STOP command published")


# ==========================================================
# MQTT Callbacks
# ==========================================================

def on_connect(client, userdata, flags, reason_code, properties):
    print(f"\nConnected : {reason_code}")

    if reason_code.is_failure:
        print("Connection Failed")
        return

    client.subscribe(RESPONSE_TOPIC)
    client.subscribe(DATA_TOPIC)
    client.subscribe(MANAGEMENT_TOPIC)

    print("Subscribed to:")
    print(f"  {RESPONSE_TOPIC}")
    print(f"  {DATA_TOPIC}")
    print(f"  {MANAGEMENT_TOPIC}")

    start_inventory(client)


def on_disconnect(client, userdata, disconnect_flags, reason_code, properties):
    print("\nDisconnected from broker")


def on_message(client, userdata, msg):

    try:
        payload = json.loads(msg.payload.decode())

    except Exception:
        print(msg.topic, msg.payload.decode(errors="ignore"))
        return

    # ---------------------------------------------------
    # Control Responses
    # ---------------------------------------------------

    if msg.topic == RESPONSE_TOPIC:

        print("\n========== CONTROL RESPONSE ==========")
        print(json.dumps(payload, indent=4))
        print("======================================")

        return

    # ---------------------------------------------------
    # Tag Reads
    # ---------------------------------------------------

    if msg.topic == DATA_TOPIC:

        if payload.get("type") != "INVENTORY":
            return

        tag = payload.get("data", {})

        print(
            "\n------------------------------"
        )

        print(f"Timestamp : {payload.get('timestamp')}")
        print(f"EPC       : {tag.get('idHex')}")
        print(f"Antenna   : {tag.get('antenna')}")
        print(f"RSSI      : {tag.get('peakRssi')} dBm")
        print(f"Reads     : {tag.get('reads')}")
        print(f"Event No. : {tag.get('eventNum')}")

        print("------------------------------")

        return

    # ---------------------------------------------------
    # Management Events
    # ---------------------------------------------------

    if msg.topic == MANAGEMENT_TOPIC:

        event_type = payload.get("type")

        # Ignore heartbeat spam
        if event_type == "heartbeat":
            return

        print("\n========== MANAGEMENT EVENT ==========")
        print(json.dumps(payload, indent=4))
        print("======================================")

        return


# ==========================================================
# Shutdown
# ==========================================================

client = mqtt.Client(
    callback_api_version=mqtt.CallbackAPIVersion.VERSION2
)

client.on_connect = on_connect
client.on_disconnect = on_disconnect
client.on_message = on_message


def shutdown(sig=None, frame=None):
    print("\nStopping inventory...")

    try:
        stop_inventory(client)
    except Exception:
        pass

    client.disconnect()

    sys.exit(0)


signal.signal(signal.SIGINT, shutdown)

# ==========================================================
# Main
# ==========================================================

try:

    print("Connecting to broker...")

    client.connect(BROKER, PORT, keepalive=60)

    client.loop_forever()

except KeyboardInterrupt:
    shutdown()

except Exception as e:
    print(e)