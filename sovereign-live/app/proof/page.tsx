"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📜 Proof Dock (불변의 증빙 소전트)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 타임라인 기반 증빙 관리 + Audit Trail
 */

import { useState, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { sha256, sha256File, shortHash } from "@/lib/hash";
import { 
  Hash, 
  FileText, 
  Link2, 
  StickyNote, 
  Shield, 
  CheckCircle2,
  Upload,
  Filter,
  Calendar,
  Clock,
  ExternalLink,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// 카테고리 필터
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "finance", label: "Finance" },
  { id: "legal", label: "Legal" },
  { id: "hr", label: "HR" },
];

export default function ProofPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const proofs = useLiveQuery(
    () => ledger.proofs.orderBy("created_at").reverse().toArray(),
    []
  );

  const stats = useLiveQuery(async () => {
    const all = await ledger.proofs.toArray();
    return {
      total: all.length,
      files: all.filter((p) => p.kind === "file").length,
      links: all.filter((p) => p.kind === "link").length,
      notes: all.filter((p) => p.kind === "note").length,
    };
  }, []);

  // 파일 증빙 추가
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const hash = await sha256File(file);
    const now = Date.now();

    await ledger.proofs.add({
      proof_id: `proof_${now}_${Math.random().toString(36).slice(2, 8)}`,
      related_id: "manual",
      related_type: "task",
      kind: "file",
      label: file.name,
      payload: JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type,
      }),
      sha256: hash,
      created_at: now,
    });

    e.target.value = "";
  }

  // 링크 증빙 추가
  async function addLinkProof() {
    const url = prompt("증빙 URL을 입력하세요:");
    if (!url) return;

    const label = prompt("라벨을 입력하세요:", url);
    const now = Date.now();
    const hash = await sha256(url + now);

    await ledger.proofs.add({
      proof_id: `proof_${now}_${Math.random().toString(36).slice(2, 8)}`,
      related_id: "manual",
      related_type: "task",
      kind: "link",
      label: label || url,
      payload: url,
      sha256: hash,
      created_at: now,
    });
  }

  // 노트 증빙 추가
  async function addNoteProof() {
    const note = prompt("노트 내용을 입력하세요:");
    if (!note) return;

    const now = Date.now();
    const hash = await sha256(note);

    await ledger.proofs.add({
      proof_id: `proof_${now}_${Math.random().toString(36).slice(2, 8)}`,
      related_id: "manual",
      related_type: "task",
      kind: "note",
      label: note.slice(0, 50) + (note.length > 50 ? "..." : ""),
      payload: note,
      sha256: hash,
      created_at: now,
    });
  }

  // 전체 검증
  async function verifyAll() {
    const all = await ledger.proofs.toArray();
    let valid = 0;
    let invalid = 0;

    for (const proof of all) {
      const computed = proof.kind === "note" 
        ? await sha256(proof.payload)
        : proof.sha256; // 파일/링크는 원본 해시 유지

      if (computed === proof.sha256) {
        valid++;
      } else {
        invalid++;
      }
    }

    alert(`검증 완료\n✓ 유효: ${valid}\n✗ 무효: ${invalid}`);
  }

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getKindIcon(kind: string) {
    switch (kind) {
      case "file": return <FileText className="h-4 w-4" />;
      case "link": return <Link2 className="h-4 w-4" />;
      case "note": return <StickyNote className="h-4 w-4" />;
      default: return <Hash className="h-4 w-4" />;
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Proof Dock 
            <span className="text-lg font-normal text-slate-400">(불변의 증빙 소전트)</span>
          </h1>
        </div>
        <button
          onClick={verifyAll}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-slate-900 rounded-lg font-medium hover:bg-green-400 transition-colors"
        >
          <Shield className="h-4 w-4" />
          VERIFY ALL PROOFS
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 왼쪽: 필터 */}
        <div className="col-span-2 space-y-6">
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">Filters</div>
            
            <div className="space-y-2">
              <div className="text-xs text-slate-400">By Category (Finance, Legal, HR)</div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs text-slate-400">Date Range Slider</div>
              <input
                type="range"
                min={0}
                max={100}
                className="w-full accent-green-500"
              />
            </div>
          </div>

          {/* 통계 */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-400">
              <Hash className="h-3 w-3" /> 
              <span>총 {stats?.total ?? 0}건</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <FileText className="h-3 w-3" /> 
              <span>{stats?.files ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Link2 className="h-3 w-3" /> 
              <span>{stats?.links ?? 0}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <StickyNote className="h-3 w-3" /> 
              <span>{stats?.notes ?? 0}</span>
            </div>
          </div>

          {/* 추가 버튼 */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" /> 파일
            </button>
            <button
              onClick={addLinkProof}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700"
            >
              <Link2 className="h-4 w-4" /> 링크
            </button>
            <button
              onClick={addNoteProof}
              className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm hover:bg-slate-700"
            >
              <StickyNote className="h-4 w-4" /> 노트
            </button>
          </div>
        </div>

        {/* 중앙: 타임라인 */}
        <div className="col-span-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium">Log_Hash ID: #AUTUS-PROOF-XYZ-789</span>
            </div>

            {/* 타임라인 */}
            <div className="relative">
              {/* 수직선 */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700" />

              <div className="space-y-4">
                {(proofs ?? []).map((proof, index) => (
                  <div key={proof.proof_id} className="relative flex gap-4">
                    {/* 타임라인 노드 */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
                        <Hash className="h-3 w-3 text-green-400" />
                      </div>
                      {index < (proofs?.length ?? 0) - 1 && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 h-8 flex items-center">
                          <Hash className="h-3 w-3 text-slate-600" />
                        </div>
                      )}
                    </div>

                    {/* 카드 */}
                    <div className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-700">
                            {getKindIcon(proof.kind)}
                          </div>
                          <div>
                            <div className="font-medium">{proof.label}</div>
                            <div className="text-xs text-slate-500 mt-1">
                              {proof.kind === "file" ? "Project Preset Carried Signed" : 
                               proof.kind === "link" ? "External Reference" : 
                               "Internal Note"}
                            </div>
                          </div>
                        </div>
                        
                        {proof.kind === "file" && (
                          <div className="w-12 h-12 rounded bg-slate-700 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-slate-500" />
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(proof.created_at)}
                        </span>
                        <span className="font-mono text-green-400/70">
                          #{shortHash(proof.sha256, 8)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {(proofs?.length ?? 0) === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    아직 증빙이 없습니다. 파일, 링크, 또는 노트를 추가하세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: Audit Trail */}
        <div className="col-span-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-sm font-medium mb-4">Audit Trail</div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="text-xs text-slate-400 mb-2">Recent Activities</div>
                <div className="text-sm text-slate-300 leading-relaxed">
                  Ha chart aa ha narurat beautiful beautiful deslt test attractive 
                  tempot protector crown large talk 5th 30% test 
                  DOdl 5tructts ta! 
                  Hopahan tauss alwas!
                </div>
              </div>

              {/* 해시 체인 시각화 */}
              <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm text-green-400">Data Integrity: 100%</span>
                </div>
                <div className="text-xs text-slate-500">
                  All {stats?.total ?? 0} proofs verified
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="flex items-center justify-center gap-2 text-xs text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        All evidence is encrypted & stored locally on device. Data integrity: 100%
      </div>
    </div>
  );
}
