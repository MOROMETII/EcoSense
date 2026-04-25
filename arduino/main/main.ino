#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ---------------- WIFI ----------------
const char* ssid = "Free Virus WiFi";
const char* password = "1q2w3e4r5t";

// ---------------- BACKEND (HTTP ONLY) ----------------
const char* postUrl =
"https://botryose-unshadily-wynell.ngrok-free.dev/data/thermostat";

const char* statusUrl =
"https://botryose-unshadily-wynell.ngrok-free.dev/thermostat/1/status";

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

  Serial.println("\nConnecting WiFi...");

  WiFi.persistent(false);
  WiFi.disconnect(true);
  WiFi.mode(WIFI_STA);
  delay(1000);

  WiFi.begin(ssid, password);

  unsigned long start = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - start < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());

    delay(1000); // stabilize network stack
  } else {
    Serial.println("\nWiFi FAILED");
  }
}

// ---------------- SEND SENSOR DATA ----------------
void sendData() {

  if (!deviceOnline) return;
  if (WiFi.status() != WL_CONNECTED) return;

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT failed");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  http.setTimeout(5000);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!http.begin(client, postUrl)) {
    Serial.println("HTTP begin failed (POST)");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");

  String json = "{";
  json += "\"thermostat_id\":1,";
  json += "\"temp_ambient\":" + String(temp, 2) + ",";
  json += "\"humidity\":" + String(hum, 2);
  json += "}";

  int code = http.POST(json);

  Serial.print("POST code: ");
  Serial.println(code);

  if (code == -1) {
    Serial.println("POST failed (network issue)");
  }

  http.end();
}

// ---------------- CHECK STATUS ----------------
void checkStatus() {

  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;

  http.setTimeout(5000);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!http.begin(client, statusUrl)) {
    Serial.println("HTTP begin failed (GET)");
    return;
  }

  http.addHeader("ngrok-skip-browser-warning", "true");

  int code = http.GET();

  Serial.print("GET code: ");
  Serial.println(code);

  if (code == 200) {

    String payload = http.getString();
    Serial.println("Status: " + payload);

    deviceOnline = (payload.indexOf("false") == -1);

  } else {
    Serial.println("GET failed");
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

  digitalWrite(LED_PIN, deviceOnline ? HIGH : LOW);

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    return;
  }

  if (millis() - lastCheck >= checkInterval) {
    lastCheck = millis();
    checkStatus();
  }

  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    sendData();
  }
}