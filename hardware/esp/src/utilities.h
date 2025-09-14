#ifndef UTILITIES_H
#define UTILITIES_H

#include <EEPROM.h>
#include <PubSubClient.h>

#define MQTT_TOPIC "sensor/data"
#define MQTT_TOPIC_CONTROL "pump/control"

String readStringFromEEPROM(int addr);
void writeStringToEEPROM(int addr, String value);
void setupMQTT(PubSubClient& client, const char* mqttServer, int mqttPort);
bool reconnectMQTT(PubSubClient& client, const char* mqttServer, int mqttPort);
void sendSensorData(PubSubClient& client, float temperature, float airHumidity, int soilSensorValue, int soilMoisturePercent, const char* mqttServer, int mqttPort, String deviceId);

#endif