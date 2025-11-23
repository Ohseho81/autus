# Zero Auth Protocol

**AUTUS Protocol #4: Zero Auth**

Device-to-device synchronization without servers. No authentication, no identity storage.

---

## Overview

The Zero Auth Protocol implements Article I of the AUTUS Constitution: **No authentication servers, QR code sync between devices (no server transmission)**.

### Core Principles

1. **No Servers**: All sync happens device-to-device via QR codes
2. **No Authentication**: No login, no accounts, no auth servers
3. **No Identity Storage**: Only behavioral patterns are synced
4. **Local Only**: All data stays on devices, never transmitted to servers
5. **QR Code Exchange**: Simple, secure, offline sync mechanism

---

## Architecture

```
Device 1                    Device 2
    |                          |
    |-- Generate QR Code ---->|
    |                          |
    |<-- Scan QR Code --------|
    |                          |
    |-- Identity Sync -------->|
```

### Components

1. **QRCodeGenerator**: Generate QR codes with identity data
2. **QRCodeScanner**: Scan QR codes and extract identity data
3. **DeviceSync**: High-level sync interface

---

## API Reference

### QRCodeGenerator

Generate QR codes for identity sync.

```python
from protocols.auth import QRCodeGenerator

generator = QRCodeGenerator()

# Generate QR code image
identity_data = {
    'seed_hash': '...',
    'created_at': '2024-11-23T12:00:00',
    'surface': {...}
}
qr_image = generator.generate_identity_qr(identity_data, expiration_minutes=5)

# Save to file
generator.save_qr_image(qr_image, 'identity_qr.png')

# Generate as bytes
qr_bytes = generator.generate_qr_bytes(identity_data, expiration_minutes=5)
```

#### Methods

- `__init__(error_correction: str = 'M')`: Initialize generator
- `generate_identity_qr(identity_data: Dict, expiration_minutes: int = 5) -> Image.Image`: Generate QR code image
- `save_qr_image(qr_image: Image.Image, filepath: str) -> None`: Save QR code to file
- `generate_qr_bytes(identity_data: Dict, expiration_minutes: int = 5) -> bytes`: Generate QR code as PNG bytes

---

### QRCodeScanner

Scan QR codes and extract identity data.

```python
from protocols.auth import QRCodeScanner

scanner = QRCodeScanner()

# Scan from image file
identity_data = scanner.scan_from_image('identity_qr.png')

# Scan from bytes
identity_data = scanner.scan_from_bytes(qr_bytes)

if identity_data:
    print(f"Identity hash: {identity_data['seed_hash']}")
```

#### Methods

- `scan_from_image(image_path: str) -> Optional[Dict]`: Scan QR code from image file
- `scan_from_bytes(image_bytes: bytes) -> Optional[Dict]`: Scan QR code from bytes

**Note**: Requires `pyzbar` and system `zbar` library for scanning.

---

### DeviceSync

High-level device synchronization interface.

```python
from protocols.auth import DeviceSync
from protocols.identity import IdentityCore

# Device 1: Generate sync QR
core1 = IdentityCore("device1_seed")
core1.create_surface()
sync1 = DeviceSync(core1)

qr_image = sync1.generate_sync_qr(expiration_minutes=5)
sync1.qr_generator.save_qr_image(qr_image, 'sync_qr.png')

# Device 2: Scan and sync
core2 = IdentityCore("device2_seed")
sync2 = DeviceSync(core2)

success = sync2.sync_from_qr('sync_qr.png')
if success:
    print("Identity synced successfully!")
```

#### Methods

- `__init__(identity_core: IdentityCore)`: Initialize with identity core
- `generate_sync_qr(expiration_minutes: int = 5) -> Image.Image`: Generate sync QR code
- `sync_from_qr(qr_image_path: str) -> bool`: Sync from QR code image file
- `sync_from_qr_bytes(qr_image_bytes: bytes) -> bool`: Sync from QR code bytes

---

## Usage Examples

### Basic Sync Workflow

```python
from protocols.auth import DeviceSync
from protocols.identity import IdentityCore

# === Device 1: Generate QR ===
core1 = IdentityCore("device1_seed")
core1.create_surface()
core1.evolve_surface({
    'type': 'workflow_completion',
    'context': {'workflow_id': 'wf_001'},
    'timestamp': '2024-11-23T12:00:00'
})

sync1 = DeviceSync(core1)
qr_img = sync1.generate_sync_qr(expiration_minutes=5)
sync1.qr_generator.save_qr_image(qr_img, 'device1_identity.png')

# === Device 2: Scan QR ===
core2 = IdentityCore("device2_seed")
sync2 = DeviceSync(core2)

success = sync2.sync_from_qr('device1_identity.png')
if success:
    print("Identity synced!")
    print(f"Surface position: {core2.surface.position}")
```

### Sync with Bytes

```python
from protocols.auth import DeviceSync, QRCodeGenerator
from protocols.identity import IdentityCore

# Generate QR as bytes
core1 = IdentityCore("device1_seed")
generator = QRCodeGenerator()
qr_bytes = generator.generate_qr_bytes(
    core1.export_to_dict(),
    expiration_minutes=5
)

# Sync from bytes
core2 = IdentityCore("device2_seed")
sync2 = DeviceSync(core2)
success = sync2.sync_from_qr_bytes(qr_bytes)
```

### Integration with Identity Protocol

```python
from protocols.auth import DeviceSync
from protocols.identity import IdentityCore, BehavioralPatternTracker

# Create identity with patterns
core = IdentityCore("device_seed")
tracker = BehavioralPatternTracker(core)

# Track some patterns
tracker.track_workflow_completion('wf_001', {
    'nodes_executed': 5,
    'total_time': 1.5,
    'success': True
})

# Generate sync QR
sync = DeviceSync(core)
qr_img = sync.generate_sync_qr()
sync.qr_generator.save_qr_image(qr_img, 'identity_sync.png')
```

---

## Security & Privacy

### No Server Transmission

- All sync happens device-to-device
- No data transmitted to servers
- No cloud storage
- No authentication servers

### QR Code Expiration

- QR codes expire after 5 minutes (default)
- Prevents replay attacks
- Time-limited sync window

### No PII

- Only behavioral patterns are synced
- No personal information
- No email, name, or identifiers
- Identity hash only (anonymous)

### Local-Only Storage

- All identity data stored locally
- QR codes are temporary
- No persistent sync state

---

## Data Format

### QR Code Payload

```json
{
    "identity": {
        "seed_hash": "sha256_hash_here",
        "created_at": "2024-11-23T12:00:00",
        "surface": {
            "core_hash": "...",
            "position": [0.616, -0.736, 0.205],
            "radius": 1.001,
            "texture": 0.501,
            "color": [0.5, 0.5, 0.5],
            "pattern_count": 5,
            "created_at": "2024-11-23T12:00:00",
            "evolution_history": [...]
        }
    },
    "expires_at": "2024-11-23T12:05:00",
    "created_at": "2024-11-23T12:00:00",
    "version": "1.0"
}
```

The payload is:
1. JSON encoded
2. Base64 encoded
3. Embedded in QR code

---

## Dependencies

### Required

- `qrcode`: QR code generation
- `Pillow`: Image processing

### Optional (for scanning)

- `pyzbar`: QR code scanning
- System `zbar` library: Required by pyzbar

**Installation:**

```bash
pip install qrcode[pil] Pillow
pip install pyzbar  # Optional, for scanning
```

**System Requirements (for scanning):**

- macOS: `brew install zbar`
- Linux: `sudo apt-get install zbar-tools`
- Windows: Download zbar DLLs

---

## Testing

All components are tested:

```bash
pytest tests/protocols/auth/test_qr_sync.py -v
```

**Test Coverage:**
- QRCodeGenerator: 4 tests
- QRCodeScanner: 2 tests (skipped if pyzbar unavailable)
- DeviceSync: 4 tests
- Integration: 1 test

**Total: 9 passed, 3 skipped (if pyzbar unavailable)**

---

## Compliance

### Constitution Article I: Zero Identity

✅ **No authentication servers**: All sync is device-to-device
✅ **No login system**: No authentication required
✅ **QR code sync**: Between devices, no server transmission
✅ **Local storage only**: All identity data stays on devices

### Constitution Article II: Privacy by Architecture

✅ **No PII**: Only behavioral patterns synced
✅ **Local-only**: No server transmission
✅ **Temporary QR codes**: Expire after 5 minutes

---

## Limitations

1. **QR Code Size**: Large identity data may require multiple QR codes (future enhancement)
2. **Scanning Dependency**: Requires system `zbar` library for scanning
3. **Manual Process**: User must physically scan QR code (by design, for security)

---

## Future Enhancements

- [ ] Multi-QR code support for large identities
- [ ] Encrypted QR codes (optional)
- [ ] NFC sync (alternative to QR)
- [ ] Bluetooth sync (proximity-based)
- [ ] Conflict resolution for simultaneous syncs

---

## References

- [AUTUS Constitution](../CONSTITUTION.md) - Article I: Zero Identity
- [Zero Identity Protocol](./identity.md) - Identity system
- [Local Memory OS](./memory.md) - Pattern storage

---

**Version**: 1.0.0  
**Status**: Production Ready (50% complete)  
**Last Updated**: 2024-11-23

