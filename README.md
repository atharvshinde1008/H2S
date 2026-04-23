# 🚨 PulseNet — Emergency Response Platform

> **In emergencies, delay and miscommunication are the real enemies — not chaos.**

PulseNet is a real-time emergency response web application that enables **one-tap SOS**, **live location sharing**, **nearby user alerts**, and a **crisis map** — putting life-saving coordination at everyone's fingertips.

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Solution](#-solution)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [App Screens](#-app-screens)
- [Architecture](#-architecture)
- [Real-Time Flow](#-real-time-flow)
- [API Reference](#-api-reference)
- [Socket.IO Events](#-socketio-events)
- [Data Models](#-data-models)
- [Design System](#-design-system)
- [Multi-User Testing](#-multi-user-testing)
- [Future Roadmap](#-future-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🔴 Problem Statement

During emergencies (medical, fire, harassment, accidents), people face three critical barriers:

| Barrier | Impact |
|---------|--------|
| **Don't know whom to contact** | Precious seconds wasted searching for help |
| **Don't know what info to share** | Incomplete data slows responder decisions |
| **Can't coordinate with nearby people** | Bystanders who could help remain unaware |

Meanwhile, **first responders lack real-time ground-level data**, making it harder to assess severity, locate victims, and deploy resources efficiently.

---

## 💡 Solution

PulseNet bridges the gap between **victims**, **bystanders**, and **responders** with:

- **One-tap SOS** — Trigger an emergency alert with a single long-press (2 seconds)
- **Automatic location sharing** — GPS coordinates sent instantly
- **Nearby user alerts** — People within ~3km get full-screen alerts
- **Crisis map** — Live visualization of active incidents and nearby users
- **Zero-friction design** — Dark UI optimized for panic situations

---

## 🔑 Key Features

### 🚨 One-Tap SOS
- Giant SOS button occupying ~40% of the screen
- **Long-press (2 seconds)** to prevent accidental triggers
- Animated progress ring shows hold progress
- Haptic feedback (vibration) on trigger
- 4 emergency types: Medical, Fire, Harassment/Threat, Accident

### 📍 Live Location Sharing
- Continuous GPS tracking via `navigator.geolocation.watchPosition()`
- Location updates emitted every 5 seconds via WebSocket
- Graceful fallback when GPS is denied or unavailable

### 👥 Nearby User Alert System
- Geo-grid system divides the map into ~1km² cells
- SOS broadcasts to the user's cell + 8 adjacent cells (~9km² coverage area)
- Full-screen alert overlay with distance and "I Can Help" action
- Haptic feedback on incoming alerts

### 🗺️ Crisis Map
- Dark-themed Leaflet.js map (CARTO dark tiles)
- Color-coded incident markers with pulse animations for active incidents
- Blue dots for nearby users, green dot for self
- Real-time marker updates via Socket.IO

### 👤 Profile & Emergency Contacts
- Store emergency contacts locally
- Quick-dial police (112) and family
- Volunteer registration toggle
- Location sharing preferences

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Node.js + TypeScript | Server runtime with type safety |
| **Framework** | Express.js | HTTP server + REST API |
| **Real-time** | Socket.IO | Bidirectional WebSocket communication |
| **Database** | In-memory (Map) | Prototype storage (Firestore-ready structure) |
| **Auth** | localStorage mock | Prototype auth (Firebase Auth-ready) |
| **Frontend** | Vanilla HTML/CSS/JS | Zero-dependency, mobile-first UI |
| **Maps** | Leaflet.js + CARTO | Free, no API key required |
| **Fonts** | Inter (Google Fonts) | Clean, readable in stress situations |

---

## 📁 Project Structure

```
PulseNet/
│
├── package.json                          # Root workspace config
├── README.md                             # This documentation
│
├── server/                               # Backend (Node.js + TypeScript)
│   ├── package.json                      # Server dependencies
│   ├── tsconfig.json                     # TypeScript configuration
│   └── src/
│       ├── index.ts                      # 🚀 Server entry point
│       │                                 #    Express + Socket.IO + static serving
│       │
│       ├── types/
│       │   └── index.ts                  # 📋 Shared TypeScript interfaces
│       │                                 #    Incident, UserLocation, Payloads
│       │
│       ├── services/
│       │   ├── incident.service.ts       # 📝 Incident CRUD operations
│       │   │                             #    Create, resolve, add responders
│       │   ├── location.service.ts       # 📍 Location tracking + geo-grid
│       │   │                             #    Grid cells, distance calc, Haversine
│       │   └── alert.service.ts          # 🔔 Nearby user discovery + alerting
│       │                                 #    Find users in adjacent grid cells
│       │
│       ├── sockets/
│       │   ├── handler.ts                # ⚡ Socket.IO event handlers
│       │   │                             #    SOS lifecycle, location updates
│       │   └── rooms.ts                  # 🏠 Geo-grid room management
│       │                                 #    Auto-join/leave based on location
│       │
│       └── routes/
│           ├── incidents.ts              # 🔗 REST: GET /api/incidents
│           └── users.ts                  # 🔗 REST: GET/PATCH /api/users/me
│
└── client/                               # Frontend (Vanilla HTML/CSS/JS)
    ├── index.html                        # 🔐 Auth / Landing page
    ├── dashboard.html                    # 📱 Main app (4 screens + bottom nav)
    │
    ├── css/
    │   └── style.css                     # 🎨 Complete design system
    │                                     #    Dark theme, glassmorphism, animations
    │
    └── js/
        ├── auth.js                       # 🔐 Authentication module
        │                                 #    Mock auth with localStorage
        ├── socket.js                     # 🔌 Socket.IO client wrapper
        │                                 #    Connection management + event bus
        ├── location.js                   # 📍 GPS tracking module
        │                                 #    watchPosition + throttled updates
        ├── map.js                        # 🗺️ Leaflet crisis map
        │                                 #    Markers, popups, dark tiles
        ├── sos.js                        # 🚨 SOS trigger module
        │                                 #    Long-press, progress ring, lifecycle
        ├── alerts.js                     # 🔔 Alerts feed module
        │                                 #    Cards, overlay, respond actions
        ├── profile.js                    # 👤 Profile & settings module
        │                                 #    Contacts, volunteer, logout
        └── app.js                        # 🚀 App initialization
                                          #    Auth guard, module wiring, nav
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ ([download](https://nodejs.org/))
- **npm** v9+ (comes with Node.js)
- A modern web browser (Chrome, Firefox, Edge)

### Installation

```bash
# 1. Clone/navigate to the project
cd d:\PulseNet

# 2. Install server dependencies
cd server
npm install

# 3. Start the development server
npm run dev
```

### Access the App

Open your browser and navigate to:

```
http://localhost:3000
```

### Quick Start Flow

1. **Landing Page** → Enter your name and phone number
2. **Dashboard** → You land on the Home screen with the SOS button
3. **Allow Location** → Grant GPS permission when prompted
4. **Explore** → Navigate between Home, Map, Alerts, and Profile tabs

---

## 📱 App Screens

### Screen 1: 🏠 Home (SOS Dashboard)

The heart of the app. Designed for **immediate action** under stress.

```
┌─────────────────────────────────────┐
│  PulseNet  🟢           🔔  👤          │  ← Header + connection status
├─────────────────────────────────────┤
│  🟢 You're Safe                    │  ← Status indicator
│  📍 Location: Active               │  ← GPS status
│  👥 3 users nearby                 │  ← Nearby count
├─────────────────────────────────────┤
│  [🏥 Medical] [🔥 Fire]           │
│  [⚠️ Threat] [🚗 Accident]        │  ← Emergency type selector
├─────────────────────────────────────┤
│                                     │
│         ╔═══════════════╗           │
│         ║               ║           │
│         ║    🔴 SOS     ║           │  ← Giant pulsing button
│         ║               ║           │      (~40% of screen)
│         ╚═══════════════╝           │
│                                     │
│    Hold for 2 seconds to trigger    │
├─────────────────────────────────────┤
│  ⚡ Quick Actions                   │
│  [🚔 Call Police] [👨‍👩‍👧 Call Family] │
└─────────────────────────────────────┘
```

**SOS Button Behavior:**
- **Long-press 2 seconds** → Progress ring fills → SOS triggered
- **Release early** → Cancelled, no SOS sent
- **During emergency** → Screen transforms to "Help is Coming" state with responder list

### Screen 2: 🗺️ Live Map

Operational intelligence at a glance.

| Marker | Color | Meaning |
|--------|-------|---------|
| 🔴 | Red | Active SOS alert (pulses) |
| 🟠 | Orange | Fire emergency |
| 🟣 | Purple | Harassment/Threat |
| 🔵 | Blue | Nearby users |
| 🟢 | Green | Your location |

**Features:**
- Dark CARTO tiles matching the UI theme
- Tap any marker → popup with details (type, time, responder count)
- "Go to My Location" FAB button
- Real-time marker updates as incidents happen

### Screen 3: 🔔 Alerts Feed

Real-time emergency event stream.

- **Sorted by:** Active → Responding → Resolved, then by time
- **Color-coded** urgency badges
- **Actions:** View on Map, Respond
- **Full-screen overlay** for urgent incoming alerts with "I Can Help" / "Dismiss"

### Screen 4: 👤 Profile / Settings

Minimal, functional settings.

| Setting | Description |
|---------|-------------|
| Display Name | Your identifier to other users |
| Phone | For emergency contact features |
| Emergency Contacts | Add/remove with name, phone, relationship |
| Volunteer Toggle | Get alerted to help others nearby |
| Location Sharing | Allow others to see you on the map |
| Sign Out | Clear session and return to login |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────┐     WebSocket      ┌─────────────────┐
│   Client A   │ ←──────────────→ │                   │
│  (Victim)    │                   │   Node.js Server  │
└─────────────┘                   │                   │
                                   │  Express.js       │
┌─────────────┐     WebSocket      │  Socket.IO        │
│   Client B   │ ←──────────────→ │                   │
│  (Bystander) │                   │  ┌─────────────┐ │
└─────────────┘                   │  │ Incident     │ │
                                   │  │ Store (Map)  │ │
┌─────────────┐     WebSocket      │  ├─────────────┤ │
│   Client C   │ ←──────────────→ │  │ Location     │ │
│  (Responder) │                   │  │ Store (Map)  │ │
└─────────────┘                   │  └─────────────┘ │
                                   └─────────────────┘
```

### Geo-Grid Room System

The geo-grid system is the core spatial intelligence of PulseNet:

```
┌─────┬─────┬─────┬─────┬─────┐
│     │     │ ↗️  │     │     │
├─────┼─────┼─────┼─────┼─────┤
│     │  📢 │  📢 │  📢 │     │    📢 = Cells that receive the alert
├─────┼─────┼─────┼─────┼─────┤
│     │  📢 │ 🚨  │  📢 │     │    🚨 = SOS origin cell
├─────┼─────┼─────┼─────┼─────┤
│     │  📢 │  📢 │  📢 │     │    Each cell ≈ 1.1km × 1.1km
├─────┼─────┼─────┼─────┼─────┤
│     │     │     │     │     │    Total coverage ≈ 9km²
└─────┴─────┴─────┴─────┴─────┘
```

**How it works:**
1. Map is divided into grid cells of `0.01°` latitude × longitude (~1.1km at equator)
2. Each user joins Socket.IO rooms for their cell + 8 adjacent cells
3. When SOS is triggered → broadcast to all rooms in the 3×3 grid
4. Users automatically switch rooms as they move

### Module Dependency Graph

```
app.js (initializer)
  ├── socket.js    ← Socket.IO connection + event bus
  ├── location.js  ← GPS tracking (uses socket.js for updates)
  ├── map.js       ← Leaflet map (uses socket.js + location.js)
  ├── sos.js       ← SOS flow (uses socket.js + location.js)
  ├── alerts.js    ← Alert feed (uses socket.js + location.js)
  └── profile.js   ← Settings (uses socket.js)
```

---

## 🔄 Real-Time Flow

### SOS Trigger Sequence

```
┌──────────┐          ┌──────────┐          ┌──────────┐
│  Victim  │          │  Server  │          │  Nearby  │
│          │          │          │          │  Users   │
└────┬─────┘          └────┬─────┘          └────┬─────┘
     │                      │                      │
     │  Hold SOS (2 sec)    │                      │
     │─────────────────────→│                      │
     │  sos:trigger         │                      │
     │  {type, location}    │                      │
     │                      │                      │
     │                      │  Create incident     │
     │                      │  Find geo rooms      │
     │                      │                      │
     │  sos:confirmed       │                      │
     │←─────────────────────│                      │
     │                      │                      │
     │                      │  alert:nearby        │
     │                      │  {incident, dist}    │
     │                      │─────────────────────→│
     │                      │                      │
     │                      │  incident:created    │
     │                      │─────────────────────→│
     │                      │                      │
     │                      │  sos:respond         │
     │                      │←─────────────────────│
     │                      │  {incidentId}        │
     │                      │                      │
     │  sos:responder_joined│                      │
     │←─────────────────────│                      │
     │  {responder info}    │                      │
     │                      │                      │
     │  "Help is coming!" UI│                      │
     ▼                      ▼                      ▼
```

### Location Update Flow

```
Client                     Server
  │                           │
  │  location:update (5s)     │
  │──────────────────────────→│
  │                           │── Update location store
  │                           │── Recalculate geo-cell
  │                           │── Join/leave rooms if moved
  │                           │
  │                           │  location:peer_update
  │                           │──────────────────────→ Nearby users
  │                           │
```

---

## 📡 API Reference

### REST Endpoints

| Method | Endpoint | Description | Response |
|--------|----------|-------------|----------|
| `GET` | `/api/health` | Server health check | `{ status: "ok", timestamp }` |
| `GET` | `/api/incidents` | List active incidents | `{ incidents: [...] }` |
| `GET` | `/api/incidents/all` | List all incidents (incl. resolved) | `{ incidents: [...] }` |
| `GET` | `/api/incidents/:id` | Get incident by ID | `{ incident: {...} }` |
| `GET` | `/api/users/me` | Get current user profile | `{ profile: {...} }` |
| `PATCH` | `/api/users/me` | Update user profile | `{ profile: {...} }` |

> **Note:** REST endpoints use `x-user-id` header for auth (prototype). Will switch to Firebase Auth JWT tokens.

---

## 🔌 Socket.IO Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `sos:trigger` | `{ type, location, description? }` | Trigger SOS emergency |
| `sos:cancel` | `{ incidentId }` | Cancel active SOS |
| `sos:respond` | `{ incidentId }` | Respond to someone's SOS |
| `location:update` | `{ location: { lat, lng } }` | Update user's GPS location |
| `incidents:get_active` | — | Request active incidents list |
| `incidents:get_all` | — | Request all incidents list |
| `locations:get_active` | — | Request active user locations |
| `nearby:count` | `{ location }` | Request count of nearby users |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `sos:confirmed` | `Incident` | SOS was created successfully |
| `sos:cancelled` | `Incident` | SOS was resolved/cancelled |
| `sos:responder_joined` | `{ incident, responder }` | Someone is responding to your SOS |
| `alert:nearby` | `{ incident, distance }` | Incoming SOS alert from nearby |
| `incident:created` | `Incident` | New incident (for map updates) |
| `incident:updated` | `Incident` | Incident status changed |
| `incidents:active_list` | `Incident[]` | Active incidents list response |
| `incidents:all_list` | `Incident[]` | All incidents list response |
| `location:peer_update` | `{ userId, userName, location }` | Nearby user moved |
| `locations:active_list` | `UserLocation[]` | Active locations list response |
| `nearby:count_result` | `{ count }` | Number of nearby users |

### Connection Authentication

Socket.IO handshake includes auth data:

```javascript
const socket = io({
  auth: {
    userId: 'user_123456',
    userName: 'Atharva',
  }
});
```

---

## 📊 Data Models

### Incident

```typescript
interface Incident {
  id: string;                                           // UUID v4
  userId: string;                                       // Creator's user ID
  userName: string;                                     // Creator's display name
  type: 'medical' | 'fire' | 'harassment' | 'accident' | 'other';
  status: 'active' | 'responding' | 'resolved';
  location: { lat: number; lng: number };
  description?: string;
  createdAt: number;                                    // Unix timestamp ms
  updatedAt: number;
  responders: string[];                                 // Array of user IDs
}
```

### UserLocation

```typescript
interface UserLocation {
  userId: string;
  userName: string;
  location: { lat: number; lng: number };
  geoCell: string;                                      // Format: "lat:lng" grid cell
  isActive: boolean;
  lastUpdated: number;                                  // Unix timestamp ms
}
```

### UserProfile

```typescript
interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  emergencyContacts: EmergencyContact[];
  isVolunteer: boolean;
  createdAt: number;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}
```

---

## 🎨 Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0F172A` | Main background (deep navy) |
| `--bg-secondary` | `#1E293B` | Cards, secondary surfaces |
| `--bg-tertiary` | `#334155` | Buttons, elevated elements |
| `--danger` | `#FF3B30` | SOS, emergencies, critical |
| `--safe` | `#34C759` | Safe status, success |
| `--warning` | `#FF9500` | Fire alerts, caution |
| `--info` | `#007AFF` | Informational, accident type |
| `--harassment` | `#AF52DE` | Harassment/threat type |
| `--text-primary` | `#F8FAFC` | Primary text (near white) |
| `--text-secondary` | `#94A3B8` | Secondary text |
| `--text-muted` | `#64748B` | Muted/disabled text |

### Typography

- **Font Family:** Inter (Google Fonts)
- **Weights:** 400 (body), 600 (labels), 700 (headings), 800-900 (emphasis)
- **Key sizes:** 42px (SOS text), 22px (screen titles), 15px (body), 13px (captions)

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| **Dark UI** | Better visibility in panic situations, reduces eye strain |
| **Large touch targets** | SOS button 180px, nav items 72px height |
| **Minimal cognitive load** | Max 4 nav items, no nested menus |
| **Immediate feedback** | Pulse animations, haptic vibration, progress ring |
| **Glassmorphism** | Backdrop-blur on overlays for depth hierarchy |

### Key Animations

| Animation | Purpose | Duration |
|-----------|---------|----------|
| `sosPulse` | SOS button breathing rings | 2.5s, infinite |
| `pulse-dot` | Active emergency status dot | 1.5s, infinite |
| `markerPulse` | Active incident map markers | 2s, infinite |
| `alertSlideIn` | Alert card entrance | 0.4s |
| `overlayIn` | Full-screen alert overlay | 0.3s |
| `logoFloat` | Auth page logo float | 3s, infinite |

---

## 🧪 Multi-User Testing

The best way to test PulseNet is with **two browser windows** side by side:

### Setup

1. Open **Tab A**: `http://localhost:3000` → Sign in as **"Alice"**
2. Open **Tab B**: `http://localhost:3000` → Sign in as **"Bob"**
3. Both tabs grant GPS permission

### Test Scenarios

#### Scenario 1: SOS Trigger + Alert
1. **Alice** (Tab A): Select "Medical" → Long-press SOS for 2 seconds
2. **Bob** (Tab B): Should see full-screen alert overlay with "I Can Help"
3. **Bob**: Click "I Can Help"
4. **Alice**: Should see "Bob is coming to help" in responders list

#### Scenario 2: Map Visualization
1. Both users navigate to the **Map** tab
2. **Alice**: Trigger an SOS
3. **Bob**: Should see a pulsing red marker appear on the map at Alice's location

#### Scenario 3: Alerts Feed
1. **Alice**: Trigger SOS
2. **Bob**: Navigate to **Alerts** tab
3. Should see color-coded alert card with distance, time, and respond button

#### Scenario 4: Cancel SOS
1. **Alice**: Trigger SOS
2. **Alice**: Click "Cancel SOS" on the emergency screen
3. **Bob**: Alert should update to "Resolved" / marker removed from map

---

## 🗺️ Future Roadmap

### Phase 2: Firebase Integration
- [ ] Replace in-memory stores with **Cloud Firestore**
- [ ] Replace localStorage auth with **Firebase Authentication**
- [ ] Add **Firebase Cloud Messaging (FCM)** for push notifications
- [ ] Deploy to **Firebase Hosting** + Cloud Run

### Phase 3: Communication Layer
- [ ] **Twilio** SMS alerts to emergency contacts
- [ ] **In-app chat** between victim and responder
- [ ] **Voice call** integration for direct responder contact
- [ ] **Automated 112/911 relay** with incident data

### Phase 4: Intelligence
- [ ] **Incident clustering** — detect related incidents
- [ ] **Heat maps** — historical danger zones
- [ ] **Response time analytics** — measure and optimize
- [ ] **Smart routing** — guide responders to victim

### Phase 5: Native App
- [ ] Port to **React Native (Expo)** for Android/iOS
- [ ] **Background location tracking** via native APIs
- [ ] **Offline-first** SOS queuing with service workers
- [ ] **Wearable integration** (smartwatch SOS)

### Phase 6: Admin & Governance
- [ ] **Admin dashboard** for authorities/organizations
- [ ] **Incident reports** with export
- [ ] **User verification** for responder credentials
- [ ] **Geofencing** for campus/building-level alerting

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style
- **TypeScript:** Strict mode, explicit types
- **CSS:** BEM-inspired naming, CSS custom properties
- **JavaScript:** IIFE module pattern, `'use strict'`

---

## 📄 License

This project is licensed under the MIT License.

---

<p align="center">
  Built with ❤️ for safety.<br>
  <strong>PulseNet — Because every second counts.</strong>
</p>
