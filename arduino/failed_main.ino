/**
   BasicHTTPClient.ino

    Created on: 24.05.2015

*/

//
// BOARD: NodeMCU (0.9) (ESP-12 Module)
// BOARD: NodeMCU (1.0) (ESP-12E Module)
// PORT: COM8
// 


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

/********************************************************************/ 
#define ONE_WIRE_BUS 14           // D5
// Setup a oneWire instance to communicate with any OneWire devices  
// (not just Maxim/Dallas temperature ICs) 
OneWire oneWire(ONE_WIRE_BUS); 
// Pass our oneWire reference to Dallas Temperature. 
DallasTemperature sensors(&oneWire);
int deviceCount;
/********************************************************************/ 
String newHostname = "Thermostat";

ESP8266WiFiMulti WiFiMulti;
static uint32_t timer;

LiquidCrystal_I2C lcd(0x27, 16, 2);
#define pirPin D1
int pirState = LOW;

void setup() {
  pinMode(pirPin, INPUT_PULLDOWN_16);
  lcd.begin(16, 2, LCD_5x8DOTS);
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("PIR sensor Ready!"); 
  delay(2000);
  lcd.clear();

  pinMode(LED_BUILTIN, OUTPUT);   // D4 ?????

//  pinMode(4, OUTPUT);             // D2  =  4
//  pinMode(5, OUTPUT);             // D1  =  5

  pinMode(LED_R, OUTPUT); 
  pinMode(LED_G, OUTPUT); 
  pinMode(LED_B, OUTPUT); 
  digitalWrite(LED_R, LOW);   
  digitalWrite(LED_G, LOW);   
  digitalWrite(LED_B, LOW);   

  digitalWrite(LED_BUILTIN, HIGH);   // turn the LED off (HIGH is the voltage level)

  Serial.begin(9600);
  // Serial.setDebugOutput(true);

  Serial.println();
  Serial.println();
  Serial.println();

  for (uint8_t t = 5; t > 0; t--) {
    Serial.printf("[SETUP] WAIT %d...\n", t);
    Serial.flush();
  }

  WiFi.mode(WIFI_STA);

  WiFi.hostname(newHostname.c_str());

// Completely reset WiFi settings
  //WiFiMulti.cleanAPlist();
  //WiFi.persistent(false);  // Don't save future connections
  //WiFi.disconnect(true);   // true = erase from flash
  //delay(1000);

  for(int i=6;--i;)WiFiMulti.addAP(WIFI_ADDR, WIFI_PASS);

  // Start up the library 
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

void motion_detect() {
  int motion = digitalRead(pirPin);
  motion = !motion;  // Invert the logic
  
  if (motion == HIGH && pirState == LOW) {
    // Motion just started
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Motion Detected");
    Serial.println("Motion Detected");
    pirState = HIGH;
  }
  else if (motion == LOW && pirState == HIGH) {
    // Motion just stopped
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Not Detected");
    Serial.println("Not Detected");
    pirState = LOW;
  }
  Serial.println(motion);
} 

void loop() {

  Serial.print(".");


  motion_detect();

//  int rand = random(0, 100);
//  digitalWrite(LED_R, rand % 3 == 0 ? LOW : HIGH);   
//  digitalWrite(LED_G, rand % 3 == 1 ? LOW : HIGH);   
//  digitalWrite(LED_B, rand % 3 == 2 ? LOW : HIGH);   




	if(millis() + 1000000 < timer)
		timer = millis() + 1000;

	if(millis() < timer){
      digitalWrite(LED_BUILTIN, LOW);   
      delay(50);
      digitalWrite(LED_BUILTIN, HIGH);   
      delay(250);

		  return;
	}
		
	timer = millis() + 20000; // 20 seconds

  digitalWrite(LED_BUILTIN, LOW);   
  String params = getTemperatures();
  digitalWrite(LED_BUILTIN, HIGH);   

  Serial.println(params);
  
  // wait for WiFi connection
  if ((WiFiMulti.run() == WL_CONNECTED)) {

    WiFiClient client;
    HTTPClient http;

    yield();

    String url = "http://httpbin.org/get?" + params;
    Serial.println("[HTTP] begin ... " + url);

    if (http.begin(client, url)) {  // HTTP

      yield();
      Serial.print("[HTTP] GET ...\n");

      // start connection and send HTTP header
      int httpCode = http.GET();

      yield();
      // httpCode will be negative on error
      if (httpCode > 0) {
        // HTTP header has been send and Server response header has been handled
        Serial.printf("[HTTP] GET... code: %d\n", httpCode);
        
        if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_MOVED_PERMANENTLY) {
          String payload = http.getString();
          yield();
          Serial.println(payload.substring(0, 100));
          yield();

        }else{
          digitalWrite(LED_BUILTIN, LOW);   
          delay(1000);
        }
      } else {
        Serial.printf("[HTTP] GET... failed, error: %s\n", http.errorToString(httpCode).c_str());

        digitalWrite(LED_BUILTIN, LOW);   
        delay(2000);
        digitalWrite(LED_BUILTIN, HIGH);   
        delay(2000);
      }

      http.end();
    } else {
      Serial.printf("[HTTP] Unable to connect\n");

        digitalWrite(LED_BUILTIN, LOW);   
        delay(2000);
        digitalWrite(LED_BUILTIN, HIGH);   
        delay(2000);

    }
    //delay(60 * 1000);
  }else{
    Serial.print("Not connected...\n");
        digitalWrite(LED_BUILTIN, LOW);   
        delay(2000);
        digitalWrite(LED_BUILTIN, HIGH);   
        delay(2000);
  }

}

String getTemperatures()
{

    String ret = "";
    // call sensors.requestTemperatures() to issue a global temperature 
    // request to all devices on the bus 
    /********************************************************************/
     Serial.println(""); 
     Serial.print(" Requesting temperatures..."); 
     sensors.requestTemperatures(); // Send the command to get temperature readings 
     Serial.println("DONE"); 
    /********************************************************************/
 
    for (int i = 0;  i < deviceCount;  i++)
      {
        Serial.print("Sensor ");
        Serial.print(i+1);
        Serial.print(" : ");
        float tempC = sensors.getTempCByIndex(i);

        digitalWrite(LED_R, tempC < 25 ? LOW : HIGH);   
        digitalWrite(LED_G, tempC >= 25 && tempC <= 31 ? LOW : HIGH);   
        digitalWrite(LED_B, tempC > 31 ? LOW : HIGH);   

        Serial.print(tempC);
        //Serial.print((char)176);//shows degrees character
        Serial.print(" ");//shows degrees character
        Serial.print("C  |  ");
    
        DeviceAddress addr;
        sensors.getAddress(addr, i);
        printAddress(addr);
        
        Serial.println("");

        if(i > 0)
          ret += "&";
        ret += "sid";
        for (uint8_t j = 0; j < 8; j++)
        {
          ret += String(addr[j], HEX);
        }
        ret += "=";
        ret += tempC; 
        
      }

   return ret;
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
