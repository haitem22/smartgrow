#include "utilities.h"
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

#define SERVER_URL_ADDR 0  // The starting EEPROM address for the server URL
#define MQTT_TOPIC "sensor/data"

String readStringFromEEPROM(int addr) {
  String result = "";
  char character;
  while (true) {
    character = EEPROM.read(addr++);
    if (character == '\0') break;
    result += character;
  }
  return result;
}

void writeStringToEEPROM(int addr, String value) {
  for (int i = 0; i < value.length(); i++) {
    EEPROM.write(addr + i, value[i]);
  }
  EEPROM.write(addr + value.length(), '\0'); // Null-terminate the string
  EEPROM.commit(); // Save to EEPROM
  esp_task_wdt_reset(); // Reset WDT after EEPROM write
}

void setupMQTT(PubSubClient& client, const char* mqttServer, int mqttPort) {
  client.setServer(mqttServer, mqttPort);
  Serial.print("MQTT server set to: ");
  Serial.println(mqttServer);
}

bool reconnectMQTT(PubSubClient& client, const char* mqttServer, int mqttPort) {
  if (client.connected()) return true;

  Serial.print("Attempting MQTT connection to ");
  Serial.println(mqttServer);
  if (client.connect("ESP32Client", nullptr, nullptr)) {
    Serial.println("MQTT connected");
    client.subscribe("pump/control");
    return true;
  } else {
    Serial.print("MQTT connection failed, state: ");
    Serial.println(client.state());
    return false;
  }
}

void sendSensorData(PubSubClient& client, float temp, float hum, int soil, int soilPercent, const char* mqttServer, int mqttPort, String deviceId) {
  if (client.connected()) {
    StaticJsonDocument<200> doc;

    doc["t"] = temp; // Temperature
    doc["h_air"] = hum; // Air humidity
    doc["h_soil"] = soil; // Raw soil sensor value
    doc["h_soil_pourcentage"] = soilPercent; // Soil moisture percentage
    doc["deviceId"] = deviceId; // Device ID


    char payload[200];
    serializeJson(doc, payload);
    
    if (client.publish(MQTT_TOPIC, payload)) {
      Serial.printf("Published to %s: %s\n", MQTT_TOPIC, payload);
    } else {
      Serial.printf("Failed to publish to MQTT");
    }
  }
}
