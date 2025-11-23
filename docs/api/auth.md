# Zero Auth API Reference

Zero Auth Protocol - Device-to-device synchronization without servers. No authentication, no identity storage, only QR code exchange.

## QRCodeGenerator

Generate QR codes for identity sync. QR codes contain encrypted identity data (no PII).

### Methods

#### `__init__(error_correction: str = 'M')`

Initialize QR code generator.

**Parameters:**
- `error_correction` (str): Error correction level (L, M, Q, H) - default: 'M'

**Example:**
```python
from protocols.auth.qr_sync import QRCodeGenerator

generator = QRCodeGenerator(error_correction='H')  # High error correction
```

#### `generate_identity_qr(identity_data: Dict, expiration_minutes: int = 5) -> Image.Image`

Generate QR code for identity sync.

**Parameters:**
- `identity_data` (Dict): Identity data (from IdentityCore.export_to_dict())
- `expiration_minutes` (int): QR code expiration time (default: 5)

**Returns:**
- `Image.Image`: PIL Image with QR code

**Example:**
```python
identity_data = identity.export_to_dict()
qr_image = generator.generate_identity_qr(identity_data, expiration_minutes=10)
qr_image.save("sync_qr.png")
```

#### `generate_qr_bytes(identity_data: Dict, expiration_minutes: int = 5) -> bytes`

Generate QR code as bytes.

**Parameters:**
- `identity_data` (Dict): Identity data
- `expiration_minutes` (int): Expiration time

**Returns:**
- `bytes`: PNG image bytes

**Example:**
```python
qr_bytes = generator.generate_qr_bytes(identity_data)
with open("sync_qr.png", "wb") as f:
    f.write(qr_bytes)
```

## QRCodeScanner

Scan QR codes for identity sync.

### Methods

#### `scan_from_image(image_path: str) -> Optional[Dict]`

Scan QR code from image file.

**Parameters:**
- `image_path` (str): Path to QR code image

**Returns:**
- `Optional[Dict]`: Decoded identity data or None if expired/invalid

**Raises:**
- `ImportError`: If pyzbar not available

**Example:**
```python
from protocols.auth.qr_sync import QRCodeScanner

scanner = QRCodeScanner()
identity_data = scanner.scan_from_image("sync_qr.png")
if identity_data:
    identity = IdentityCore.from_dict(identity_data)
```

#### `scan_from_bytes(image_bytes: bytes) -> Optional[Dict]`

Scan QR code from image bytes.

**Parameters:**
- `image_bytes` (bytes): PNG image bytes

**Returns:**
- `Optional[Dict]`: Decoded identity data or None if expired/invalid

**Example:**
```python
with open("sync_qr.png", "rb") as f:
    qr_bytes = f.read()
identity_data = scanner.scan_from_bytes(qr_bytes)
```

## DeviceSync

Device-to-device synchronization protocol. No servers, no authentication, only local QR code exchange.

### Methods

#### `__init__(identity_core: IdentityCore)`

Initialize device sync.

**Parameters:**
- `identity_core` (IdentityCore): IdentityCore instance

**Example:**
```python
from protocols.auth.qr_sync import DeviceSync

sync = DeviceSync(identity)
```

#### `generate_sync_qr(expiration_minutes: int = 5) -> Image.Image`

Generate QR code for device sync.

**Parameters:**
- `expiration_minutes` (int): QR code expiration time

**Returns:**
- `Image.Image`: PIL Image with QR code

**Example:**
```python
qr_image = sync.generate_sync_qr(expiration_minutes=10)
qr_image.save("device_sync.png")
```

#### `sync_from_qr(qr_image_path: str) -> bool`

Sync identity from QR code image.

**Parameters:**
- `qr_image_path` (str): Path to QR code image

**Returns:**
- `bool`: True if sync successful, False otherwise

**Example:**
```python
success = sync.sync_from_qr("other_device_qr.png")
if success:
    print("Identity synced successfully")
```

#### `sync_from_qr_bytes(qr_image_bytes: bytes) -> bool`

Sync identity from QR code bytes.

**Parameters:**
- `qr_image_bytes` (bytes): PNG image bytes

**Returns:**
- `bool`: True if sync successful, False otherwise

**Example:**
```python
with open("sync_qr.png", "rb") as f:
    qr_bytes = f.read()
success = sync.sync_from_qr_bytes(qr_bytes)
```

## AdvancedDeviceSync

Advanced device-to-device synchronization with conflict resolution and history tracking.

### Methods

#### `__init__(identity_core: IdentityCore, device_id: str)`

Initialize advanced device sync.

**Parameters:**
- `identity_core` (IdentityCore): IdentityCore instance
- `device_id` (str): Unique identifier for this device

**Example:**
```python
from protocols.auth.sync_manager import AdvancedDeviceSync

sync = AdvancedDeviceSync(identity, "device_001")
```

#### `get_sync_statistics() -> Dict[str, Any]`

Get synchronization statistics.

**Returns:**
- `Dict[str, Any]`: Statistics with total_syncs, success_rate, etc.

**Example:**
```python
stats = sync.get_sync_statistics()
print(f"Total syncs: {stats['total_syncs']}")
print(f"Success rate: {stats['success_rate']}%")
```

## SyncConflictResolver

Resolves conflicts when merging two IdentitySurfaces.

### Methods

#### `resolve_position_conflict(pos1: Tuple[float, float, float], pos2: Tuple[float, float, float], method: str = "average") -> Tuple[float, float, float]`

Resolve position conflicts.

**Parameters:**
- `pos1` (Tuple): Position from device 1
- `pos2` (Tuple): Position from device 2
- `method` (str): Resolution method ("average", "weighted_average")

**Returns:**
- `Tuple[float, float, float]`: Resolved position

#### `merge_evolution_histories(history1: List[Dict], history2: List[Dict], max_entries: int = 100) -> List[Dict]`

Merge and deduplicate evolution histories.

**Parameters:**
- `history1` (List[Dict]): History from device 1
- `history2` (List[Dict]): History from device 2
- `max_entries` (int): Maximum history size

**Returns:**
- `List[Dict]`: Merged and sorted history

## Security & Privacy

- **No Servers**: All sync is device-to-device
- **No Authentication**: QR codes are temporary and expire
- **No PII**: Only identity hashes, no personal information
- **Expiration**: QR codes expire after specified time
