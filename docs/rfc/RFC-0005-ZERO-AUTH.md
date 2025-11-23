# RFC 0005: Zero Auth Protocol

Status: Proposed Standard
Version: 1.0.0
Published: 2024-11-23

## Abstract
QR-based device sync without accounts.

## 1. Purpose
Authentication system that:
- Requires no servers
- Uses no accounts/passwords
- Operates on local network
- Enables secure device sync

## 2. Flow
1. Generate pairing code
2. Display QR code
3. Scan QR on new device
4. Establish TLS channel
5. Transfer identity
6. Verify transfer

## 3. Pairing Code
Components:
- Device ID
- Timestamp
- Nonce (16 bytes)
- HMAC signature

Expiration:
- Time: 5 minutes
- Uses: 1 successful pairing
- Failures: Max 3 attempts

## 4. Security
- TLS 1.3 minimum
- Mutual authentication
- AES-256-GCM encryption
- Local network only

## 5. Protected Against
- MITM: TLS + signatures
- Replay: Time-limited + nonce
- Brute force: Rate limiting
- Sniffing: End-to-end encryption

## 6. Requirements
MUST: TLS 1.3+, expire codes, encrypt data
MUST NOT: Use internet, store codes, bypass auth

## 7. Network
Allowed: WiFi, Bluetooth, USB, Ethernet
Not allowed: Internet, cloud, remote servers

## 8. Implementation
See: protocols/auth.md

---
Version: 1.0.0
