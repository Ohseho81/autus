"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏠 Home (Redirect to Status)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 자동 리다이렉트 (3초 후)
    const timer = setTimeout(() => {
      router.push("/status");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="text-center">
        <div className="text-6xl font-bold text-gradient">AUTUS</div>
        <div className="mt-2 text-lg text-slate-400">Sovereign Live v15.1</div>
        
        <div className="mt-8 space-y-2 text-sm text-slate-500">
          <div>✓ 서버 저장 0</div>
          <div>✓ 개인 식별 0</div>
          <div>✓ Decision → Action → Proof</div>
        </div>

        <Link
          href="/status"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-6 py-3 text-sm font-medium hover:bg-slate-700"
        >
          시작하기
          <ArrowRight className="h-4 w-4" />
        </Link>

        <div className="mt-4 text-xs text-slate-600">
          3초 후 자동으로 Status 페이지로 이동합니다
        </div>
      </div>
    </div>
  );
}
