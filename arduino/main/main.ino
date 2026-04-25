#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ---------------- WIFI ----------------
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

// ---------------- BACKEND ----------------
const char* postUrl = "https://c615-109-166-136-76.ngrok-free.app/data/thermostat";

// status endpoint with ID = 1
String statusUrl = "https://c615-109-166-136-76.ngrok-free.app/thermostat/1/status";

// ---------------- DHT ----------------
#define DHTPIN D5
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// ---------------- LED ----------------
#define LED_PIN D6

bool deviceOnline = true;

// ---------------- TIMING ----------------
unsigned long lastSend = 0;
unsigned long lastCheck = 0;

const unsigned long sendInterval = 15000;
const unsigned long checkInterval = 5000;

// ---------------- WIFI ----------------
void connectWiFi() {
  WiFi.begin(ssid, password);

  Serial.print("Connecting");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.println(WiFi.localIP());
}

// ---------------- SEND SENSOR DATA ----------------
void sendData() {

  if (!deviceOnline) return; // STOP SENDING IF OFFLINE

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT failed");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.begin(client, postUrl);
  http.addHeader("Content-Type", "application/json");

  String json =
    "{"
    "\"thermostat_id\":1,"
    "\"temp_ambient\":" + String(temp, 2) + ","
    "\"humidity\":" + String(hum, 2) +
    "}";

  int code = http.POST(json);

  Serial.print("POST: ");
  Serial.println(code);

  http.end();
}

// ---------------- CHECK STATUS ----------------
void checkStatus() {

  WiFiClient client;
  HTTPClient http;

  http.begin(client, statusUrl);

  int code = http.GET();

  if (code == 200) {

    String payload = http.getString();
    Serial.print("Status: ");
    Serial.println(payload);

    // SIMPLE PARSING
    if (payload.indexOf("false") != -1) {
      deviceOnline = false;
    } else {
      deviceOnline = true;
    }

  }

  http.end();
}

// ---------------- SETUP ----------------
void setup() {

  Serial.begin(115200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  dht.begin();

  connectWiFi();
}

// ---------------- LOOP ----------------
void loop() {

  // LED reflects online state
  digitalWrite(LED_PIN, deviceOnline ? HIGH : LOW);

  // check backend status every 5 sec
  if (millis() - lastCheck >= checkInterval) {
    lastCheck = millis();
    checkStatus();
  }

  // send data every 15 sec (only if online)
  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    sendData();
  }
}