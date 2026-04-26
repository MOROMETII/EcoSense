POST /register
{
  "username": "irina",
  "mail": "irina@ecosense.io",
  "password": "secret123"
}

GET /login?username=irina&password=secret123
GET /login?mail=irina@ecosense.io&password=secret123

POST /logout
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_id": 1
}

POST /register-token
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "device_id": 1,
  "user_id": 1
}

POST /notify/all
{
  "title": "EcoSense Alert",
  "body": "High energy consumption detected on Floor 2.",
  "data": {}
}

POST /notify/user/1
{
  "title": "EcoSense Alert",
  "body": "Wasteful consumption detected in Server Room.",
  "data": { "room_id": 3 }
}

POST /floors
{
  "level": 0,
  "label": "Ground Floor"
}

POST /floors/1/rooms
{
  "name": "Server Ro…
[17:56, 4/25/2026] +40 740 550 505: GET /login?username=irina&password=secret123
GET /login?mail=irina@ecosense.io&password=secret123

GET /floors
Headers:
  Authorization: Bearer <token>

GET /floors/1/rooms
Headers:
  Authorization: Bearer <token>

GET /rooms/1/sockets
Headers:
  Authorization: Bearer <token>

GET /rooms/1/thermostats
Headers:
  Authorization: Bearer <token>

GET /rooms/1/objects
Headers:
  Authorization: Bearer <token>

GET /data/thermostat/1
Headers:
  Authorization: Bearer <token>

GET /data/thermostat/1?hours=6
Headers:
  Authorization: Bearer <token>

GET /health

GET /labels

GET /routes