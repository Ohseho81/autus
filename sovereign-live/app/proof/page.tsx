"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📎 Page 7: Proof Dock - 증빙 보관 (해시 박제)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 루프: Task/Decision → Proof 연결
 * SHA-256 클라이언트 해시로 무결성 보장
 */

import { useState } from "react";
import { nanoid } from "nanoid";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card, Button, Badge } from "@/components/cards";
import { sha256, sha256File, shortHash } from "@/lib/hash";
import { formatRelativeTime } from "@/lib/utils";
import type { Proof } from "@/lib/schema";
import { 
  FileText, 
  Link as LinkIcon, 
  StickyNote, 
  Camera,
  Plus,
  Shield,
  Copy,
  Check,
} from "lucide-react";

const KIND_ICONS = {
  file: FileText,
  link: LinkIcon,
  note: StickyNote,
  screenshot: Camera,
};

export default function ProofPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [kind, setKind] = useState<Proof["kind"]>("note");
  const [label, setLabel] = useState("");
  const [payload, setPayload] = useState("");
  const [relatedId, setRelatedId] = useState("");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const proofs = useLiveQuery(
    () => ledger.proofs.orderBy("created_at").reverse().toArray(),
    []
  );

  const tasks = useLiveQuery(
    () => ledger.tasks.toArray(),
    []
  );

  const decisions = useLiveQuery(
    () => ledger.decisions.toArray(),
    []
  );

  // 증빙 추가
  async function addProof() {
    if (!label.trim() || !payload.trim()) return;

    const hash = await sha256(payload);

    await ledger.proofs.add({
      proof_id: nanoid(),
      related_id: relatedId || "unlinked",
      related_type: relatedId.startsWith("task_") ? "task" : "decision",
      kind,
      label,
      payload,
      sha256: hash,
      created_at: Date.now(),
    });

    // 리셋
    setLabel("");
    setPayload("");
    setRelatedId("");
    setShowAdd(false);
  }

  // 파일 업로드 처리
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const hash = await sha256File(file);
    const meta = JSON.stringify({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    });

    await ledger.proofs.add({
      proof_id: nanoid(),
      related_id: relatedId || "unlinked",
      related_type: "task",
      kind: "file",
      label: file.name,
      payload: meta,
      sha256: hash,
      created_at: Date.now(),
    });

    e.target.value = "";
  }

  // 해시 복사
  function copyHash(hash: string) {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* 설명 */}
      <div className="flex items-center gap-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
        <Shield className="h-5 w-5 text-green-400" />
        <div className="text-sm text-green-400">
          모든 증빙은 SHA-256 해시로 박제됩니다. 변조 감지 가능.
        </div>
      </div>

      {/* 추가 버튼 */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-medium">Proof Dock</div>
            <div className="text-sm text-slate-500">
              {proofs?.length ?? 0}개 증빙 보관 중
            </div>
          </div>
          <div className="flex gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button variant="secondary" size="sm" as="span">
                <FileText className="h-4 w-4 mr-1" />
                파일 업로드
              </Button>
            </label>
            <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
              <Plus className="h-4 w-4 mr-1" />
              증빙 추가
            </Button>
          </div>
        </div>

        {/* 추가 폼 */}
        {showAdd && (
          <div className="mt-4 space-y-3 border-t border-slate-800 pt-4">
            {/* 종류 선택 */}
            <div className="flex gap-2">
              {(["note", "link", "file", "screenshot"] as const).map((k) => {
                const Icon = KIND_ICONS[k];
                return (
                  <button
                    key={k}
                    onClick={() => setKind(k)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                      kind === k
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-slate-700 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {k}
                  </button>
                );
              })}
            </div>

            {/* 라벨 */}
            <input
              type="text"
              placeholder="증빙 라벨 (예: 계약서 사본)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm focus:border-slate-600 focus:outline-none"
            />

            {/* 내용 */}
            <textarea
              placeholder={kind === "link" ? "URL 입력" : "내용 또는 메타데이터"}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm focus:border-slate-600 focus:outline-none resize-none"
            />

            {/* 연결 대상 */}
            <select
              value={relatedId}
              onChange={(e) => setRelatedId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm focus:border-slate-600 focus:outline-none"
            >
              <option value="">연결 대상 선택 (선택사항)</option>
              <optgroup label="태스크">
                {tasks?.map((t) => (
                  <option key={t.task_id} value={t.task_id}>
                    {t.title}
                  </option>
                ))}
              </optgroup>
              <optgroup label="결정">
                {decisions?.slice(0, 10).map((d) => (
                  <option key={d.event_id} value={d.event_id}>
                    {d.title}
                  </option>
                ))}
              </optgroup>
            </select>

            <Button onClick={addProof} disabled={!label || !payload}>
              증빙 저장
            </Button>
          </div>
        )}
      </Card>

      {/* 증빙 목록 */}
      <div className="space-y-3">
        {proofs && proofs.length > 0 ? (
          proofs.map((p) => {
            const Icon = KIND_ICONS[p.kind];
            return (
              <Card key={p.proof_id} className="animate-fade-in">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg border border-slate-700 p-2">
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-sm text-slate-500 mt-1 truncate">
                      {p.payload.length > 100
                        ? p.payload.slice(0, 100) + "..."
                        : p.payload}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-600">
                      <span>{formatRelativeTime(p.created_at)}</span>
                      <Badge>{p.kind}</Badge>
                      {p.related_id !== "unlinked" && (
                        <span className="text-slate-500">
                          → {p.related_type}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <button
                      onClick={() => copyHash(p.sha256)}
                      className="flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-xs hover:bg-slate-800"
                    >
                      {copiedHash === p.sha256 ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {shortHash(p.sha256)}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <Card>
            <div className="py-8 text-center text-sm text-slate-500">
              증빙이 없습니다. 파일, 링크, 메모를 추가하세요.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
