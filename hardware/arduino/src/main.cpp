#include <Arduino.h>
#include <DHT.h>
#include <ArduinoJson.h>

#define RELAY_PIN 5    // Relay pin for pump
#define MOISTURE_PIN A0 // Analog pin for YL-69 soil sensor
#define DHT_PIN 2      // Digital pin for DHT22
#define DHTTYPE DHT22

// Calibration values for YL-69 (adjust after testing)
const int dryValue = 1023; // ADC value for dry soil
const int wetValue = 0;  // ADC value for wet soil
const unsigned long SENSOR_INTERVAL = 6000; // 10 seconds

DHT dht(DHT_PIN, DHTTYPE);
bool readingSensors = false;
unsigned long lastSensorRead = 0;

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Pump OFF by default
  pinMode(MOISTURE_PIN, INPUT);
  dht.begin();
  Serial.begin(9600); // Match ESP32 Serial2 baud rate
  Serial.println("Arduino ready and waiting for commands...");
}

void loop() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    Serial.print("Received command: ");
    Serial.println(command);

    if (command == "START_READING") {
      readingSensors = true;
      Serial.println("ACK_START_READING");
    } else if (command == "PUMP ON") {
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("ACK_PUMP ON");
    } else if (command == "PUMP OFF") {
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("ACK_PUMP OFF");
    }
  }

  if (readingSensors && (millis() - lastSensorRead >= SENSOR_INTERVAL)) {
    float temperature = dht.readTemperature();
    float airHumidity = dht.readHumidity();
    int soilSensorValue = analogRead(MOISTURE_PIN);
    int soilMoisturePercent = map(soilSensorValue, dryValue, wetValue, 0, 100); // Map to 0–100% (0% = dry, 100% = wet)
    soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);
    int scaledValue = map(soilSensorValue, 48, 255, 0, 1023);
    scaledValue = constrain(scaledValue, 0, 1023);
    if (isnan(temperature) || isnan(airHumidity)) {
      Serial.println("Failed to read from DHT sensor!");
      temperature = 30.0;
      airHumidity = 40.0;
    }

    StaticJsonDocument<128> doc;
    doc["TEMP"] = temperature;
    doc["HUM"] = airHumidity;
    doc["SOIL"] = soilSensorValue;
    doc["SOIL_PERCENT"] = soilMoisturePercent;

    String output;
    serializeJson(doc, output);
    Serial.println(output);
    Serial.println(scaledValue);

    Serial.println(soilSensorValue);

    lastSensorRead = millis();
  }
}