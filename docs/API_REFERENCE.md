# AUTUS API Endpoints Reference

Generated: 2025-12-06

## Overview

Total Endpoints: **72+**

### Endpoint Categories

| Category | Count | Description |
|----------|-------|-------------|
| Health & Status | 3 | Server health checks |
| Twin Management | 12 | Digital twin CRUD & queries |
| Graph & Visualization | 3 | Twin graph operations |
| Packs | 6 | Feature pack management |
| Protocols | 3 | Protocol status & info |
| Reality Events | 4 | Event handling |
| Sovereign Data | 18 | Data ownership & permissions |
| God Mode | 8 | Admin operations |
| Memory & Auth | 4 | Identity & memory management |
| Auto Specs | 4 | Feature generation |
| Devices (IoT) | 2 | Device management |
| Analytics | 2 | Usage analytics |

## Detailed Endpoints

### 🏥 Health & Status (3)

```
GET  /health                     # Server health check
GET  /god/health                 # Detailed health
GET  /universe/overview          # System overview
```

### 👥 Twin Management (12)

```
GET  /twin/overview              # All twins overview
GET  /twin/city/{city_id}        # City twin data
GET  /twin/user/{zero_id}        # User twin data
GET  /twin/graph/summary         # Graph structure
GET  /twin/memory/summary        # Memory state
POST /twin/memory/preference     # Update preferences
GET  /twin/definition            # Twin schema
GET  /twin/packs                 # Available packs
GET  /twin/packs/{pack_id}       # Pack details
GET  /twin/packs/user/{zero_id}  # User's packs
GET  /twin/packs/status          # Pack status
GET  /twin/protocols/status      # Protocol status
```

### 📊 Graph & Visualization (3)

```
GET  /twin/graph/summary         # Graph metrics
GET  /universe/graph             # Full universe graph
GET  /god/graph                  # God Mode graph view
```

### 📦 Packs (6)

```
GET  /packs/list                 # List all packs
POST /packs/execute              # Execute pack
GET  /twin/packs                 # User's packs
GET  /twin/packs/{pack_id}       # Pack details
GET  /twin/packs/user/{zero_id}  # Packs for user
GET  /twin/packs/status          # Pack execution status
```

### 🔌 Protocols (3)

```
GET  /twin/protocols/status      # Protocol status
GET  /god/health                 # Detailed health
GET  /universe/overview          # Universe state
```

### 🌍 Reality Events (4)

```
POST /reality/event              # Submit event
GET  /reality/events             # Query events
POST /reality/subscribe          # Subscribe to events
DELETE /reality/unsubscribe      # Unsubscribe
```

### 🔐 Sovereign Data (18)

```
POST   /sovereign/token/generate           # Create token
GET    /sovereign/token/validate/{token}   # Validate token
POST   /sovereign/permission/check         # Check permission
POST   /sovereign/permission/grant         # Grant permission
POST   /sovereign/data/sign                # Sign data
POST   /sovereign/data/verify              # Verify signature
GET    /sovereign/audit/log                # Audit log
GET    /sovereign/audit/summary            # Audit summary
POST   /sovereign/consent/grant            # Grant consent
DELETE /sovereign/consent/revoke           # Revoke consent
GET    /sovereign/consent/list/{user_id}  # List consents
GET    /sovereign/status                   # Sovereign status
GET    /sovereign/import/stats             # Import statistics
POST   /sovereign/import/packet            # Import data packet
GET    /sovereign/import/history           # Import history
POST   /sovereign/import/verify            # Verify packet
GET    /sovereign/import/pending           # Pending imports
POST   /sovereign/import/approve           # Approve import
```

### 👑 God Mode (8)

```
GET    /god/universe             # Universe overview
GET    /god/graph                # Full graph
GET    /god/flow                 # Data flow visualization
GET    /god/health               # System health
GET    /god/cities               # All cities
GET    /god/evolution            # Evolution status
POST   /god/broadcast            # Broadcast message
GET    /god/status               # Status summary
```

### 🔑 Memory & Auth (4)

```
GET    /twin/auth/identity       # Current identity
GET    /twin/auth/qr             # QR code data
GET    /twin/auth/coordinates/{zero_id}  # Location coords
GET    /twin/auth/qr-image       # QR image
```

### 🧬 Auto Specs (4)

```
GET    /auto/needs               # Detected needs
GET    /auto/needs/pending       # Pending needs
POST   /auto/generate            # Generate spec
POST   /auto/evolve              # Execute evolution
```

### 🔌 Devices/IoT (2)

```
GET    /devices/list             # List devices
POST   /devices/register         # Register device
```

### 📊 Analytics (2)

```
GET    /analytics/stats          # Usage stats
GET    /analytics/pages          # Page views
```

## Authentication

### Zero Identity (No Auth Required)
- Most endpoints accessible without authentication
- Zero ID derived from local seed
- QR-based device sync

### God Mode (Admin Access)
- Requires special credentials
- Prefix: `/god/`
- Monitor system health and state

## Rate Limiting

- **Default**: 100 requests/minute
- **Auth endpoints**: 10 requests/minute
- **Analytics**: 1000 requests/minute

## Response Format

All endpoints return JSON:

```json
{
  "status": "ok|error",
  "data": { ... },
  "timestamp": "2025-12-06T10:00:00Z"
}
```

## Error Handling

```
200 - OK
201 - Created
400 - Bad Request
401 - Unauthorized
403 - Forbidden
404 - Not Found
429 - Too Many Requests
500 - Server Error
```

## WebSocket Endpoints

```
WS /ws/twin/{zero_id}            # Real-time twin updates
WS /ws/events                     # Real-time events
WS /ws/graph                      # Graph updates
```

---

**Note**: This is a living document. Endpoints are regularly updated as AUTUS evolves.

For live API documentation, visit: `https://autus-production.up.railway.app/docs`
