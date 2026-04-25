#include "DHT.h"
#include <WiFiClientSecure.h>
#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>

#include <ESP8266HTTPClient.h>

#include <WiFiClient.h>

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

#include <OneWire.h> 
#include <DallasTemperature.h>

#define D0 16
#define D1 5
#define D2 4
#define D3 0
#define D4 2
#define D5 14
#define D6 12
#define D7 13
#define D8 15
#define D9 3
#define RX 3
#define D10 1
#define TX 1
#define D11 9
#define SD2 9
#define D12 10
#define SD3 10

#define LED_R   D6
#define LED_G   D7
#define LED_B   D8

#define WIFI_ADDR "Free Virus WiFi"
#define WIFI_PASS "1q2w3e4r5t"

#define ONE_WIRE_BUS D5         
OneWire oneWire(ONE_WIRE_BUS); 
DallasTemperature sensors(&oneWire);
int deviceCount;

String newHostname = "BlackBox2";

ESP8266WiFiMulti WiFiMulti;
static uint32_t timer;

#define DHTPIN 2 // D4
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);   // D4 ?????
  
  pinMode(LED_R, OUTPUT); 
  pinMode(LED_G, OUTPUT); 
  pinMode(LED_B, OUTPUT); 
  digitalWrite(LED_R, LOW);   
  digitalWrite(LED_G, LOW);   
  digitalWrite(LED_B, LOW);   

  digitalWrite(LED_BUILTIN, HIGH);

  Serial.begin(9600);
  Serial.println(F("DHT11 test"));
  dht.begin();

  Serial.println();
  Serial.println();
  Serial.println();


  
  for (uint8_t t = 5; t > 0; t--) {
    Serial.printf("[SETUP] WAIT %d...\n", t);
    Serial.flush();
  }

  WiFi.mode(WIFI_STA);
  WiFi.hostname(newHostname.c_str());

  for(int i=6;--i;)WiFiMulti.addAP(WIFI_ADDR, WIFI_PASS);
  sensors.begin(); 

  Serial.print("Merge");

  // locate devices on the bus
  Serial.print("Locating devices...");
  Serial.print("Found ");
  deviceCount = sensors.getDeviceCount();
  Serial.print(deviceCount, DEC);
  Serial.println(" devices.");
  Serial.println("");

  delay(1000);
  
  timer = millis() + 5000;

  while (WiFiMulti.run() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());
}

void loop() {
  Serial.print(".");
  if(millis() + 1000000 < timer)
		timer = millis() + 1000;

	if(millis() < timer){
      digitalWrite(LED_BUILTIN, LOW);   
      delay(50);
      digitalWrite(LED_BUILTIN, HIGH);   
      delay(250);

		  return;
	}
		
	timer = millis() + 20000;
  digitalWrite(LED_BUILTIN, LOW);   
  // String params = getTemperatures();
  digitalWrite(LED_BUILTIN, HIGH); 
  // In your loop() function, add headers before making the request
if ((WiFiMulti.run() == WL_CONNECTED)) {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    
    yield();
    
    String url = "https://remote-juan-flex-grow.trycloudflare.com/thermostat/1/status";
    
    if (http.begin(client, url)) {
        // ADD THESE HEADERS to bypass the warning page
        http.addHeader("ngrok-skip-browser-warning", "1");
        // Or alternatively, spoof a browser User-Agent:
        // http.addHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        
        yield();
        Serial.print("[HTTP] GET ...\n");
        
        int httpCode = http.GET();
        
        if (httpCode > 0) {
            Serial.printf("[HTTP] GET... code: %d\n", httpCode);
            
            if (httpCode == HTTP_CODE_OK) {
                String payload = http.getString();
                yield();
                Serial.println(payload.substring(0, 100));
            }
        } else {
            Serial.printf("[HTTP] GET... failed, error: %s\n", http.errorToString(httpCode).c_str());
        }
        http.end();
    }
  }
}
void printAddress(DeviceAddress deviceAddress)
{
  for (uint8_t i = 0; i < 8; i++)
  {
    // zero pad the address if necessary
    if (deviceAddress[i] < 16) Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
  }
}