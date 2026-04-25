#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <DHT.h>

// ---------------- WIFI ----------------
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";

// ---------------- ENDPOINTS ----------------
const char* postUrl  = "https://c615-109-166-136-76.ngrok-free.app/data/thermostat";
const char* stateUrl = "https://c615-109-166-136-76.ngrok-free.app/device/state";

// ---------------- DHT ----------------
#define DHTPIN D5
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

// ---------------- LED ----------------
#define LED_PIN D6

bool ledState = true;

// ---------------- TIMERS ----------------
unsigned long lastSend = 0;
unsigned long lastCheck = 0;

const unsigned long sendInterval = 15000; // 15 sec
const unsigned long checkInterval = 5000; // 5 sec

// ---------------- WIFI CONNECT ----------------
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

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT read failed");
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

  Serial.print("POST code: ");
  Serial.println(code);

  http.end();
}

// ---------------- CHECK SERVER STATE ----------------
void checkState() {

  WiFiClient client;
  HTTPClient http;

  http.begin(client, stateUrl);

  int code = http.GET();

  if (code == 200) {

    String payload = http.getString();

    Serial.print("State: ");
    Serial.println(payload);

    // simple parsing
    if (payload.indexOf("true") != -1) {
      ledState = true;
    } else {
      ledState = false;
    }

  } else {
    Serial.print("GET failed: ");
    Serial.println(code);
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

  // keep LED updated
  digitalWrite(LED_PIN, ledState ? HIGH : LOW);

  // send sensor data every 15s
  if (millis() - lastSend >= sendInterval) {
    lastSend = millis();
    sendData();
  }

  // check server state every 5s
  if (millis() - lastCheck >= checkInterval) {
    lastCheck = millis();
    checkState();
  }
}