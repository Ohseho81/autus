const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
        PageBreak, TableOfContents, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 24 } } },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 }
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 }
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 }
      }
    ]
  },
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }]
      }
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 3600, after: 480 },
        children: [new TextRun({ text: "AUTUS + 온리쌤", bold: true, size: 56 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [new TextRun({ text: "전체 시스템 아키텍처 문서", size: 32 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 1440 },
        children: [new TextRun({ text: "v3.0 | 2026-02-14", size: 24, italics: true })]
      }),

      new Paragraph({ children: [new PageBreak()] }),

      // TOC
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("목차")] }),
      new TableOfContents("목차", { hyperlink: true, headingStyleRange: "1-3" }),

      new Paragraph({ children: [new PageBreak()] }),

      // Overview
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. 시스템 개요")] }),

      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("AUTUS는 초개인 피지컬 AI 플랫폼으로, 개인의 모든 의사결정을 Physics 기반으로 분석하여 V-Index를 실시간 계산합니다.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 V-Index 공식")] }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun({ text: "V = Base × (Motions - Threats) × (1 + 상호지수 × Relations)^t", bold: true, font: "Courier New" })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 핵심 성과")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("780명 학생 데이터 업로드 완료")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Event Ledger 시스템 구축 (12개 이벤트 타입)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("V-Index 자동 계산 트리거 설치")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("React Native 앱 개발 완료")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("6-Agent 라우팅 시스템 설계")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Layer 0
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Layer 0: AUTUS 코어")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Physics Engine")] }),
      new Paragraph({ children: [new TextRun("48-Node 계층 구조: 6 Physics × 12 Motion × 4 Domain")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("6 Physics")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("CAPITAL (자본)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("KNOWLEDGE (지식)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("TIME (시간)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("NETWORK (네트워크)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("REPUTATION (평판)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("HEALTH (건강)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("12 Motion")] }),
      new Paragraph({ children: [new TextRun("ACQUIRE, SPEND, INVEST, WITHDRAW, LEND, BORROW, GIVE, RECEIVE, EXCHANGE, TRANSFORM, PROTECT, RISK")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("4 Domain")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("S (Survive - 생존)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("G (Grow - 성장)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("R (Relate - 관계)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("E (Express - 표현)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Event Ledger")] }),
      new Paragraph({ children: [new TextRun("Append-only 구조로 모든 이벤트를 불변 형태로 기록. UPDATE/DELETE 금지.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("12개 이벤트 타입")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("attendance (출석), absence (결석), late (지각)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("payment_completed (결제완료), payment_pending (미납)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("consultation (상담), enrollment (등록)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("feedback_positive, feedback_negative")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("video_upload, class_completion, achievement")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Layer 1
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Layer 1: 온리쌤")] }),

      new Paragraph({ children: [new TextRun("배구 학원 관리를 위한 수직 통합 솔루션. 상담부터 출석, 결제, 피드백까지 전 과정 자동화.")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 현재 상태")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("학생 수: 780명 (중복 제거 완료)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("데이터베이스: Supabase (dcobyicibvhpwcjqkmgw)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Event Ledger: 설치 완료")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("V-Index 자동 계산: 트리거 설치 완료")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("모바일 앱: React Native + Expo SDK 50")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 핵심 프로세스")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("상담 → 등록 → 스케줄 → 출석 → 청구 → 수납 → 피드백")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("각 단계마다 Event Ledger 자동 기록")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("V-Index 실시간 업데이트")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // 6-Agent System
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. 6-Agent 라우팅 시스템")] }),

      new Paragraph({ children: [new TextRun("Score = Trigger(0.3) + Capability(0.5) + Constraint(0.2)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Agent 목록")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("📱 몰트봇 (P0): 모바일 게이트웨이, 알림, 원격 트리거")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("⌨️ Claude Code (P1): 코딩, 배포, 테스트, Git")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("🖥️ Cowork (P2): 문서, 정리, 분석")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("🌐 Chrome (P3): 브라우저, UI 테스트")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("💬 claude.ai (P4): 리서치, 전략, 설계")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("🔗 Connectors (P5): 외부 서비스 연동")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Database
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. 데이터베이스 아키텍처")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Supabase 스키마")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("profiles")] }),
      new Paragraph({ children: [new TextRun("학생/학부모/코치 정보. id, universal_id, type, name, phone, metadata, status")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("universal_profiles")] }),
      new Paragraph({ children: [new TextRun("통합 정체성. id, v_index, phone_hash, email_hash")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("event_ledger")] }),
      new Paragraph({ children: [new TextRun("불변 이벤트 기록. entity_id, universal_id, event_type, event_category, physics, motion, domain, value, metadata")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("event_type_mappings")] }),
      new Paragraph({ children: [new TextRun("12개 이벤트 타입 정의")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Integrations
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. 외부 연동")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 카카오톡 알림톡")] }),
      new Paragraph({ children: [new TextRun("출석 확인, 결제 안내, 수납 확인, 스케줄 변경 등 12가지 템플릿")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 결제선생")] }),
      new Paragraph({ children: [new TextRun("월별 자동 청구, 카카오페이 연동, Webhook 자동 처리")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.3 몰트봇 (Telegram)")] }),
      new Paragraph({ children: [new TextRun("시스템 알림, 배포 트리거, 에러 알림 (@autus_seho_bot)")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.4 YouTube")] }),
      new Paragraph({ children: [new TextRun("훈련 영상, 경기 영상 메타데이터 저장")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.5 Notion")] }),
      new Paragraph({ children: [new TextRun("학생 성장 일지, 일일 리포트 자동 동기화")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Data Flow
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. 데이터 플로우")] }),

      new Paragraph({
        children: [new TextRun({ text: "OAuth → Event Ledger → Physics Engine → V-Index → Dashboard → 몰트봇", bold: true })]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 출석 체크 예시")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("1. 코치가 CoachHomeScreen에서 출석 체크")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("2. eventService.logAttendance() 호출")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("3. Supabase RPC log_event() 실행")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("4. event_ledger INSERT")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("5. trigger_update_v_index 발동")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("6. V-Index 계산 및 업데이트")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("7. EntityListScreen 자동 갱신")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("8. 학부모 카카오톡 알림")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Deployment
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. 배포 아키텍처")] }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("React Native App: Expo Go (iOS/Android)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Next.js Frontend: Vercel (Edge Functions, ISR)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("FastAPI Backend: Railway (Auto-scaling)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Database: Supabase (PostgreSQL + Auth + Storage)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Scalability
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. 확장성 계획")] }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("1,000명: Supabase Free + Vercel Hobby ($5/월)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("10,000명: Supabase Pro + Redis ($180/월)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("100,000명: Supabase Team + Read Replicas ($1,649/월)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("1,000,000명: AWS Multi-Region + Kafka ($9,000/월)")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Next Steps
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. 다음 단계")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 1: 즉시 실행 (1주)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("온리쌤 앱 테스트")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("결제선생 API 연동")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("카카오톡 알림톡 템플릿 등록")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 2: 자동화 (2주)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("월별 자동 청구 Cron Job")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Notion 성장 일지 자동 동기화")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 3: 최적화 (2주)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Redis 캐싱 구현")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("DB 인덱스 최적화")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("Sentry + Grafana 모니터링")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Phase 4: 확장 (4주)")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("2번째 학원 온보딩")] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun("10개 학원 온보딩")] }),

      new Paragraph({ children: [new PageBreak()] }),

      // Critical Rules
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("11. Critical Rules")] }),

      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "NEVER deploy without tests", bold: true, color: "D32F2F" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "ALWAYS route mobile tasks through 몰트봇", bold: true, color: "D32F2F" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "ALWAYS Chrome verify UI changes", bold: true, color: "D32F2F" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "ALWAYS 몰트봇 notify after deploy", bold: true, color: "D32F2F" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "NEVER modify physics model without plan mode", bold: true, color: "D32F2F" })] }),
      new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun({ text: "Event Ledger = append only (no UPDATE/DELETE)", bold: true, color: "D32F2F" })] }),

      new Paragraph({
        spacing: { before: 1440 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "--- End of Document ---", italics: true })]
      })
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/sessions/modest-bold-einstein/mnt/autus/AUTUS_전체_아키텍처.docx', buffer);
  console.log('✅ Document created: AUTUS_전체_아키텍처.docx');
});
