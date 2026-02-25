# 📡 AUTUS 2.0 - 11개 뷰 API 상세 스펙

---

## API 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  AUTUS 2.0 API Overview                                                    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Base URL: https://api.autus.ai/v1                                         │
│                                                                             │
│  Authentication: Bearer Token (JWT)                                         │
│  Header: Authorization: Bearer {token}                                      │
│                                                                             │
│  Common Headers:                                                            │
│  - X-Org-ID: {organization_id}                                             │
│  - X-Industry: academy | fnb | fitness | ...                               │
│                                                                             │
│  Response Format: JSON                                                      │
│  Error Format: { error: string, code: string, details?: any }              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ 🎛️ 조종석 API (Cockpit)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 조종석 API - 전체 상황 종합
# ═══════════════════════════════════════════════════════════════════════

/api/v1/cockpit:
  
  # ─────────────────────────────────────────────────────────────────────
  # GET /cockpit/summary - 전체 요약
  # ─────────────────────────────────────────────────────────────────────
  /summary:
    get:
      summary: 조종석 전체 요약
      description: 상태 등급, Internal/External 게이지, 알림 요약
      tags: [Cockpit]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  
                  # 전체 상태 등급
                  status:
                    type: object
                    properties:
                      level: 
                        type: string
                        enum: [green, yellow, red]
                        example: "yellow"
                      label:
                        type: string
                        example: "주의 필요"
                      updatedAt:
                        type: string
                        format: date-time
                  
                  # Internal 게이지
                  internal:
                    type: object
                    properties:
                      customerCount:
                        type: integer
                        example: 132
                      avgTemperature:
                        type: number
                        example: 68.5
                      riskCount:
                        type: integer
                        example: 3
                      warningCount:
                        type: integer
                        example: 8
                      healthyCount:
                        type: integer
                        example: 121
                      pendingConsultations:
                        type: integer
                        example: 2
                      unresolvedVoices:
                        type: integer
                        example: 5
                      pendingTasks:
                        type: integer
                        example: 3
                  
                  # External 게이지
                  external:
                    type: object
                    properties:
                      sigma:
                        type: number
                        example: 0.85
                      weatherForecast:
                        type: string
                        example: "storm"
                      weatherLabel:
                        type: string
                        example: "토요일 시험"
                      threatCount:
                        type: integer
                        example: 2
                      opportunityCount:
                        type: integer
                        example: 1
                      competitionScore:
                        type: string
                        example: "3:2"
                      marketTrend:
                        type: number
                        example: -0.05
                      heartbeatAlert:
                        type: boolean
                        example: true
                      heartbeatKeyword:
                        type: string
                        example: "사교육비"
                  
                  # 긴급 알림 요약
                  alertSummary:
                    type: object
                    properties:
                      critical:
                        type: integer
                        example: 1
                      warning:
                        type: integer
                        example: 3
                      info:
                        type: integer
                        example: 5

  # ─────────────────────────────────────────────────────────────────────
  # GET /cockpit/alerts - 알림 목록
  # ─────────────────────────────────────────────────────────────────────
  /alerts:
    get:
      summary: 알림 목록
      tags: [Cockpit]
      
      parameters:
        - name: level
          in: query
          schema:
            type: string
            enum: [critical, warning, info, all]
          example: "all"
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  alerts:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        level:
                          type: string
                          enum: [critical, warning, info]
                        category:
                          type: string
                          enum: [customer, external, voice, task]
                        title:
                          type: string
                          example: "김민수 온도 38° 위험"
                        description:
                          type: string
                          example: "비용 민감, 이탈확률 42%"
                        relatedId:
                          type: string
                          description: "관련 customer/event ID"
                        createdAt:
                          type: string
                          format: date-time

  # ─────────────────────────────────────────────────────────────────────
  # GET /cockpit/actions - 우선순위 액션
  # ─────────────────────────────────────────────────────────────────────
  /actions:
    get:
      summary: 우선순위 액션 목록
      tags: [Cockpit]
      
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [pending, in_progress, all]
          default: "pending"
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  actions:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        priority:
                          type: integer
                          example: 1
                        priorityLevel:
                          type: string
                          enum: [critical, high, medium, low]
                        title:
                          type: string
                          example: "김민수 학부모 상담"
                        context:
                          type: string
                          example: "온도 38°, 비용 민감, 이탈확률 42%"
                        category:
                          type: string
                          enum: [consultation, follow_up, marketing, defense]
                        customerId:
                          type: string
                          format: uuid
                        customerName:
                          type: string
                        assignedTo:
                          type: string
                          format: uuid
                        assignedName:
                          type: string
                        dueDate:
                          type: string
                          format: date-time
                        status:
                          type: string
                          enum: [pending, in_progress, completed]
                        aiRecommended:
                          type: boolean
                        expectedEffect:
                          type: object
                          properties:
                            temperatureChange:
                              type: number
                            churnReduction:
                              type: number
                  
                  progress:
                    type: object
                    properties:
                      completed:
                        type: integer
                      total:
                        type: integer
                      percentage:
                        type: number

  # ─────────────────────────────────────────────────────────────────────
  # WebSocket /cockpit/stream - 실시간 업데이트
  # ─────────────────────────────────────────────────────────────────────
  /stream:
    websocket:
      summary: 실시간 조종석 업데이트
      description: |
        실시간으로 상태 변화를 전송
        - status_change: 상태 등급 변경
        - alert_new: 새 알림
        - metric_update: 지표 업데이트
      
      messages:
        status_change:
          payload:
            type: object
            properties:
              type: 
                const: "status_change"
              data:
                $ref: "#/components/schemas/StatusLevel"
        
        alert_new:
          payload:
            type: object
            properties:
              type:
                const: "alert_new"
              data:
                $ref: "#/components/schemas/Alert"
        
        metric_update:
          payload:
            type: object
            properties:
              type:
                const: "metric_update"
              metric:
                type: string
              value:
                type: number
```

---

## 2️⃣ 🗺️ 지도 API (Map)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 지도 API - 공간 분석
# ═══════════════════════════════════════════════════════════════════════

/api/v1/map:

  # ─────────────────────────────────────────────────────────────────────
  # GET /map/customers - 고객 위치 분포
  # ─────────────────────────────────────────────────────────────────────
  /customers:
    get:
      summary: 고객 위치 분포
      tags: [Map]
      
      parameters:
        - name: radius
          in: query
          description: 반경 (미터)
          schema:
            type: integer
            enum: [500, 1000, 1500, 3000]
            default: 1500
        - name: status
          in: query
          schema:
            type: string
            enum: [all, at_risk, healthy]
            default: "all"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  center:
                    type: object
                    properties:
                      lat:
                        type: number
                        example: 37.5665
                      lng:
                        type: number
                        example: 126.9780
                  
                  customers:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                        lat:
                          type: number
                        lng:
                          type: number
                        temperature:
                          type: number
                        temperatureZone:
                          type: string
                          enum: [critical, warning, normal, good, excellent]
                        distanceMeters:
                          type: integer
                        nearestCompetitor:
                          type: string
                        nearestCompetitorDistance:
                          type: integer
                  
                  clusters:
                    type: array
                    description: 고객 밀집 지역
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        centerLat:
                          type: number
                        centerLng:
                          type: number
                        count:
                          type: integer
                        avgTemperature:
                          type: number
                  
                  summary:
                    type: object
                    properties:
                      total:
                        type: integer
                      byDirection:
                        type: object
                        properties:
                          north:
                            type: integer
                          south:
                            type: integer
                          east:
                            type: integer
                          west:
                            type: integer

  # ─────────────────────────────────────────────────────────────────────
  # GET /map/competitors - 경쟁사 위치
  # ─────────────────────────────────────────────────────────────────────
  /competitors:
    get:
      summary: 경쟁사 위치 및 정보
      tags: [Map]
      
      parameters:
        - name: radius
          in: query
          schema:
            type: integer
            default: 1500
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  competitors:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                          example: "D학원"
                        lat:
                          type: number
                        lng:
                          type: number
                        distanceMeters:
                          type: integer
                          example: 850
                        threatLevel:
                          type: string
                          enum: [high, medium, low]
                        customerCount:
                          type: integer
                          description: 추정 고객수
                        priceLevel:
                          type: string
                          enum: [high, medium, low]
                        recentActivity:
                          type: string
                          example: "프로모션 진행 중"
                        affectedCustomers:
                          type: integer
                          description: 영향권 내 우리 고객 수
                  
                  summary:
                    type: object
                    properties:
                      total:
                        type: integer
                      highThreat:
                        type: integer
                      totalAffectedCustomers:
                        type: integer

  # ─────────────────────────────────────────────────────────────────────
  # GET /map/zones - 위험/기회 지역
  # ─────────────────────────────────────────────────────────────────────
  /zones:
    get:
      summary: 위험/기회 지역
      tags: [Map]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  zones:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        type:
                          type: string
                          enum: [threat, opportunity, neutral]
                        name:
                          type: string
                          example: "북쪽 위험 지역"
                        description:
                          type: string
                          example: "D학원 인접, 고객 3명 위험"
                        polygon:
                          type: array
                          description: GeoJSON 좌표
                          items:
                            type: array
                            items:
                              type: number
                        customerCount:
                          type: integer
                        avgTemperature:
                          type: number
                        suggestedAction:
                          type: string

  # ─────────────────────────────────────────────────────────────────────
  # GET /map/market - 시장 규모
  # ─────────────────────────────────────────────────────────────────────
  /market:
    get:
      summary: 시장 규모 및 점유율
      tags: [Map]
      
      parameters:
        - name: radius
          in: query
          schema:
            type: integer
            default: 1500
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  marketSize:
                    type: integer
                    description: 추정 전체 시장 (명)
                    example: 1500
                  ourCustomers:
                    type: integer
                    example: 132
                  marketShare:
                    type: number
                    description: 점유율 (%)
                    example: 8.8
                  marketShareTrend:
                    type: number
                    description: 점유율 변화 (%)
                    example: 0.3
                  
                  competitorShares:
                    type: array
                    items:
                      type: object
                      properties:
                        name:
                          type: string
                        customerCount:
                          type: integer
                        marketShare:
                          type: number
```

---

## 3️⃣ 🌤️ 날씨 API (Weather)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 날씨 API - 시간 예측
# ═══════════════════════════════════════════════════════════════════════

/api/v1/weather:

  # ─────────────────────────────────────────────────────────────────────
  # GET /weather/forecast - 예보
  # ─────────────────────────────────────────────────────────────────────
  /forecast:
    get:
      summary: 주간/월간 예보
      tags: [Weather]
      
      parameters:
        - name: range
          in: query
          schema:
            type: string
            enum: [7d, 14d, 30d]
            default: "7d"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  days:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        dayOfWeek:
                          type: string
                          example: "월"
                        weather:
                          type: string
                          enum: [sunny, cloudy, partly_cloudy, rainy, storm]
                          description: σ 기반 날씨 아이콘
                        sigma:
                          type: number
                          example: 0.85
                        sigmaChange:
                          type: number
                          description: 전일 대비 변화
                        events:
                          type: array
                          items:
                            type: object
                            properties:
                              id:
                                type: string
                              name:
                                type: string
                                example: "중간고사"
                              category:
                                type: string
                              sigmaImpact:
                                type: number
                        affectedCount:
                          type: integer
                          description: 영향 받는 고객 수
                  
                  weekSummary:
                    type: object
                    properties:
                      avgSigma:
                        type: number
                      worstDay:
                        type: string
                        format: date
                      eventCount:
                        type: integer

  # ─────────────────────────────────────────────────────────────────────
  # GET /weather/events - 이벤트 목록
  # ─────────────────────────────────────────────────────────────────────
  /events:
    get:
      summary: 이벤트 목록
      tags: [Weather]
      
      parameters:
        - name: from
          in: query
          schema:
            type: string
            format: date
        - name: to
          in: query
          schema:
            type: string
            format: date
        - name: category
          in: query
          schema:
            type: string
            enum: [exam, season, competition, policy, all]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  events:
                    type: array
                    items:
                      $ref: "#/components/schemas/ExternalEvent"

  # ─────────────────────────────────────────────────────────────────────
  # GET /weather/events/{id} - 이벤트 상세
  # ─────────────────────────────────────────────────────────────────────
  /events/{id}:
    get:
      summary: 이벤트 상세
      tags: [Weather]
      
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      
      responses:
        200:
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ExternalEventDetail"

  # ─────────────────────────────────────────────────────────────────────
  # GET /weather/impact/{eventId} - 영향 분석
  # ─────────────────────────────────────────────────────────────────────
  /impact/{eventId}:
    get:
      summary: 이벤트 영향 분석
      tags: [Weather]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  event:
                    $ref: "#/components/schemas/ExternalEvent"
                  
                  impact:
                    type: object
                    properties:
                      direct:
                        type: object
                        description: 직격 영향
                        properties:
                          count:
                            type: integer
                          customers:
                            type: array
                            items:
                              $ref: "#/components/schemas/CustomerBrief"
                      
                      indirect:
                        type: object
                        description: 간접 영향
                        properties:
                          count:
                            type: integer
                          customers:
                            type: array
                            items:
                              $ref: "#/components/schemas/CustomerBrief"
                      
                      safe:
                        type: object
                        description: 영향 없음
                        properties:
                          count:
                            type: integer
                  
                  suggestedActions:
                    type: array
                    items:
                      type: object
                      properties:
                        action:
                          type: string
                        targetCount:
                          type: integer
                        priority:
                          type: string
```

---

## 4️⃣ 📡 레이더 API (Radar)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 레이더 API - 위협/기회 감지
# ═══════════════════════════════════════════════════════════════════════

/api/v1/radar:

  # ─────────────────────────────────────────────────────────────────────
  # GET /radar/threats - 위협 목록
  # ─────────────────────────────────────────────────────────────────────
  /threats:
    get:
      summary: 다가오는 위협 목록
      tags: [Radar]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  threats:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                          example: "D학원 프로모션"
                        category:
                          type: string
                          enum: [competition, market, policy, internal]
                        severity:
                          type: string
                          enum: [critical, high, medium, low]
                        eta:
                          type: integer
                          description: 도착 예상 (일)
                          example: 3
                        etaDate:
                          type: string
                          format: date
                        sigmaImpact:
                          type: number
                          example: -0.15
                        affectedCustomers:
                          type: integer
                          example: 8
                        description:
                          type: string
                        source:
                          type: string
                          description: 정보 출처
                        detectedAt:
                          type: string
                          format: date-time

  # ─────────────────────────────────────────────────────────────────────
  # GET /radar/opportunities - 기회 목록
  # ─────────────────────────────────────────────────────────────────────
  /opportunities:
    get:
      summary: 다가오는 기회 목록
      tags: [Radar]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  opportunities:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                          example: "C학원 강사 퇴사"
                        category:
                          type: string
                        potential:
                          type: string
                          enum: [high, medium, low]
                        eta:
                          type: integer
                        sigmaImpact:
                          type: number
                          example: 0.1
                        potentialCustomers:
                          type: integer
                          description: 잠재 유입 고객 수
                        description:
                          type: string
                        suggestedAction:
                          type: string

  # ─────────────────────────────────────────────────────────────────────
  # GET /radar/threats/{id} - 위협 상세
  # ─────────────────────────────────────────────────────────────────────
  /threats/{id}:
    get:
      summary: 위협 상세 정보
      tags: [Radar]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  threat:
                    $ref: "#/components/schemas/Threat"
                  
                  vulnerabilities:
                    type: array
                    description: 이 위협에 취약한 요인
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          example: "cost_sensitive"
                        customerCount:
                          type: integer
                        customers:
                          type: array
                          items:
                            $ref: "#/components/schemas/CustomerBrief"
                  
                  defenseStrategies:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        description:
                          type: string
                        expectedEffect:
                          type: object

  # ─────────────────────────────────────────────────────────────────────
  # GET /radar/vulnerabilities - 내부 취약점
  # ─────────────────────────────────────────────────────────────────────
  /vulnerabilities:
    get:
      summary: 내부 취약점 분석
      tags: [Radar]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  vulnerabilities:
                    type: array
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          enum: [cost_sensitive, competitor_adjacent, grade_declining, engagement_low]
                        label:
                          type: string
                          example: "비용 민감"
                        customerCount:
                          type: integer
                        riskLevel:
                          type: string
                          enum: [high, medium, low]
                        customers:
                          type: array
                          items:
                            $ref: "#/components/schemas/CustomerBrief"
                  
                  strengths:
                    type: array
                    description: 강점
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                        label:
                          type: string
                        customerCount:
                          type: integer
```

---

## 5️⃣ 🏆 스코어보드 API (Scoreboard)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 스코어보드 API - 경쟁 비교
# ═══════════════════════════════════════════════════════════════════════

/api/v1/score:

  # ─────────────────────────────────────────────────────────────────────
  # GET /score/competitors - 경쟁사 비교
  # ─────────────────────────────────────────────────────────────────────
  /competitors:
    get:
      summary: 경쟁사 대비 비교
      tags: [Scoreboard]
      
      parameters:
        - name: competitorId
          in: query
          description: 특정 경쟁사만 비교 (없으면 전체)
          schema:
            type: string
            format: uuid
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  comparisons:
                    type: array
                    items:
                      type: object
                      properties:
                        competitor:
                          type: object
                          properties:
                            id:
                              type: string
                            name:
                              type: string
                        
                        metrics:
                          type: array
                          items:
                            type: object
                            properties:
                              metric:
                                type: string
                                example: "customerCount"
                              label:
                                type: string
                                example: "재원수"
                              ourValue:
                                type: number
                              theirValue:
                                type: number
                              result:
                                type: string
                                enum: [win, lose, tie]
                              difference:
                                type: number
                        
                        summary:
                          type: object
                          properties:
                            wins:
                              type: integer
                            losses:
                              type: integer
                            ties:
                              type: integer
                            overallResult:
                              type: string
                              enum: [winning, losing, tied]

  # ─────────────────────────────────────────────────────────────────────
  # GET /score/goals - 목표 대비 현황
  # ─────────────────────────────────────────────────────────────────────
  /goals:
    get:
      summary: 목표 대비 현황
      tags: [Scoreboard]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  goals:
                    type: array
                    items:
                      type: object
                      properties:
                        metric:
                          type: string
                          example: "customerCount"
                        label:
                          type: string
                          example: "재원수"
                        current:
                          type: number
                          example: 132
                        target:
                          type: number
                          example: 150
                        progress:
                          type: number
                          description: 달성률 (%)
                          example: 88
                        status:
                          type: string
                          enum: [on_track, at_risk, behind, achieved]
                        gap:
                          type: number
                          description: 목표 대비 차이
                        trend:
                          type: string
                          enum: [improving, stable, declining]
                  
                  overallProgress:
                    type: number
                    description: 전체 목표 달성률

  # ─────────────────────────────────────────────────────────────────────
  # GET /score/trends - 트렌드
  # ─────────────────────────────────────────────────────────────────────
  /trends:
    get:
      summary: 지표 트렌드
      tags: [Scoreboard]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [1m, 3m, 6m, 1y]
            default: "3m"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  ourTrends:
                    type: array
                    items:
                      type: object
                      properties:
                        metric:
                          type: string
                        data:
                          type: array
                          items:
                            type: object
                            properties:
                              date:
                                type: string
                                format: date
                              value:
                                type: number
                        change:
                          type: number
                          description: 기간 대비 변화율
                  
                  competitorTrends:
                    type: array
                    items:
                      type: object
                      properties:
                        competitorId:
                          type: string
                        competitorName:
                          type: string
                        metric:
                          type: string
                        change:
                          type: number
```

---

## 6️⃣ 🌊 조류 API (Tide)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 조류 API - 트렌드 분석
# ═══════════════════════════════════════════════════════════════════════

/api/v1/tide:

  # ─────────────────────────────────────────────────────────────────────
  # GET /tide/market - 시장 트렌드
  # ─────────────────────────────────────────────────────────────────────
  /market:
    get:
      summary: 시장 트렌드
      tags: [Tide]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [3m, 6m, 1y]
            default: "6m"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  trend:
                    type: string
                    enum: [rising, falling, stable]
                    example: "falling"
                  trendLabel:
                    type: string
                    example: "썰물"
                  changePercent:
                    type: number
                    example: -5.2
                  
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        value:
                          type: number
                  
                  causes:
                    type: array
                    description: 트렌드 원인
                    items:
                      type: object
                      properties:
                        factor:
                          type: string
                          example: "출산율 감소"
                        impact:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /tide/internal - 내부 트렌드
  # ─────────────────────────────────────────────────────────────────────
  /internal:
    get:
      summary: 내부 트렌드 (우리 지표)
      tags: [Tide]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [3m, 6m, 1y]
            default: "6m"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  trend:
                    type: string
                    enum: [rising, falling, stable]
                  trendLabel:
                    type: string
                    example: "역류"
                  changePercent:
                    type: number
                    example: 8.3
                  
                  vsMarket:
                    type: object
                    properties:
                      status:
                        type: string
                        enum: [outperforming, matching, underperforming]
                      message:
                        type: string
                        example: "시장은 썰물(-5%), 우리는 역류(+8%)"
                  
                  data:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        ourValue:
                          type: number
                        marketValue:
                          type: number
                  
                  causes:
                    type: array
                    items:
                      type: object
                      properties:
                        factor:
                          type: string
                        impact:
                          type: number
                        isPositive:
                          type: boolean

  # ─────────────────────────────────────────────────────────────────────
  # GET /tide/competitors - 경쟁사 트렌드
  # ─────────────────────────────────────────────────────────────────────
  /competitors:
    get:
      summary: 경쟁사별 트렌드
      tags: [Tide]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  competitors:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        trend:
                          type: string
                          enum: [rising, falling, stable]
                        changePercent:
                          type: number
                        insight:
                          type: string
                          example: "최근 프로모션으로 상승 중"

  # ─────────────────────────────────────────────────────────────────────
  # GET /tide/forecast - 예측
  # ─────────────────────────────────────────────────────────────────────
  /forecast:
    get:
      summary: 트렌드 예측
      tags: [Tide]
      
      parameters:
        - name: horizon
          in: query
          description: 예측 기간 (월)
          schema:
            type: integer
            enum: [1, 3, 6]
            default: 3
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  forecast:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        predictedValue:
                          type: number
                        confidenceHigh:
                          type: number
                        confidenceLow:
                          type: number
                  
                  expectedTrend:
                    type: string
                    enum: [rising, falling, stable]
                  confidence:
                    type: number
                    description: 예측 신뢰도 (%)
```

---

## 7️⃣ 💓 심전도 API (Heartbeat)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 심전도 API - 여론/Voice 리듬 감지
# ═══════════════════════════════════════════════════════════════════════

/api/v1/heartbeat:

  # ─────────────────────────────────────────────────────────────────────
  # GET /heartbeat/external - 외부 여론
  # ─────────────────────────────────────────────────────────────────────
  /external:
    get:
      summary: 외부 여론 분석
      tags: [Heartbeat]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [1d, 7d, 30d]
            default: "7d"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  rhythm:
                    type: string
                    enum: [normal, elevated, spike, critical]
                    example: "spike"
                  rhythmLabel:
                    type: string
                    example: "급등"
                  
                  timeline:
                    type: array
                    description: 심전도 형태 데이터
                    items:
                      type: object
                      properties:
                        timestamp:
                          type: string
                          format: date-time
                        intensity:
                          type: number
                          description: 여론 강도 (0-100)
                  
                  keywords:
                    type: array
                    items:
                      type: object
                      properties:
                        keyword:
                          type: string
                          example: "사교육비"
                        count:
                          type: integer
                          example: 45
                        trend:
                          type: string
                          enum: [rising, stable, falling]
                        sentiment:
                          type: number
                          description: -1 (부정) ~ 1 (긍정)
                  
                  sources:
                    type: array
                    items:
                      type: object
                      properties:
                        source:
                          type: string
                          example: "네이버 뉴스"
                        count:
                          type: integer
                        topArticle:
                          type: string

  # ─────────────────────────────────────────────────────────────────────
  # GET /heartbeat/voice - 내부 Voice
  # ─────────────────────────────────────────────────────────────────────
  /voice:
    get:
      summary: 내부 Voice 분석
      tags: [Heartbeat]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [1d, 7d, 30d]
            default: "7d"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  rhythm:
                    type: string
                    enum: [normal, elevated, spike, critical]
                  
                  timeline:
                    type: array
                    items:
                      type: object
                      properties:
                        timestamp:
                          type: string
                          format: date-time
                        intensity:
                          type: number
                  
                  keywords:
                    type: array
                    items:
                      type: object
                      properties:
                        keyword:
                          type: string
                          example: "비용"
                        count:
                          type: integer
                        trend:
                          type: string
                        sentiment:
                          type: number
                  
                  byStage:
                    type: object
                    properties:
                      request:
                        type: integer
                      wish:
                        type: integer
                      complaint:
                        type: integer
                      churn_signal:
                        type: integer
                  
                  unresolvedCount:
                    type: integer
                  unresolvedVoices:
                    type: array
                    items:
                      $ref: "#/components/schemas/VoiceBrief"

  # ─────────────────────────────────────────────────────────────────────
  # GET /heartbeat/resonance - 공명 분석
  # ─────────────────────────────────────────────────────────────────────
  /resonance:
    get:
      summary: 외부-내부 공명 분석
      description: 외부 여론과 내부 Voice가 연결되는 지점 탐지
      tags: [Heartbeat]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  resonances:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        externalKeyword:
                          type: string
                          example: "사교육비"
                        internalKeyword:
                          type: string
                          example: "비용"
                        correlation:
                          type: number
                          description: 상관계수 (0-1)
                          example: 0.85
                        severity:
                          type: string
                          enum: [critical, high, medium, low]
                        affectedCustomers:
                          type: array
                          items:
                            $ref: "#/components/schemas/CustomerBrief"
                        suggestedAction:
                          type: string
                  
                  hasResonance:
                    type: boolean
                  resonanceAlert:
                    type: string
                    example: "외부 '사교육비' 여론과 내부 '비용' Voice가 공명 중!"

  # ─────────────────────────────────────────────────────────────────────
  # GET /heartbeat/keywords - 키워드 분석
  # ─────────────────────────────────────────────────────────────────────
  /keywords:
    get:
      summary: 키워드 상세 분석
      tags: [Heartbeat]
      
      parameters:
        - name: keyword
          in: query
          required: true
          schema:
            type: string
        - name: source
          in: query
          schema:
            type: string
            enum: [external, internal, both]
            default: "both"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  keyword:
                    type: string
                  
                  external:
                    type: object
                    properties:
                      count:
                        type: integer
                      trend:
                        type: string
                      sources:
                        type: array
                        items:
                          type: object
                  
                  internal:
                    type: object
                    properties:
                      count:
                        type: integer
                      trend:
                        type: string
                      customers:
                        type: array
                        items:
                          $ref: "#/components/schemas/CustomerBrief"
                  
                  timeline:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        externalCount:
                          type: integer
                        internalCount:
                          type: integer
```

---

## 8️⃣ 🔬 현미경 API (Microscope)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 현미경 API - 개별 고객 딥다이브
# ═══════════════════════════════════════════════════════════════════════

/api/v1/microscope:

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id} - 고객 상세
  # ─────────────────────────────────────────────────────────────────────
  /{id}:
    get:
      summary: 고객 상세 정보
      tags: [Microscope]
      
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  customer:
                    type: object
                    properties:
                      id:
                        type: string
                        format: uuid
                      name:
                        type: string
                      photo:
                        type: string
                        format: uri
                      
                      # 산업별 다른 필드
                      grade:
                        type: string
                        description: 학년 (학원)
                      class:
                        type: string
                        description: 반
                      
                      tenure:
                        type: integer
                        description: 등록 기간 (월)
                      stage:
                        type: string
                        description: 고객 여정 단계
                      
                      executor:
                        type: object
                        properties:
                          id:
                            type: string
                          name:
                            type: string
                      
                      payer:
                        type: object
                        description: 결제자 정보 (Payer≠User인 경우)
                        properties:
                          id:
                            type: string
                          name:
                            type: string
                          phone:
                            type: string
                  
                  temperature:
                    type: object
                    properties:
                      current:
                        type: number
                        example: 38
                      zone:
                        type: string
                        enum: [critical, warning, normal, good, excellent]
                      trend:
                        type: string
                        enum: [improving, stable, declining]
                      trendValue:
                        type: number
                        description: 지난주 대비 변화
                      
                  churnPrediction:
                    type: object
                    properties:
                      probability:
                        type: number
                        example: 0.42
                      predictedDate:
                        type: string
                        format: date
                      confidence:
                        type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/tsel - TSEL 분석
  # ─────────────────────────────────────────────────────────────────────
  /{id}/tsel:
    get:
      summary: TSEL 상세 분석
      tags: [Microscope]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  tsel:
                    type: object
                    properties:
                      trust:
                        type: object
                        properties:
                          score:
                            type: number
                          zone:
                            type: string
                          factors:
                            type: array
                            items:
                              type: object
                              properties:
                                id:
                                  type: string
                                name:
                                  type: string
                                score:
                                  type: number
                                status:
                                  type: string
                                  enum: [good, neutral, bad]
                      
                      satisfaction:
                        type: object
                        # 동일 구조
                      
                      engagement:
                        type: object
                        # 동일 구조
                      
                      loyalty:
                        type: object
                        # 동일 구조
                  
                  rIndex:
                    type: number
                    description: 종합 관계지수

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/sigma - σ 요인 분해
  # ─────────────────────────────────────────────────────────────────────
  /{id}/sigma:
    get:
      summary: σ 환경 요인 분해
      tags: [Microscope]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  sigma:
                    type: number
                    example: 0.7
                  sigmaLabel:
                    type: string
                    example: "나쁜 환경"
                  
                  breakdown:
                    type: object
                    properties:
                      internal:
                        type: object
                        properties:
                          score:
                            type: number
                          weight:
                            type: number
                          factors:
                            type: array
                            items:
                              type: object
                              properties:
                                id:
                                  type: string
                                name:
                                  type: string
                                value:
                                  type: number
                                impact:
                                  type: number
                      
                      voice:
                        type: object
                        properties:
                          score:
                            type: number
                          weight:
                            type: number
                          currentStage:
                            type: string
                          recentVoices:
                            type: integer
                      
                      external:
                        type: object
                        properties:
                          score:
                            type: number
                          weight:
                            type: number
                          factors:
                            type: array
                            items:
                              type: object
                              properties:
                                id:
                                  type: string
                                name:
                                  type: string
                                impact:
                                  type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/history - 히스토리
  # ─────────────────────────────────────────────────────────────────────
  /{id}/history:
    get:
      summary: 온도 변화 히스토리
      tags: [Microscope]
      
      parameters:
        - name: period
          in: query
          schema:
            type: string
            enum: [3m, 6m, 1y, all]
            default: "6m"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  timeline:
                    type: array
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        temperature:
                          type: number
                        event:
                          type: string
                          description: 해당 시점 주요 이벤트
                  
                  events:
                    type: array
                    description: 주요 이벤트 목록
                    items:
                      type: object
                      properties:
                        date:
                          type: string
                          format: date
                        type:
                          type: string
                          enum: [registration, grade_change, voice, consultation, temperature_drop]
                        description:
                          type: string
                        temperatureChange:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/voice - Voice 이력
  # ─────────────────────────────────────────────────────────────────────
  /{id}/voice:
    get:
      summary: Voice 이력
      tags: [Microscope]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  voices:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        date:
                          type: string
                          format: date
                        stage:
                          type: string
                          enum: [request, wish, complaint, churn_signal]
                        stageIcon:
                          type: string
                        category:
                          type: string
                        content:
                          type: string
                        sentiment:
                          type: number
                        status:
                          type: string
                          enum: [pending, resolved]
                        resolution:
                          type: string

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/predict - 예측
  # ─────────────────────────────────────────────────────────────────────
  /{id}/predict:
    get:
      summary: 미래 예측
      tags: [Microscope]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  churn:
                    type: object
                    properties:
                      probability:
                        type: number
                      predictedDate:
                        type: string
                        format: date
                      confidence:
                        type: number
                      mainFactors:
                        type: array
                        items:
                          type: string
                  
                  scenarios:
                    type: array
                    items:
                      type: object
                      properties:
                        scenario:
                          type: string
                          enum: [no_action, standard_care, intensive_care]
                        predictedTemperature:
                          type: number
                        predictedChurn:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /microscope/{id}/recommend - AI 추천
  # ─────────────────────────────────────────────────────────────────────
  /{id}/recommend:
    get:
      summary: AI 추천 액션
      tags: [Microscope]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  recommendation:
                    type: object
                    properties:
                      strategy:
                        type: string
                        example: "value_reinforcement"
                      strategyName:
                        type: string
                        example: "가치 재인식 상담"
                      reasoning:
                        type: string
                        example: "비용 민감 Voice + 경쟁사 프로모션 노출"
                      
                      tips:
                        type: array
                        items:
                          type: string
                        example:
                          - "가격 대비 가치 데이터 제시"
                          - "타학원 대비 성적 향상률 강조"
                      
                      expectedEffect:
                        type: object
                        properties:
                          temperatureChange:
                            type: number
                            example: 15
                          churnReduction:
                            type: number
                            example: 0.15
                  
                  actions:
                    type: array
                    items:
                      type: object
                      properties:
                        type:
                          type: string
                          enum: [consultation, message, task]
                        label:
                          type: string
                        suggested:
                          type: boolean
```

---

## 9️⃣ 🌐 네트워크 API (Network)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 네트워크 API - 관계망 분석
# ═══════════════════════════════════════════════════════════════════════

/api/v1/network:

  # ─────────────────────────────────────────────────────────────────────
  # GET /network/graph - 그래프 데이터
  # ─────────────────────────────────────────────────────────────────────
  /graph:
    get:
      summary: 네트워크 그래프 데이터
      tags: [Network]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  nodes:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                        temperature:
                          type: number
                        temperatureZone:
                          type: string
                        referralCount:
                          type: integer
                          description: 추천한 수
                        isInfluencer:
                          type: boolean
                        size:
                          type: number
                          description: 노드 크기 (영향력)
                  
                  edges:
                    type: array
                    items:
                      type: object
                      properties:
                        source:
                          type: string
                        target:
                          type: string
                        type:
                          type: string
                          enum: [referral, family, friend]

  # ─────────────────────────────────────────────────────────────────────
  # GET /network/influencers - 영향력자
  # ─────────────────────────────────────────────────────────────────────
  /influencers:
    get:
      summary: 영향력자 목록
      tags: [Network]
      
      parameters:
        - name: minReferrals
          in: query
          schema:
            type: integer
            default: 3
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  influencers:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                        referralCount:
                          type: integer
                        temperature:
                          type: number
                        temperatureZone:
                          type: string
                        connectedCustomers:
                          type: array
                          items:
                            $ref: "#/components/schemas/CustomerBrief"
                        riskLevel:
                          type: string
                          description: 이 사람 이탈 시 위험도
                          enum: [critical, high, medium, low]
                        cascadeRisk:
                          type: integer
                          description: 연쇄 이탈 위험 고객 수

  # ─────────────────────────────────────────────────────────────────────
  # GET /network/clusters - 클러스터
  # ─────────────────────────────────────────────────────────────────────
  /clusters:
    get:
      summary: 클러스터 분석
      tags: [Network]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  clusters:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                          description: 자동 생성된 이름
                        memberCount:
                          type: integer
                        avgTemperature:
                          type: number
                        healthStatus:
                          type: string
                          enum: [healthy, at_risk, critical]
                        keyMembers:
                          type: array
                          items:
                            $ref: "#/components/schemas/CustomerBrief"

  # ─────────────────────────────────────────────────────────────────────
  # GET /network/risk - 연쇄 이탈 위험
  # ─────────────────────────────────────────────────────────────────────
  /risk:
    get:
      summary: 연쇄 이탈 위험 분석
      tags: [Network]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  atRiskInfluencers:
                    type: array
                    description: 이탈 위험이 있는 영향력자
                    items:
                      type: object
                      properties:
                        influencer:
                          $ref: "#/components/schemas/CustomerBrief"
                        temperature:
                          type: number
                        churnProbability:
                          type: number
                        connectedAtRisk:
                          type: array
                          description: 연쇄 이탈 위험 고객
                          items:
                            $ref: "#/components/schemas/CustomerBrief"
                        totalCascadeRisk:
                          type: integer
                        estimatedLoss:
                          type: number
                          description: 예상 손실 (월 매출)
                  
                  isolatedNodes:
                    type: array
                    description: 고립된 고객 (관계 형성 필요)
                    items:
                      $ref: "#/components/schemas/CustomerBrief"
                  
                  summary:
                    type: object
                    properties:
                      totalCascadeRisk:
                        type: integer
                      estimatedTotalLoss:
                        type: number
```

---

## 🔟 📊 퍼널 API (Funnel)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 퍼널 API - 전환 분석
# ═══════════════════════════════════════════════════════════════════════

/api/v1/funnel:

  # ─────────────────────────────────────────────────────────────────────
  # GET /funnel/stages - 단계별 데이터
  # ─────────────────────────────────────────────────────────────────────
  /stages:
    get:
      summary: 퍼널 단계별 데이터
      tags: [Funnel]
      
      parameters:
        - name: type
          in: query
          schema:
            type: string
            enum: [acquisition, retention]
            default: "acquisition"
        - name: period
          in: query
          schema:
            type: string
            enum: [1m, 3m, 6m, 1y]
            default: "3m"
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  stages:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                        name:
                          type: string
                          example: "인지"
                        count:
                          type: integer
                          example: 500
                        percentage:
                          type: number
                          description: 첫 단계 대비 %
                          example: 100
                        conversionRate:
                          type: number
                          description: 이전 단계 대비 전환율
                        dropoffRate:
                          type: number
                          description: 이탈률
                  
                  summary:
                    type: object
                    properties:
                      totalConversion:
                        type: number
                        description: 전체 전환율
                      bottleneck:
                        type: string
                        description: 병목 단계
                      bottleneckDropoff:
                        type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /funnel/conversion - 전환율
  # ─────────────────────────────────────────────────────────────────────
  /conversion:
    get:
      summary: 전환율 상세
      tags: [Funnel]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  conversions:
                    type: array
                    items:
                      type: object
                      properties:
                        from:
                          type: string
                        to:
                          type: string
                        rate:
                          type: number
                        benchmark:
                          type: number
                          description: 업계 평균
                        status:
                          type: string
                          enum: [above, at, below]
                        gap:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /funnel/dropoff/{from}/{to} - 이탈 분석
  # ─────────────────────────────────────────────────────────────────────
  /dropoff/{from}/{to}:
    get:
      summary: 특정 단계 이탈 분석
      tags: [Funnel]
      
      parameters:
        - name: from
          in: path
          required: true
          schema:
            type: string
        - name: to
          in: path
          required: true
          schema:
            type: string
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  fromStage:
                    type: string
                  toStage:
                    type: string
                  dropoffRate:
                    type: number
                  dropoffCount:
                    type: integer
                  
                  reasons:
                    type: array
                    items:
                      type: object
                      properties:
                        reason:
                          type: string
                          example: "가격 부담"
                        percentage:
                          type: number
                          example: 35
                        count:
                          type: integer
                  
                  droppedCustomers:
                    type: array
                    items:
                      $ref: "#/components/schemas/CustomerBrief"
                  
                  suggestedActions:
                    type: array
                    items:
                      type: object
                      properties:
                        action:
                          type: string
                        expectedImprovement:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /funnel/benchmark - 벤치마크
  # ─────────────────────────────────────────────────────────────────────
  /benchmark:
    get:
      summary: 업계 벤치마크 비교
      tags: [Funnel]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  industry:
                    type: string
                  
                  comparisons:
                    type: array
                    items:
                      type: object
                      properties:
                        metric:
                          type: string
                        ourValue:
                          type: number
                        industryAvg:
                          type: number
                        topPerformer:
                          type: number
                        percentile:
                          type: integer
                          description: 우리 위치 (상위 %)
```

---

## 1️⃣1️⃣ 🔮 수정구 API (Crystal)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 수정구 API - 시나리오 시뮬레이션
# ═══════════════════════════════════════════════════════════════════════

/api/v1/crystal:

  # ─────────────────────────────────────────────────────────────────────
  # GET /crystal/current - 현재 상태
  # ─────────────────────────────────────────────────────────────────────
  /current:
    get:
      summary: 현재 상태 요약
      tags: [Crystal]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  metrics:
                    type: object
                    properties:
                      customerCount:
                        type: integer
                      churnRate:
                        type: number
                      newRate:
                        type: number
                      avgTemperature:
                        type: number
                      revenue:
                        type: number
                  
                  atRisk:
                    type: object
                    properties:
                      count:
                        type: integer
                      customers:
                        type: array
                        items:
                          $ref: "#/components/schemas/CustomerBrief"
                  
                  sigma:
                    type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /crystal/scenarios - 시나리오 목록
  # ─────────────────────────────────────────────────────────────────────
  /scenarios:
    get:
      summary: 저장된 시나리오 목록
      tags: [Crystal]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  scenarios:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          format: uuid
                        name:
                          type: string
                        description:
                          type: string
                        type:
                          type: string
                          enum: [threat, opportunity, strategy]
                        assumptions:
                          type: array
                          items:
                            type: object
                            properties:
                              variable:
                                type: string
                              change:
                                type: number
                        
                        prediction:
                          type: object
                          properties:
                            customerCount:
                              type: integer
                            revenue:
                              type: number
                            churnRate:
                              type: number
                        
                        roi:
                          type: number
                        isRecommended:
                          type: boolean
                        createdAt:
                          type: string
                          format: date-time

  # ─────────────────────────────────────────────────────────────────────
  # POST /crystal/simulate - 시뮬레이션 실행
  # ─────────────────────────────────────────────────────────────────────
  /simulate:
    post:
      summary: 시나리오 시뮬레이션
      tags: [Crystal]
      
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                  description: 시나리오 이름
                horizon:
                  type: integer
                  description: 예측 기간 (월)
                  default: 3
                assumptions:
                  type: array
                  items:
                    type: object
                    properties:
                      variable:
                        type: string
                        enum: [sigma, churnRate, newRate, price, cost]
                      change:
                        type: number
                        description: 변화율 또는 절대값
                      changeType:
                        type: string
                        enum: [percent, absolute]
                actions:
                  type: array
                  description: 계획된 액션
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                      targetCount:
                        type: integer
                      expectedEffect:
                        type: number
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  scenario:
                    type: object
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                  
                  timeline:
                    type: array
                    items:
                      type: object
                      properties:
                        month:
                          type: integer
                        customerCount:
                          type: integer
                        revenue:
                          type: number
                        churnRate:
                          type: number
                  
                  finalState:
                    type: object
                    properties:
                      customerCount:
                        type: integer
                      customerChange:
                        type: integer
                      revenue:
                        type: number
                      revenueChange:
                        type: number
                  
                  investment:
                    type: number
                  expectedReturn:
                    type: number
                  roi:
                    type: number
                  
                  confidence:
                    type: number

  # ─────────────────────────────────────────────────────────────────────
  # GET /crystal/recommend - AI 추천
  # ─────────────────────────────────────────────────────────────────────
  /recommend:
    get:
      summary: AI 추천 시나리오
      tags: [Crystal]
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  recommendation:
                    type: object
                    properties:
                      scenarioId:
                        type: string
                      scenarioName:
                        type: string
                      reasoning:
                        type: string
                      pros:
                        type: array
                        items:
                          type: string
                      cons:
                        type: array
                        items:
                          type: string
                      roi:
                        type: number
                      confidence:
                        type: number
                  
                  alternatives:
                    type: array
                    items:
                      type: object
                      properties:
                        scenarioId:
                          type: string
                        scenarioName:
                          type: string
                        roi:
                          type: number

  # ─────────────────────────────────────────────────────────────────────
  # POST /crystal/plan - 실행 계획 생성
  # ─────────────────────────────────────────────────────────────────────
  /plan:
    post:
      summary: 시나리오 → 실행 계획 변환
      tags: [Crystal]
      
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                scenarioId:
                  type: string
                  format: uuid
      
      responses:
        200:
          content:
            application/json:
              schema:
                type: object
                properties:
                  plan:
                    type: object
                    properties:
                      scenarioId:
                        type: string
                      scenarioName:
                        type: string
                      
                      tasks:
                        type: array
                        items:
                          type: object
                          properties:
                            id:
                              type: string
                            title:
                              type: string
                            description:
                              type: string
                            priority:
                              type: string
                            suggestedAssignee:
                              type: string
                            dueDate:
                              type: string
                              format: date
                            expectedEffect:
                              type: object
                      
                      milestones:
                        type: array
                        items:
                          type: object
                          properties:
                            week:
                              type: integer
                            target:
                              type: string
                            kpi:
                              type: string
                  
                  message:
                    type: string
                    example: "15개 태스크가 생성되었습니다"
```

---

## 📦 공통 스키마 (Components)

```yaml
# ═══════════════════════════════════════════════════════════════════════
# 공통 스키마
# ═══════════════════════════════════════════════════════════════════════

components:
  schemas:
    
    # ─────────────────────────────────────────────────────────────────────
    # CustomerBrief - 고객 요약 (목록용)
    # ─────────────────────────────────────────────────────────────────────
    CustomerBrief:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        temperature:
          type: number
        temperatureZone:
          type: string
          enum: [critical, warning, normal, good, excellent]
        churnProbability:
          type: number
    
    # ─────────────────────────────────────────────────────────────────────
    # VoiceBrief - Voice 요약
    # ─────────────────────────────────────────────────────────────────────
    VoiceBrief:
      type: object
      properties:
        id:
          type: string
          format: uuid
        customerId:
          type: string
        customerName:
          type: string
        stage:
          type: string
          enum: [request, wish, complaint, churn_signal]
        category:
          type: string
        content:
          type: string
        createdAt:
          type: string
          format: date-time
        daysUnresolved:
          type: integer
    
    # ─────────────────────────────────────────────────────────────────────
    # ExternalEvent
    # ─────────────────────────────────────────────────────────────────────
    ExternalEvent:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        category:
          type: string
        type:
          type: string
          enum: [threat, opportunity, neutral]
        date:
          type: string
          format: date
        sigmaImpact:
          type: number
        description:
          type: string
    
    # ─────────────────────────────────────────────────────────────────────
    # ExternalEventDetail
    # ─────────────────────────────────────────────────────────────────────
    ExternalEventDetail:
      allOf:
        - $ref: "#/components/schemas/ExternalEvent"
        - type: object
          properties:
            affectedCustomerCount:
              type: integer
            affectedCustomers:
              type: array
              items:
                $ref: "#/components/schemas/CustomerBrief"
            suggestedActions:
              type: array
              items:
                type: object
                properties:
                  action:
                    type: string
                  priority:
                    type: string
    
    # ─────────────────────────────────────────────────────────────────────
    # Alert
    # ─────────────────────────────────────────────────────────────────────
    Alert:
      type: object
      properties:
        id:
          type: string
          format: uuid
        level:
          type: string
          enum: [critical, warning, info]
        category:
          type: string
        title:
          type: string
        description:
          type: string
        relatedId:
          type: string
        createdAt:
          type: string
          format: date-time
    
    # ─────────────────────────────────────────────────────────────────────
    # Threat
    # ─────────────────────────────────────────────────────────────────────
    Threat:
      type: object
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        category:
          type: string
        severity:
          type: string
          enum: [critical, high, medium, low]
        eta:
          type: integer
        sigmaImpact:
          type: number
        affectedCustomers:
          type: integer
        description:
          type: string
    
    # ─────────────────────────────────────────────────────────────────────
    # StatusLevel
    # ─────────────────────────────────────────────────────────────────────
    StatusLevel:
      type: object
      properties:
        level:
          type: string
          enum: [green, yellow, red]
        label:
          type: string
        updatedAt:
          type: string
          format: date-time

  # ─────────────────────────────────────────────────────────────────────
  # 인증
  # ─────────────────────────────────────────────────────────────────────
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

---

## API 요약 테이블

| # | 뷰 | 베이스 경로 | 주요 엔드포인트 |
|---|---|---|---|
| 1 | 🎛️ 조종석 | `/api/v1/cockpit` | summary, alerts, actions, stream(WS) |
| 2 | 🗺️ 지도 | `/api/v1/map` | customers, competitors, zones, market |
| 3 | 🌤️ 날씨 | `/api/v1/weather` | forecast, events, impact |
| 4 | 📡 레이더 | `/api/v1/radar` | threats, opportunities, vulnerabilities |
| 5 | 🏆 스코어보드 | `/api/v1/score` | competitors, goals, trends |
| 6 | 🌊 조류 | `/api/v1/tide` | market, internal, competitors, forecast |
| 7 | 💓 심전도 | `/api/v1/heartbeat` | external, voice, resonance, keywords |
| 8 | 🔬 현미경 | `/api/v1/microscope` | {id}, tsel, sigma, history, voice, predict, recommend |
| 9 | 🌐 네트워크 | `/api/v1/network` | graph, influencers, clusters, risk |
| 10 | 📊 퍼널 | `/api/v1/funnel` | stages, conversion, dropoff, benchmark |
| 11 | 🔮 수정구 | `/api/v1/crystal` | current, scenarios, simulate, recommend, plan |

---

*문서 버전: 2.0*  
*최종 업데이트: 2026-01-27*
