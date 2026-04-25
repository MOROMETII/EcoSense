#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ---------------- WIFI ----------------
const char* ssid = "Luca’s iPhone";
const char* password = "649164926";

// ---------------- BACKEND (NOW HTTP, NOT HTTPS) ----------------
const char* postUrl =
"http://c615-109-166-136-76.ngrok-free.app/data/thermostat";

String statusUrl =
"http://c615-109-166-136-76.ngrok-free.app/thermostat/1/status";

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

  Serial.println("Scanning networks...");

  int n = WiFi.scanNetworks();

  for (int i = 0; i < n; i++) {

    Serial.print(i + 1);
    Serial.print(": ");
    Serial.println(WiFi.SSID(i));

    if (WiFi.SSID(i) == String(ssid)) {
      Serial.println("SSID MATCH FOUND");
    }
  }

  Serial.println("\nConnecting...");

  WiFi.persistent(false);
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  delay(1000);

  WiFi.begin(ssid, password);

  unsigned long startAttemptTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startAttemptTime < 20000) {

    delay(500);

    Serial.print(".");
    Serial.print(" status=");
    Serial.println(WiFi.status());
  }

  if (WiFi.status() == WL_CONNECTED) {

    Serial.println("\nConnected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

  } else {

    Serial.println("\nFAILED TO CONNECT");
  }
}

// ---------------- SEND SENSOR DATA ----------------
void sendData() {

  if (!deviceOnline) return;

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

  Serial.println(json);
  int code = http.POST(json);

  Serial.print("POST code: ");
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

    deviceOnline = (payload.indexOf("false") == -1);

  } else {

    Serial.print("GET failed: ");
    Serial.println(code);
  }

  http.end();
}

// ---------------- SETUP ----------------
void setup() {

  Serial.begin(115200);

  Serial.println("=== DEVICE START ===");

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);

  dht.begin();

  connectWiFi();
}

// ---------------- LOOP ----------------
void loop() {

  digitalWrite(LED_PIN, deviceOnline ? HIGH : LOW);

  if (millis() - lastCheck >= checkInterval) {
    lastCheck = millis();
    checkStatus();
  }

  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    sendData();
  }
}