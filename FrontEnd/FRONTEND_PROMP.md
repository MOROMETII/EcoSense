Below is a clean **GitHub Copilot Agent script / prompt** you can paste into your repo (e.g. `COPILOT_INSTRUCTIONS.md` or agent prompt). It is structured so Copilot can reliably generate the app architecture, screens, and logic.

---

# Copilot Agent Instructions — Energy Optimization Mobile App

## Project Overview

Build a cross-platform mobile application for an energy optimization system used by companies. The system uses IoT sensors (temperature sensors + smart sockets) and AI analysis (server-side) to help reduce energy waste.

The app must allow users to:

* Manage authentication (register/login)
* View energy + temperature analytics per room
* Manage rooms and devices
* Create rooms using a 3D scan-to-2D blueprint workflow
* Place sensors in rooms (smart sockets + max 1 temperature sensor per room)
* Receive AI-generated insights and recommendations

---

## Tech Expectations

* Mobile framework: React Native (preferred) or Flutter if explicitly chosen
* Navigation: Bottom tab navigation
* State management: Redux / Zustand / Provider (choose one consistent approach)
* API layer: REST (assume backend exists)
* Clean architecture (separation of UI / services / state / models)

---

## App Structure

### Authentication Flow

1. **Login Screen**

   * Email + password
   * Login button
   * Redirect to Main App on success

2. **Register Screen**

   * Name, email, password
   * Register button
   * Redirect to Main App on success

3. Auth persistence (token stored locally)

---

## Main Navigation (Bottom Tabs)

### 1. Dashboard Tab

Purpose: Show analytics per room and AI insights

For each room display:

* Temperature (live + historical trend)
* Energy usage (live + historical trend)
* AI Suggested Action section:

  * Examples:

    * "Possible open window detected (temperature drop)"
    * "High energy usage detected from socket #3"

UI Requirements:

* Room cards list
* Each card expandable for charts
* Simple line chart for temperature and energy progression
* Highlight anomalies

---

### 2. Rooms Tab

Purpose: Manage all rooms

UI:

* List of rooms:

  * Room name
  * Edit button
  * Delete button
* First list item:

  * “+ Add Room” button

Actions:

* Add Room → navigates to Room Editor Screen
* Edit Room → opens Room Editor with existing data
* Delete Room → confirmation modal

---

## Room Editor Screen (Core Feature)

### Step 1: Room Scanning (3D → 2D conversion)

* Use camera with “WIDAR-like mode” simulation (AR placeholder acceptable if real AR not implemented)
* User scans room:

  * Walls
  * Windows
  * Doors

Button:

* “End Scan” → processes scan into 2D floor plan

---

### Step 2: Blueprint Editing

After scan completion:

* Show 2D blueprint overlay
* Allow placement of:

  * Smart sockets (multiple)
  * Temperature sensor (max 1 per room)

Rules:

* Enforce constraint: only 1 temperature sensor per room
* Smart sockets unlimited

UI tools:

* Drag & drop placement
* Tap to remove device

---

### Step 3: Final Actions

Buttons:

* Cancel → discard room creation and return to Rooms tab
* Save → open prompt:

  * Input: Room Name
  * Confirm Save

On save:

* Persist room + layout + devices
* Redirect to Rooms list

---

## Settings Tab

* User profile info
* Logout button
* Optional:

  * Theme toggle
  * Notification preferences

---

## Data Models (Important)

### User

* id
* name
* email
* token

### Room

* id
* name
* devices[]
* blueprint (2D map data)
* scanData (raw 3D scan optional)
* analytics (temperature + energy history)

### Device

* id
* type: "smart_socket" | "temperature_sensor"
* position (x, y on blueprint)
* energyUsage (if smart socket)
* temperature (if sensor)

---

## AI Integration (Mock Interface)

Assume backend endpoint:

* `/ai/analyze-room`

Returns:

* anomalies[]
* suggestions[]
* energy insights

Example:

```json
{
  "suggestions": [
    "High energy usage detected in Room A - Socket 2",
    "Possible open window detected due to temperature drop"
  ]
}
```

---

## Key UI Requirements

* Clean dashboard-first design
* Fast room switching
* Visual clarity for energy data
* Highlight anomalies in red/orange
* Charts required for time-series data
* Mobile-first UX

---

## Non-Functional Requirements

* Smooth navigation between tabs
* Offline-safe state caching (basic)
* Modular code structure
* Reusable components (RoomCard, DeviceMarker, ChartView)

---

## Implementation Priority

1. Auth screens
2. Navigation + tab structure
3. Rooms CRUD
4. Dashboard analytics UI
5. Room Editor (scan → blueprint → placement)
6. AI suggestions integration
7. Settings

---

If you want, I can also convert this into:

* a full **React Native folder structure**
* or **actual starter code (Expo project + navigation + screens skeleton)**
