#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecureBearSSL.h>
#include <DHT.h>
#include <time.h>

// ---------------- WIFI ----------------
const char* ssid = "Free Virus WiFi";
const char* password = "1q2w3e4r5t";

// ---------------- BACKEND (HTTPS) ----------------
const char* postUrl =
"https://vegetable-explosion-roles-kinase.trycloudflare.com/data/thermostat";

const char* statusUrl =
"https://vegetable-explosion-roles-kinase.trycloudflare.com/thermostat/1/status";

// ---------------- DHT ----------------
#define DHTPIN 14
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// ---------------- LED ----------------
#define LED_PIN 12

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
    delay(1000);
  } else {
    Serial.println("\nWiFi FAILED");
  }
}

// ---------------- NTP TIME SYNC ----------------
void syncTime() {

  configTime(0, 0, "pool.ntp.org", "time.nist.gov");

  Serial.print("Syncing time");

  unsigned long start = millis();
  time_t now = time(nullptr);

  while (now < 8 * 3600 * 2 && millis() - start < 10000) {
    delay(500);
    Serial.print(".");
    now = time(nullptr);
  }

  if (now < 8 * 3600 * 2) {
    Serial.println("\nTime sync FAILED — continuing anyway");
  } else {
    Serial.println("\nTime synced: " + String(ctime(&now)));
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

  BearSSL::WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);

  HTTPClient http;

  http.setTimeout(15000);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!http.begin(client, postUrl)) {
    Serial.println("HTTP begin failed (POST)");
    return;
  }

  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"thermostat_id\":1,";
  json += "\"temp_ambient\":" + String(temp, 2) + ",";
  json += "\"humidity\":" + String(hum, 2);
  json += "}";

  int code = http.POST(json);

  Serial.print("POST code: ");
  Serial.println(code);

  if (code < 0) {
    Serial.print("POST error: ");
    Serial.println(http.errorToString(code));
  }

  http.end();
}

// ---------------- CHECK STATUS ----------------
void checkStatus() {

  if (WiFi.status() != WL_CONNECTED) return;

  BearSSL::WiFiClientSecure client;
  client.setInsecure();
  client.setBufferSizes(4096, 512);

  HTTPClient http;

  http.setTimeout(15000);
  http.setReuse(false);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  if (!http.begin(client, statusUrl)) {
    Serial.println("HTTP begin failed (GET)");
    return;
  }

  int code = http.GET();

  Serial.print("GET code: ");
  Serial.println(code);

  if (code == 200) {

    String payload = http.getString();
    Serial.println("Status: " + payload);

    deviceOnline = (payload.indexOf("0") == -1);

  } else {
    Serial.print("GET error: ");
    Serial.println(http.errorToString(code));
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
  syncTime();
}

// ---------------- LOOP ----------------
void loop() {

  digitalWrite(LED_PIN, deviceOnline ? HIGH : LOW);

  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    syncTime();
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