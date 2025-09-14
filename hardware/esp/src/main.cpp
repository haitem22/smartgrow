#include <Arduino.h>
#include <WiFiManager.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <esp_task_wdt.h>
#include <ArduinoJson.h>
#include "utilities.h"

#define EEPROM_SIZE 512
#define SERVER_URL_ADDR 0
#define MQTT_TOPIC_CONTROL "pump/control"

// MQTT settings
char mqttServer[16] = "192.168.137.114"; // Default to IP, updated by WiFiManager
int mqttPort = 1883;

// Timing settings
bool sensorsStarted = false;
unsigned long lastStartReadingAttempt = 0;
const unsigned long START_READING_INTERVAL = 5000;
int startReadingAttempts = 0;
const int MAX_START_READING_ATTEMPTS = 5;

// Pump control state
bool pumpRunning = false;
unsigned long pumpStartTime = 0;
float pumpDuration = 0;

WiFiClient espClient;
PubSubClient client(espClient);
String serverURL = "http://192.168.137.114:3000";
String deviceId = WiFi.macAddress();

void callback(char* topic, byte* payload, unsigned int length) {
  Serial.println("Processing MQTT callback");
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("Received MQTT message on " + String(topic) + ": " + message);

  if (String(topic) == MQTT_TOPIC_CONTROL) {
    DynamicJsonDocument doc(128);
    DeserializationError error = deserializeJson(doc, message);
    if (error) {
      Serial.println("JSON parsing error: " + String(error.c_str()));
      return;
    }
    String pump = doc["pump"];
    float duration = doc["duration"];
    Serial.println("Pump: " + pump + ", Duration: " + String(duration));

    if (pump == "ON" && duration > 0) {
      if (pumpRunning) {
        Serial.println("Pump already running, ignoring new ON command");
      } else {
        Serial2.println("PUMP ON");
        duration = duration * 3600;
        Serial.println("Sending 'PUMP ON' to Arduino for " + String(duration) + " seconds");
        pumpRunning = true;
        pumpStartTime = millis();
        pumpDuration = duration;
      }
    } else if (pump == "OFF") {
      if (pumpRunning) {
        Serial2.println("PUMP OFF");
        Serial.println("Sending 'PUMP OFF' to Arduino");
        pumpRunning = false;
      }
    }
  }
  esp_task_wdt_reset();
}

void setupWiFi() {
  Serial.println("Starting WiFi setup");
  WiFiManager wm;
  wm.resetSettings(); // Uncomment for debugging, remove after testing
  wm.setConfigPortalTimeout(300);
  wm.setTimeout(360);
  WiFiManagerParameter customServerURL("server", "Server URL", "192.168.137.114", 16);
  wm.addParameter(&customServerURL);

  esp_task_wdt_deinit();
  esp_task_wdt_init(360, true);
  esp_task_wdt_add(NULL);

  if (!wm.autoConnect("SmartGrow", "password")) {
    Serial.println("Failed to connect to WiFi, halting...");
    while (1); // Halt instead of restart for debugging
  }

  String newServerURL = customServerURL.getValue();
  if (newServerURL.length() > 0 && newServerURL != serverURL) {
    serverURL = "http://" + newServerURL + ":3000";
    strncpy(mqttServer, newServerURL.c_str(), sizeof(mqttServer) - 1);
    mqttServer[sizeof(mqttServer) - 1] = '\0';
    writeStringToEEPROM(SERVER_URL_ADDR, serverURL);
    Serial.println("Server URL updated: " + serverURL);
    Serial.println("MQTT Server set to: " + String(mqttServer));
  } else {
    Serial.println("Using default MQTT Server: " + String(mqttServer));
  }

  Serial.println("Gateway: " + WiFi.gatewayIP().toString());
  Serial.println("DNS: " + WiFi.dnsIP().toString());

  esp_task_wdt_deinit();
  esp_task_wdt_init(10, true);
  esp_task_wdt_add(NULL);

  Serial.println("Connected to WiFi");
  Serial.println("Server URL: " + serverURL);
  Serial.println("Device ID: " + deviceId);
}

void setup() {
  Serial.begin(115200);
  Serial.println("Setup started");
  Serial2.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("Serial2 initialized");
  EEPROM.begin(EEPROM_SIZE);
  Serial.println("EEPROM initialized");

  serverURL = readStringFromEEPROM(SERVER_URL_ADDR);
  Serial.println("Server URL from EEPROM: " + serverURL);
  setupWiFi();
  Serial.println("WiFi setup completed");
  Serial.print("Setting up MQTT with server: ");
  Serial.println(mqttServer);
  setupMQTT(client, mqttServer, mqttPort);
  Serial.println("MQTT setup completed");
  client.setCallback(callback);
  Serial.println("Callback set");

  Serial2.println("START_READING");
  Serial2.flush();
  delay(100);
  Serial.println("Sent 'START_READING' to Arduino");
  lastStartReadingAttempt = millis();
  startReadingAttempts = 1;

  Serial.println("Setup completed");
}

void loop() {
  Serial.println("Starting loop iteration");
  esp_task_wdt_reset();

  if (!client.connected()) {
    Serial.println("Attempting MQTT reconnection...");
    Serial.print("Current MQTT server: ");
    Serial.println(mqttServer);
    if (reconnectMQTT(client, mqttServer, mqttPort)) {
      Serial.println("MQTT reconnected");
    } else {
      Serial.print("MQTT connection failed, state: ");
      Serial.println(client.state());
    }
  } else {
    client.loop();
  }
  esp_task_wdt_reset();

  if (!sensorsStarted && startReadingAttempts < MAX_START_READING_ATTEMPTS && millis() - lastStartReadingAttempt >= START_READING_INTERVAL) {
    Serial2.println("START_READING");
    Serial2.flush();
    delay(100);
    Serial.println("Retrying 'START_READING' to Arduino (attempt " + String(startReadingAttempts + 1) + ")");
    lastStartReadingAttempt = millis();
    startReadingAttempts++;
  } else if (sensorsStarted && startReadingAttempts >= MAX_START_READING_ATTEMPTS) {
    Serial.println("Max retry attempts reached, stopping START_READING retries");
  }

  String data = "";
  unsigned long serialStart = millis();
  while (Serial2.available() && millis() - serialStart < 1000) {
    data += (char)Serial2.read();
    delay(1);
  }
  if (data.length() > 0) {
    data.trim();
    Serial.println("Raw data from Arduino: " + data);

    if (data == "ACK_START_READING") {
      Serial.println("Arduino acknowledged START_READING");
      sensorsStarted = true;
    } else if (data.indexOf("{") != -1) { // Check for JSON presence
      int jsonStart = data.indexOf("{");
      int jsonEnd = data.lastIndexOf("}");
      if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
        String jsonData = data.substring(jsonStart, jsonEnd + 1);
        Serial.println("Extracted JSON: " + jsonData);
        DynamicJsonDocument doc(128);
        DeserializationError error = deserializeJson(doc, jsonData);
        if (!error) {
          float temperature = doc["TEMP"];
          float airHumidity = doc["HUM"];
          int soilSensorValue = doc["SOIL"];
          int soilMoisturePercent = doc["SOIL_PERCENT"];
          Serial.print("Parsed - Temperature: ");
          Serial.print(temperature);
          Serial.print(" °C, Humidity: ");
          Serial.print(airHumidity);
          Serial.print(" %, Soil Moisture (%): ");
          Serial.print(soilMoisturePercent);
          Serial.println("%");

          sendSensorData(client, temperature, airHumidity, soilSensorValue, soilMoisturePercent, mqttServer, mqttPort, deviceId);
          sensorsStarted = true;
        } else {
          Serial.println("Failed to parse JSON: " + String(error.c_str()));
        }
      } else {
        Serial.println("No valid JSON found in data");
      }
    }
    esp_task_wdt_reset();
  }

  Serial.println("End of loop iteration");
  esp_task_wdt_reset();
  delay(3000);
}