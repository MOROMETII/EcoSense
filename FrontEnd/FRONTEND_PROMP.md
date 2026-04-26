[12:43, 4/26/2026] +40 740 550 505: POST /floors
Auth: Bearer <token>
{
  "level": 0,
  "label": "Ground Floor"
}

GET /floors
Auth: Bearer <token>
(no body)

POST /floors/1/rooms
Auth: Bearer <token>
{
  "name": "Server Room"
}

GET /floors/1/rooms
Auth: Bearer <token>
(no body)

POST /rooms/1/sockets
Auth: Bearer <token>
{
  "name": "SKT_01",
  "x_norm": 0.3,
  "y_norm": 0.5,
  "ip_address": "192.168.1.101"   ← optional
}

GET /rooms/1/sockets
Auth: Bearer <token>
(no body)

PATCH /sockets/1
Auth: Bearer <token>
{
  "name": "SKT_01 renamed",        ← optional
  "ip_address": "192.168.1.202",   ← optional
  "is_online": true,               ← optional
  "x_norm": 0.4,                   ← optional
  "y_norm": 0.6                    ← optional
}
(send only the fields you want to change)

DELETE /sockets/1
Auth: Bearer <token>
(no body)

POST /rooms/1/thermostats
Auth: Bearer <token>
{
  "name": "Thermostat Room 1",
  "x_norm": 0.9,
  "y_norm": 0.1,
  "ip_address": "192.168.1.201"   ← optional
}

GET /rooms/1/thermostats
Auth: Bearer <token>
(no body)

PATCH /thermostats/1
Auth: Bearer <token>
{
  "name": "Thermostat renamed",    ← optional
  "ip_address": "192.168.1.202",   ← optional
  "is_online": false,              ← optional
  "x_norm": 0.8,                   ← optional
  "y_norm": 0.2                    ← optional
}
(send only the fields you want to change)

DELETE /thermostats/1
Auth: Bearer <token>
(no body)

POST /rooms/1/objects
Auth: Bearer <token>
{
  "type": "DOOR",                  ← "DOOR" or "WINDOW" (case-insensitive, normalised server-side)
  "wall_side": "bottom",           ← "top" | "bottom" | "left" | "right"
  "wall_offset": 0.5,             ← 0.0 to 1.0
  "is_open": false                 ← optional, defaults to false
}

GET /rooms/1/objects
Auth: Bearer <token>
(no body)
[12:46, 4/26/2026] +40 740 550 505: POST /register
(no auth needed)
{
  "username": "irina",
  "mail": "irina@ecosense.io",
  "password": "secret123"
}

GET /login
(no auth needed)
?username=irina&password=secret123
OR
?mail=irina@ecosense.io&password=secret123

POST /logout
(no auth needed)
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "username": "irina"
}