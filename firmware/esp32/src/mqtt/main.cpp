#include <Arduino.h>
#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>

#include "ir_emit.h"

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy include/secrets.h.example to include/secrets.h and fill WiFi/MQTT credentials"
#endif

namespace {
constexpr uint32_t kWifiReconnectMs = 5000;
constexpr uint32_t kMqttReconnectMs = 5000;
constexpr size_t kMqttBufferSize = 1024;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

String commandTopic;
String stateTopic;
String statusTopic;

bool lastPowerKnown = false;
bool lastPower = false;

unsigned long lastWifiAttemptMs = 0;
unsigned long lastMqttAttemptMs = 0;

String topicFor(const char* suffix) {
  return String(F("smartac/device/")) + MQTT_CONTROLLER_ID + suffix;
}

void logLine(const __FlashStringHelper* message) {
  Serial.println(message);
}

void publishStatus(const bool online) {
  StaticJsonDocument<64> doc;
  doc["online"] = online;
  char payload[64];
  const size_t len = serializeJson(doc, payload, sizeof(payload));
  mqtt.publish(statusTopic.c_str(), reinterpret_cast<const uint8_t*>(payload), len,
               true);
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return true;
  }

  logLine(F("WiFi: connecting..."));
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  const uint32_t startMs = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startMs < 15000) {
    delay(250);
    Serial.print(F("."));
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    logLine(F("WiFi: failed"));
    return false;
  }

  Serial.print(F("WiFi: "));
  Serial.println(WiFi.localIP());
  return true;
}

void ensureWifi() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastWifiAttemptMs < kWifiReconnectMs) {
    return;
  }

  lastWifiAttemptMs = now;
  connectWifi();
}

bool connectMqtt() {
  if (!connectWifi()) {
    return false;
  }

  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(kMqttBufferSize);

  logLine(F("MQTT: connecting..."));
  const bool connected = mqtt.connect(
      MQTT_CONTROLLER_ID, MQTT_USERNAME, MQTT_PASSWORD,
      statusTopic.c_str(), 1, true, R"({"online":false})");

  if (!connected) {
    Serial.print(F("MQTT: failed, rc="));
    Serial.println(mqtt.state());
    return false;
  }

  logLine(F("MQTT: connected"));
  mqtt.subscribe(commandTopic.c_str());
  publishStatus(true);
  return true;
}

void ensureMqtt() {
  if (mqtt.connected()) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastMqttAttemptMs < kMqttReconnectMs) {
    return;
  }

  lastMqttAttemptMs = now;
  connectMqtt();
}

bool readBoolField(JsonObjectConst obj, const char* key, bool& out) {
  if (!obj[key].is<bool>()) {
    return false;
  }
  out = obj[key].as<bool>();
  return true;
}

bool emitForPowerChange(const bool targetPower) {
  if (lastPowerKnown && lastPower == targetPower) {
    Serial.println(F("IR: power unchanged, skip emit"));
    return true;
  }

  if (!irEmitPower(targetPower)) {
    return false;
  }

  lastPowerKnown = true;
  lastPower = targetPower;
  return true;
}

void publishStateResponse(const char* deviceId, const char* requestId,
                          const bool success, JsonObjectConst state) {
  StaticJsonDocument<512> doc;
  doc["deviceId"] = deviceId;
  doc["requestId"] = requestId;
  doc["success"] = success;
  doc["state"] = state;

  char payload[512];
  const size_t len = serializeJson(doc, payload, sizeof(payload));
  mqtt.publish(stateTopic.c_str(), reinterpret_cast<const uint8_t*>(payload), len);
}

void handleSetState(JsonObjectConst root) {
  const char* deviceId = root["deviceId"] | "";
  const char* requestId = root["requestId"] | "";
  const char* command = root["command"] | "";

  if (strcmp(command, "setState") != 0) {
    Serial.println(F("MQTT: unknown command"));
    return;
  }

  JsonObjectConst state = root["state"];
  if (state.isNull()) {
    Serial.println(F("MQTT: missing state"));
    return;
  }

  bool targetPower = false;
  if (!readBoolField(state, "power", targetPower)) {
    Serial.println(F("MQTT: missing state.power"));
    return;
  }

  const bool irOk = emitForPowerChange(targetPower);
  if (!irOk) {
    publishStateResponse(deviceId, requestId, false, state);
    return;
  }

  // Temp/mode/fan: replay RAW no escala; ver docs/IR-JOHNSON.md
  if (targetPower) {
    Serial.println(
        F("MQTT: only power IR in this build; temp/mode need COOLIX encoder"));
  }

  publishStateResponse(deviceId, requestId, true, state);
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  (void)topic;

  StaticJsonDocument<768> doc;
  const DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print(F("MQTT: JSON parse error: "));
    Serial.println(error.c_str());
    return;
  }

  handleSetState(doc.as<JsonObjectConst>());
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(2000);

  commandTopic = topicFor("/command");
  stateTopic = topicFor("/state");
  statusTopic = topicFor("/status");

  irEmitBegin();

  Serial.println();
  logLine(F("=== BOOT OK (mqtt) ==="));
  Serial.println(F("Smart AC — Fases 4-5: WiFi + MQTT + IR (power)"));

  connectWifi();
  mqtt.setCallback(onMqttMessage);
  connectMqtt();
}

void loop() {
  ensureWifi();
  ensureMqtt();

  if (mqtt.connected()) {
    mqtt.loop();
  }
}
