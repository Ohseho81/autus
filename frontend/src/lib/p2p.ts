/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔗 AUTUS P2P — Ledger 동기화
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * P2P Ledger 동기화 프로토콜:
 * - WebRTC DataChannel
 * - BLE Proximity
 * - QR Code 교환
 * - AES-256-GCM 암호화
 * 
 * 원칙:
 * - 자동 병합 금지
 * - 모든 동기화는 수동 승인
 * - HEAD 불일치 시 사용자 선택
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface LedgerBlock {
  hash: string;
  prev_hash: string;
  timestamp: string;
  date: string;
  type: string;
  payload: any;
}

export interface PeerInfo {
  id: string;
  name: string;
  publicKey: string;
  lastSeen: string;
  headHash: string;
  blockCount: number;
}

export type SyncStatus = 'ok' | 'ahead' | 'behind' | 'fork';

export interface SyncResult {
  status: SyncStatus;
  myHead: string;
  peerHead: string;
  myBlockCount: number;
  peerBlockCount: number;
  difference: number;
  forkPoint?: string;
}

export interface SyncMessage {
  type: 'hello' | 'head' | 'blocks' | 'request' | 'ack';
  peerId: string;
  payload: any;
  signature?: string;
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Crypto
// ═══════════════════════════════════════════════════════════════════════════════

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;

export class P2PCrypto {
  private key: CryptoKey | null = null;

  async generateKey(): Promise<CryptoKey> {
    this.key = await crypto.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
    return this.key;
  }

  async exportKey(): Promise<string> {
    if (!this.key) throw new Error('Key not generated');
    const exported = await crypto.subtle.exportKey('raw', this.key);
    return btoa(String.fromCharCode(...new Uint8Array(exported)));
  }

  async importKey(keyData: string): Promise<CryptoKey> {
    const raw = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
    this.key = await crypto.subtle.importKey(
      'raw',
      raw,
      { name: ALGORITHM, length: KEY_LENGTH },
      true,
      ['encrypt', 'decrypt']
    );
    return this.key;
  }

  async encrypt(data: string): Promise<string> {
    if (!this.key) throw new Error('Key not set');
    
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const encoded = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      this.key,
      encoded
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  }

  async decrypt(data: string): Promise<string> {
    if (!this.key) throw new Error('Key not set');
    
    const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      this.key,
      encrypted
    );
    
    return new TextDecoder().decode(decrypted);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ledger Sync
// ═══════════════════════════════════════════════════════════════════════════════

export class LedgerSync {
  private peerId: string;
  private crypto: P2PCrypto;
  private onMessage?: (msg: SyncMessage) => void;
  private onStatusChange?: (status: SyncStatus, peer: PeerInfo) => void;

  constructor(peerId: string) {
    this.peerId = peerId;
    this.crypto = new P2PCrypto();
  }

  setCallbacks(
    onMessage: (msg: SyncMessage) => void,
    onStatusChange: (status: SyncStatus, peer: PeerInfo) => void
  ) {
    this.onMessage = onMessage;
    this.onStatusChange = onStatusChange;
  }

  /**
   * HEAD 비교
   */
  compareHeads(myBlocks: LedgerBlock[], peerBlocks: LedgerBlock[]): SyncResult {
    const myHead = myBlocks[myBlocks.length - 1]?.hash || 'GENESIS';
    const peerHead = peerBlocks[peerBlocks.length - 1]?.hash || 'GENESIS';
    
    // 동일
    if (myHead === peerHead) {
      return {
        status: 'ok',
        myHead,
        peerHead,
        myBlockCount: myBlocks.length,
        peerBlockCount: peerBlocks.length,
        difference: 0,
      };
    }
    
    // 내가 앞섬
    const peerHeadInMine = myBlocks.find(b => b.hash === peerHead);
    if (peerHeadInMine) {
      return {
        status: 'ahead',
        myHead,
        peerHead,
        myBlockCount: myBlocks.length,
        peerBlockCount: peerBlocks.length,
        difference: myBlocks.length - peerBlocks.length,
      };
    }
    
    // 내가 뒤처짐
    const myHeadInPeer = peerBlocks.find(b => b.hash === myHead);
    if (myHeadInPeer) {
      return {
        status: 'behind',
        myHead,
        peerHead,
        myBlockCount: myBlocks.length,
        peerBlockCount: peerBlocks.length,
        difference: peerBlocks.length - myBlocks.length,
      };
    }
    
    // Fork 감지
    const forkPoint = this.findForkPoint(myBlocks, peerBlocks);
    return {
      status: 'fork',
      myHead,
      peerHead,
      myBlockCount: myBlocks.length,
      peerBlockCount: peerBlocks.length,
      difference: 0,
      forkPoint: forkPoint?.hash,
    };
  }

  /**
   * Fork 분기점 찾기
   */
  private findForkPoint(myBlocks: LedgerBlock[], peerBlocks: LedgerBlock[]): LedgerBlock | null {
    const peerHashes = new Set(peerBlocks.map(b => b.hash));
    
    for (let i = myBlocks.length - 1; i >= 0; i--) {
      if (peerHashes.has(myBlocks[i].hash)) {
        return myBlocks[i];
      }
    }
    
    return null;
  }

  /**
   * 메시지 생성
   */
  createMessage(type: SyncMessage['type'], payload: any): SyncMessage {
    return {
      type,
      peerId: this.peerId,
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Hello 메시지 (연결 시작)
   */
  createHello(headHash: string, blockCount: number): SyncMessage {
    return this.createMessage('hello', {
      headHash,
      blockCount,
    });
  }

  /**
   * 블록 요청
   */
  createBlockRequest(fromHash: string, count: number): SyncMessage {
    return this.createMessage('request', {
      fromHash,
      count,
    });
  }

  /**
   * 블록 전송
   */
  createBlocksMessage(blocks: LedgerBlock[]): SyncMessage {
    return this.createMessage('blocks', {
      blocks,
      count: blocks.length,
    });
  }

  /**
   * 암호화된 메시지 전송
   */
  async encryptMessage(msg: SyncMessage): Promise<string> {
    const json = JSON.stringify(msg);
    return this.crypto.encrypt(json);
  }

  /**
   * 암호화된 메시지 수신
   */
  async decryptMessage(encrypted: string): Promise<SyncMessage> {
    const json = await this.crypto.decrypt(encrypted);
    return JSON.parse(json);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WebRTC Connection
// ═══════════════════════════════════════════════════════════════════════════════

export class P2PConnection {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private sync: LedgerSync;
  private onMessage?: (msg: SyncMessage) => void;
  private onConnect?: () => void;
  private onDisconnect?: () => void;

  constructor(peerId: string) {
    this.sync = new LedgerSync(peerId);
  }

  setCallbacks(
    onMessage: (msg: SyncMessage) => void,
    onConnect: () => void,
    onDisconnect: () => void
  ) {
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  /**
   * Offer 생성 (연결 시작)
   */
  async createOffer(): Promise<string> {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.dc = this.pc.createDataChannel('autus-ledger');
    this.setupDataChannel();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // ICE 수집 완료 대기
    await new Promise<void>(resolve => {
      this.pc!.onicegatheringstatechange = () => {
        if (this.pc!.iceGatheringState === 'complete') resolve();
      };
    });

    return btoa(JSON.stringify(this.pc.localDescription));
  }

  /**
   * Answer 생성 (연결 응답)
   */
  async createAnswer(offerStr: string): Promise<string> {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    this.pc.ondatachannel = (e) => {
      this.dc = e.channel;
      this.setupDataChannel();
    };

    const offer = JSON.parse(atob(offerStr));
    await this.pc.setRemoteDescription(offer);

    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await new Promise<void>(resolve => {
      this.pc!.onicegatheringstatechange = () => {
        if (this.pc!.iceGatheringState === 'complete') resolve();
      };
    });

    return btoa(JSON.stringify(this.pc.localDescription));
  }

  /**
   * Answer 적용 (연결 완료)
   */
  async applyAnswer(answerStr: string): Promise<void> {
    const answer = JSON.parse(atob(answerStr));
    await this.pc!.setRemoteDescription(answer);
  }

  private setupDataChannel() {
    if (!this.dc) return;

    this.dc.onopen = () => {
      this.onConnect?.();
    };

    this.dc.onclose = () => {
      this.onDisconnect?.();
    };

    this.dc.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as SyncMessage;
        this.onMessage?.(msg);
      } catch (err) {
        console.error('P2P message parse error:', err);
      }
    };
  }

  /**
   * 메시지 전송
   */
  send(msg: SyncMessage): boolean {
    if (!this.dc || this.dc.readyState !== 'open') {
      return false;
    }
    this.dc.send(JSON.stringify(msg));
    return true;
  }

  /**
   * 연결 종료
   */
  close() {
    this.dc?.close();
    this.pc?.close();
    this.dc = null;
    this.pc = null;
  }

  get isConnected(): boolean {
    return this.dc?.readyState === 'open';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// QR Code
// ═══════════════════════════════════════════════════════════════════════════════

export interface QRPayload {
  type: 'offer' | 'answer' | 'key';
  peerId: string;
  data: string;
  timestamp: string;
}

export function createQRPayload(type: QRPayload['type'], peerId: string, data: string): QRPayload {
  return {
    type,
    peerId,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function encodeQR(payload: QRPayload): string {
  return btoa(JSON.stringify(payload));
}

export function decodeQR(qrData: string): QRPayload {
  return JSON.parse(atob(qrData));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const p2p = {
  Crypto: P2PCrypto,
  Sync: LedgerSync,
  Connection: P2PConnection,
  qr: {
    create: createQRPayload,
    encode: encodeQR,
    decode: decodeQR,
  },
};

export default p2p;
