"""Zero Auth Protocol - Tests"""

import pytest
import json
import base64
from datetime import datetime, timedelta


class TestZeroAuthCrypto:
    def test_key_generation(self):
        from protocols.auth.crypto import ZeroAuthCrypto
        crypto = ZeroAuthCrypto()
        assert crypto.public_key_bytes is not None
        assert len(crypto.public_key_bytes) == 32
    
    def test_key_exchange(self):
        from protocols.auth.crypto import ZeroAuthCrypto
        crypto_a = ZeroAuthCrypto()
        crypto_b = ZeroAuthCrypto()
        shared_key_a = crypto_a.derive_shared_key(crypto_b.public_key_bytes)
        shared_key_b = crypto_b.derive_shared_key(crypto_a.public_key_bytes)
        assert shared_key_a == shared_key_b
        assert len(shared_key_a) == 32
    
    def test_encryption_decryption(self):
        from protocols.auth.crypto import ZeroAuthCrypto
        crypto_a = ZeroAuthCrypto()
        crypto_b = ZeroAuthCrypto()
        shared_key = crypto_a.derive_shared_key(crypto_b.public_key_bytes)
        plaintext = b"Hello, Zero Auth!"
        encrypted = crypto_a.encrypt(plaintext, shared_key)
        decrypted = crypto_a.decrypt(encrypted, shared_key)
        assert decrypted == plaintext
    
    def test_json_encryption(self):
        from protocols.auth.crypto import ZeroAuthCrypto
        crypto_a = ZeroAuthCrypto()
        crypto_b = ZeroAuthCrypto()
        shared_key_a = crypto_a.derive_shared_key(crypto_b.public_key_bytes)
        shared_key_b = crypto_b.derive_shared_key(crypto_a.public_key_bytes)
        test_data = {'position': [0.5, 0.3, 0.7], 'patterns': ['morning']}
        encrypted = crypto_a.encrypt_json(test_data, shared_key_a)
        decrypted = crypto_b.decrypt_json(encrypted, shared_key_b)
        assert decrypted['position'] == test_data['position']


class TestPairingSession:
    def test_session_creation(self):
        from protocols.auth.crypto import PairingSession
        session = PairingSession(expiry_minutes=5)
        assert session.session_id is not None
        assert not session.is_expired
        assert not session.is_paired
    
    def test_pairing_payload(self):
        from protocols.auth.crypto import PairingSession
        session = PairingSession()
        payload = session.generate_pairing_payload()
        assert payload['protocol'] == 'autus-zero-auth'
        assert 'public_key' in payload
    
    def test_complete_pairing(self):
        from protocols.auth.crypto import PairingSession
        session_a = PairingSession()
        session_b = PairingSession()
        payload_a = session_a.generate_pairing_payload()
        session_b.complete_pairing(payload_a['public_key'])
        assert session_b.is_paired
        session_a.complete_pairing(session_b.crypto.public_key_b64)
        assert session_a.is_paired
    
    def test_encrypted_sync(self):
        from protocols.auth.crypto import PairingSession
        session_a = PairingSession()
        session_b = PairingSession()
        session_b.complete_pairing(session_a.crypto.public_key_b64)
        session_a.complete_pairing(session_b.crypto.public_key_b64)
        test_data = {'key': 'value', 'number': 42}
        encrypted = session_a.encrypt_sync_data(test_data)
        decrypted = session_b.decrypt_sync_data(encrypted)
        assert decrypted == test_data
    
    def test_unpaired_session_fails(self):
        from protocols.auth.crypto import PairingSession
        session = PairingSession()
        with pytest.raises(ValueError, match="not paired"):
            session.encrypt_sync_data({'key': 'value'})


class TestDevicePairing:
    def test_create_session(self):
        from protocols.auth.crypto import DevicePairing
        manager = DevicePairing()
        session = manager.create_session(expiry_minutes=5)
        assert session is not None
        assert manager.get_session(session.session_id) is session
    
    def test_complete_pairing_from_qr(self):
        from protocols.auth.crypto import DevicePairing, PairingSession
        session_a = PairingSession()
        qr_payload = session_a.generate_pairing_payload()
        manager_b = DevicePairing()
        session_b, response_key = manager_b.complete_pairing_from_qr(qr_payload)
        assert session_b.is_paired
        session_a.complete_pairing(response_key)
        assert session_a.is_paired


class TestAuthAPI:
    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient
        from fastapi import FastAPI
        from server.routes.auth import router
        app = FastAPI()
        app.include_router(router)
        return TestClient(app)
    
    def test_health_check(self, client):
        response = client.get("/api/auth/health")
        assert response.status_code == 200
        assert response.json()['protocol'] == 'autus-zero-auth'
    
    def test_create_session(self, client):
        response = client.post("/api/auth/session", json={'expiry_minutes': 5})
        assert response.status_code == 201
        assert 'session_id' in response.json()
    
    def test_get_session_status(self, client):
        create_resp = client.post("/api/auth/session", json={})
        session_id = create_resp.json()['session_id']
        response = client.get(f"/api/auth/session/{session_id}")
        assert response.status_code == 200
        assert response.json()['status'] == 'pending'
    
    def test_session_not_found(self, client):
        response = client.get("/api/auth/session/nonexistent")
        assert response.status_code == 404
    
    def test_complete_pairing_flow(self, client):
        from protocols.auth.crypto import ZeroAuthCrypto
        create_resp = client.post("/api/auth/session", json={})
        session_id = create_resp.json()['session_id']
        responder_crypto = ZeroAuthCrypto()
        pair_resp = client.post("/api/auth/pair", json={
            'session_id': session_id,
            'public_key': responder_crypto.public_key_b64
        })
        assert pair_resp.status_code == 200
        assert pair_resp.json()['status'] == 'paired'


class TestE2EIntegration:
    def test_full_sync_flow(self):
        from protocols.auth.crypto import PairingSession
        device_a = PairingSession()
        device_b = PairingSession()
        device_b.complete_pairing(device_a.crypto.public_key_b64)
        device_a.complete_pairing(device_b.crypto.public_key_b64)
        identity_data = {
            'core_position': [0.5, 0.3, 0.7],
            'patterns': ['morning_coder'],
            'sync_timestamp': datetime.utcnow().isoformat()
        }
        encrypted = device_a.encrypt_sync_data(identity_data)
        received_data = device_b.decrypt_sync_data(encrypted)
        assert received_data['core_position'] == identity_data['core_position']
    
    def test_bidirectional_sync(self):
        from protocols.auth.crypto import PairingSession
        device_a = PairingSession()
        device_b = PairingSession()
        device_b.complete_pairing(device_a.crypto.public_key_b64)
        device_a.complete_pairing(device_b.crypto.public_key_b64)
        data_a = {'from': 'device_a', 'value': 100}
        encrypted_a = device_a.encrypt_sync_data(data_a)
        assert device_b.decrypt_sync_data(encrypted_a) == data_a
        data_b = {'from': 'device_b', 'value': 200}
        encrypted_b = device_b.encrypt_sync_data(data_b)
        assert device_a.decrypt_sync_data(encrypted_b) == data_b


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
