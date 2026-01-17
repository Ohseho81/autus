"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚙️ Page 5: Setup - P2P & 자동화 설정
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * - P2P Pairing QR
 * - 자동화 토글
 * - 데이터 백업/복원
 */

import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Card, Button } from "@/components/cards";
import { exportLedger, importLedger } from "@/lib/ledger";
import { 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  RefreshCw,
  Shield,
  Bell,
  Zap,
  Mail,
  FileSpreadsheet,
} from "lucide-react";

export default function SetupPage() {
  const [p2pStatus, setP2pStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [pairingToken] = useState(`autus://pairing/${Date.now()}`);
  
  // 자동화 토글 상태
  const [automations, setAutomations] = useState({
    n8nWebhook: false,
    sheetsImport: false,
    emailParse: false,
    notifications: true,
  });

  // 데이터 내보내기
  async function handleExport() {
    try {
      const data = await exportLedger();
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autus-ledger-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    }
  }

  // 데이터 가져오기
  async function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        await importLedger(text);
        alert("데이터가 복원되었습니다. 페이지를 새로고침합니다.");
        window.location.reload();
      } catch (err) {
        console.error("Import failed:", err);
        alert("데이터 복원에 실패했습니다.");
      }
    };
    input.click();
  }

  // 토글 핸들러
  function toggleAutomation(key: keyof typeof automations) {
    setAutomations((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      {/* P2P 설정 */}
      <Card title="P2P 연결" subtitle="WebRTC DataChannel (다음 루프에서 구현)">
        <div className="grid grid-cols-2 gap-6">
          {/* QR 코드 */}
          <div className="rounded-lg border border-slate-800 p-4">
            <div className="text-sm mb-3">Pairing QR</div>
            <div className="bg-white p-4 inline-block rounded-lg">
              <QRCodeCanvas value={pairingToken} size={160} level="M" />
            </div>
            <div className="mt-3 text-xs text-slate-500">
              다른 기기에서 스캔하여 연결
            </div>
          </div>

          {/* 연결 상태 */}
          <div className="rounded-lg border border-slate-800 p-4">
            <div className="text-sm mb-3">연결 상태</div>
            <div className="flex items-center gap-3 mb-4">
              {p2pStatus === "connected" ? (
                <Wifi className="h-8 w-8 text-green-400" />
              ) : p2pStatus === "connecting" ? (
                <RefreshCw className="h-8 w-8 text-yellow-400 animate-spin" />
              ) : (
                <WifiOff className="h-8 w-8 text-slate-500" />
              )}
              <div>
                <div className="font-medium">
                  {p2pStatus === "connected"
                    ? "연결됨"
                    : p2pStatus === "connecting"
                    ? "연결 중..."
                    : "연결 안 됨"}
                </div>
                <div className="text-xs text-slate-500">
                  {p2pStatus === "disconnected" && "QR 스캔 또는 토큰 입력"}
                </div>
              </div>
            </div>
            <Button variant="secondary" size="sm" disabled>
              수동 연결 (준비 중)
            </Button>
          </div>
        </div>
      </Card>

      {/* 자동화 설정 */}
      <Card title="자동화 연결" subtitle="외부 데이터 소스 연동">
        <div className="space-y-3">
          <AutomationToggle
            icon={Zap}
            label="n8n Webhook"
            description="n8n 워크플로우에서 데이터 수신"
            enabled={automations.n8nWebhook}
            onChange={() => toggleAutomation("n8nWebhook")}
          />
          <AutomationToggle
            icon={FileSpreadsheet}
            label="Google Sheets 연동"
            description="시트 데이터 자동 가져오기"
            enabled={automations.sheetsImport}
            onChange={() => toggleAutomation("sheetsImport")}
          />
          <AutomationToggle
            icon={Mail}
            label="이메일 파싱"
            description="결정 필요 이메일 자동 감지"
            enabled={automations.emailParse}
            onChange={() => toggleAutomation("emailParse")}
          />
          <AutomationToggle
            icon={Bell}
            label="알림"
            description="결정 필요 항목 알림"
            enabled={automations.notifications}
            onChange={() => toggleAutomation("notifications")}
          />
        </div>
        <div className="mt-4 text-xs text-slate-500">
          * 외부 연동은 클라이언트 사이드에서만 처리됩니다. 서버 저장 없음.
        </div>
      </Card>

      {/* 데이터 관리 */}
      <Card title="데이터 관리" subtitle="로컬 Ledger 백업 및 복원">
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex items-center gap-3 rounded-lg border border-slate-700 p-4 hover:bg-slate-800 transition-colors"
          >
            <Download className="h-5 w-5 text-green-400" />
            <div className="text-left">
              <div className="font-medium">내보내기</div>
              <div className="text-xs text-slate-500">JSON 파일로 백업</div>
            </div>
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-3 rounded-lg border border-slate-700 p-4 hover:bg-slate-800 transition-colors"
          >
            <Upload className="h-5 w-5 text-blue-400" />
            <div className="text-left">
              <div className="font-medium">가져오기</div>
              <div className="text-xs text-slate-500">JSON 파일에서 복원</div>
            </div>
          </button>
        </div>
      </Card>

      {/* 보안 상태 */}
      <Card title="보안 상태">
        <div className="flex items-center gap-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <Shield className="h-8 w-8 text-green-400" />
          <div>
            <div className="font-medium text-green-400">Local Only 모드</div>
            <div className="text-sm text-slate-400">
              모든 데이터는 이 기기의 IndexedDB에만 저장됩니다.
            </div>
            <div className="text-xs text-slate-500 mt-1">
              서버 전송 없음 · API Route 없음 · DB 커넥터 없음
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// 자동화 토글 컴포넌트
function AutomationToggle({
  icon: Icon,
  label,
  description,
  enabled,
  onChange,
}: {
  icon: typeof Zap;
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${enabled ? "text-green-400" : "text-slate-500"}`} />
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`relative h-6 w-11 rounded-full transition-colors ${
          enabled ? "bg-green-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
