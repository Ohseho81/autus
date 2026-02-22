# 📂 카테고리 구조

> **서비스 분류 체계 (확장 가능)**

---

## 🌳 카테고리 트리

```
서비스
└── 교육서비스
    └── 스포츠교육
        ├── 구기종목
        │   ├── 농구 ← 온리쌤, 바스키움
        │   ├── 축구
        │   ├── 야구
        │   ├── 배구
        │   └── 테니스
        ├── 수상종목
        │   ├── 수영
        │   └── 다이빙
        ├── 무도종목
        │   ├── 태권도
        │   ├── 유도
        │   └── 검도
        ├── 라켓종목
        │   ├── 배드민턴
        │   └── 탁구
        └── 기타
            ├── 체조
            ├── 골프
            └── 스키/보드
```

---

## 🗄️ DB 설계

### 옵션 A: 단순 (현재)

```sql
-- organizations.industry
'basketball'  -- 단일 값
```

### 옵션 B: 계층형 코드 (추천)

```sql
-- organizations.category_code
'EDU.SPORTS.BALL.BASKETBALL'  -- 점(.)으로 구분된 계층

-- 분해
'EDU'         -- Level 1: 교육
'SPORTS'      -- Level 2: 스포츠교육
'BALL'        -- Level 3: 구기종목
'BASKETBALL'  -- Level 4: 농구
```

### 옵션 C: JSONB 계층

```sql
-- organizations.category
{
  "l1": "EDU",
  "l2": "SPORTS",
  "l3": "BALL",
  "l4": "BASKETBALL",
  "full": "교육 > 스포츠교육 > 구기종목 > 농구"
}
```

---

## 📋 카테고리 코드표

### Level 1 (산업)

| 코드 | 한글 | 설명 |
|------|------|------|
| `EDU` | 교육 | 교육 서비스 |
| `FIT` | 피트니스 | 헬스, PT |
| `ART` | 예술 | 음악, 미술 |
| `CARE` | 돌봄 | 어린이집, 요양 |

### Level 2 (분야)

| 코드 | 한글 | 상위 |
|------|------|------|
| `SPORTS` | 스포츠교육 | EDU |
| `ACADEMY` | 학원교육 | EDU |
| `MUSIC` | 음악교육 | ART |
| `GYM` | 헬스장 | FIT |

### Level 3 (세부분류)

| 코드 | 한글 | 상위 |
|------|------|------|
| `BALL` | 구기종목 | SPORTS |
| `WATER` | 수상종목 | SPORTS |
| `MARTIAL` | 무도종목 | SPORTS |
| `RACKET` | 라켓종목 | SPORTS |

### Level 4 (종목)

| 코드 | 한글 | 상위 |
|------|------|------|
| `BASKETBALL` | 농구 | BALL |
| `SOCCER` | 축구 | BALL |
| `BASEBALL` | 야구 | BALL |
| `VOLLEYBALL` | 배구 | BALL |
| `SWIMMING` | 수영 | WATER |
| `TAEKWONDO` | 태권도 | MARTIAL |

---

## 🔄 마이그레이션 SQL

```sql
-- organizations 테이블 확장
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS category_code VARCHAR(50) DEFAULT 'EDU.SPORTS.BALL.BASKETBALL';

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS category_label VARCHAR(200) DEFAULT '교육 > 스포츠교육 > 구기종목 > 농구';

-- 카테고리 마스터 테이블 (선택)
CREATE TABLE IF NOT EXISTS category_master (
  code VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  parent_code VARCHAR(50),
  level INT NOT NULL,
  icon VARCHAR(10),
  sort_order INT DEFAULT 0
);

-- 카테고리 데이터 삽입
INSERT INTO category_master (code, label, parent_code, level, icon) VALUES
-- Level 1
('EDU', '교육', NULL, 1, '📚'),
('FIT', '피트니스', NULL, 1, '💪'),
('ART', '예술', NULL, 1, '🎨'),

-- Level 2
('EDU.SPORTS', '스포츠교육', 'EDU', 2, '⚽'),
('EDU.ACADEMY', '학원교육', 'EDU', 2, '📖'),

-- Level 3
('EDU.SPORTS.BALL', '구기종목', 'EDU.SPORTS', 3, '🏀'),
('EDU.SPORTS.WATER', '수상종목', 'EDU.SPORTS', 3, '🏊'),
('EDU.SPORTS.MARTIAL', '무도종목', 'EDU.SPORTS', 3, '🥋'),

-- Level 4
('EDU.SPORTS.BALL.BASKETBALL', '농구', 'EDU.SPORTS.BALL', 4, '🏀'),
('EDU.SPORTS.BALL.SOCCER', '축구', 'EDU.SPORTS.BALL', 4, '⚽'),
('EDU.SPORTS.BALL.BASEBALL', '야구', 'EDU.SPORTS.BALL', 4, '⚾'),
('EDU.SPORTS.WATER.SWIMMING', '수영', 'EDU.SPORTS.WATER', 4, '🏊'),
('EDU.SPORTS.MARTIAL.TAEKWONDO', '태권도', 'EDU.SPORTS.MARTIAL', 4, '🥋');
```

---

## 📊 사용 예시

### 조직 등록

```sql
-- 온리쌤
INSERT INTO organizations (name, category_code, category_label) VALUES
('온리쌤', 'EDU.SPORTS.BALL.BASKETBALL', '교육 > 스포츠교육 > 구기종목 > 농구');

-- 바스키움
INSERT INTO organizations (name, category_code, category_label) VALUES
('바스키움', 'EDU.SPORTS.BALL.BASKETBALL', '교육 > 스포츠교육 > 구기종목 > 농구');

-- 만약 수영장이라면
INSERT INTO organizations (name, category_code, category_label) VALUES
('블루웨이브 수영장', 'EDU.SPORTS.WATER.SWIMMING', '교육 > 스포츠교육 > 수상종목 > 수영');
```

### 카테고리별 조회

```sql
-- 모든 농구 아카데미
SELECT * FROM organizations
WHERE category_code = 'EDU.SPORTS.BALL.BASKETBALL';

-- 모든 구기종목 아카데미
SELECT * FROM organizations
WHERE category_code LIKE 'EDU.SPORTS.BALL.%';

-- 모든 스포츠교육 업체
SELECT * FROM organizations
WHERE category_code LIKE 'EDU.SPORTS.%';
```

---

## 🎯 카테고리별 기능 분기

```typescript
// 카테고리에 따라 UI/기능 분기
const getCategoryFeatures = (categoryCode: string) => {
  const level4 = categoryCode.split('.')[3];

  switch (level4) {
    case 'BASKETBALL':
      return {
        fields: ['back_number', 'position', 'uniform'],
        skills: ['dribble', 'shoot', 'pass', 'defense'],
        icon: '🏀'
      };
    case 'SWIMMING':
      return {
        fields: ['lane', 'stroke_type', 'level'],
        skills: ['freestyle', 'backstroke', 'breaststroke', 'butterfly'],
        icon: '🏊'
      };
    case 'TAEKWONDO':
      return {
        fields: ['belt', 'poom', 'weight_class'],
        skills: ['kick', 'form', 'sparring', 'breaking'],
        icon: '🥋'
      };
    default:
      return {
        fields: [],
        skills: [],
        icon: '📚'
      };
  }
};
```

---

## ✅ 결론

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   현재: industry = 'basketball' (고정)                          │
│                                                                 │
│   개선: category_code = 'EDU.SPORTS.BALL.BASKETBALL'            │
│                                                                 │
│   효과:                                                         │
│   • 계층적 분류 가능                                            │
│   • 같은 종목끼리 그룹핑                                         │
│   • 카테고리별 기능 분기                                         │
│   • 확장성 (수영, 태권도 등 추가 가능)                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

*Updated: 2026-02-04*
