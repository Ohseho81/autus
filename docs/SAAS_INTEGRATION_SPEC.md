# 🔗 AUTUS SaaS 연동 시스템 스펙

> **n8n 기반 범용 SaaS → AUTUS 통합 아키텍처**

---

## 📋 Table of Contents

1. [연동 아키텍처](#1-연동-아키텍처)
2. [지원 SaaS 목록](#2-지원-saas-목록)
3. [n8n 워크플로우 스펙](#3-n8n-워크플로우-스펙)
4. [Zero Meaning 정제 규칙](#4-zero-meaning-정제-규칙)
5. [Neo4j 통합](#5-neo4j-통합)
6. [실시간 동기화](#6-실시간-동기화)
7. [에러 처리](#7-에러-처리)
8. [배포 설정](#8-배포-설정)

---

## 1. 연동 아키텍처

### 1.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTUS SaaS 연동 아키텍처                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Shopify │ │ Stripe  │ │ QuickBooks│ │  Xero  │ │ 기타SaaS │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │           │           │             │
│       └───────────┴───────────┴───────────┴───────────┘             │
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     n8n Webhook Hub                          │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  POST /webhook/shopify                                │   │   │
│  │  │  POST /webhook/stripe                                 │   │   │
│  │  │  POST /webhook/quickbooks                             │   │   │
│  │  │  POST /webhook/universal                              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Zero Meaning 정제 레이어                       │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  • 이름/역할/국가 제거                                │   │   │
│  │  │  • 숫자만 추출 (금액, 수량)                           │   │   │
│  │  │  • ID → node_id 변환                                  │   │   │
│  │  │  • 금액 → value 정규화                                │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│                    ┌───────────┴───────────┐                       │
│                    │                       │                        │
│                    ▼                       ▼                        │
│  ┌─────────────────────────┐   ┌─────────────────────────┐         │
│  │      PostgreSQL         │   │        Neo4j            │         │
│  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │         │
│  │  │ nodes             │  │   │  │ (:Node)-[:FLOW]-> │  │         │
│  │  │ motions           │  │   │  │ Synergy 계산      │  │         │
│  │  │ import_logs       │  │   │  │ 경로 분석         │  │         │
│  │  └───────────────────┘  │   │  └───────────────────┘  │         │
│  └─────────────────────────┘   └─────────────────────────┘         │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Physics Map (Frontend)                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Cosmograph / Leaflet 실시간 렌더링                   │   │   │
│  │  │  5초 polling 또는 WebSocket 업데이트                  │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름

```
[SaaS 이벤트]
     │
     ▼
[Webhook 수신] ─────────────────────────────────────────────┐
     │                                                       │
     ▼                                                       │
[이벤트 타입 판별]                                          │
     │                                                       │
     ├── payment_succeeded ─┐                               │
     ├── order_created ─────┼── [inflow] ──┐               │
     ├── subscription_renewed ─┘            │               │
     │                                       │               │
     ├── refund_issued ─────┐               │               │
     ├── order_cancelled ───┼── [outflow] ─┤               │
     ├── chargeback ────────┘               │               │
     │                                       │               │
     └── customer_created ─── [node_create] ┤               │
                                            │               │
                                            ▼               │
                               [Zero Meaning 정제]          │
                                            │               │
                                            ▼               │
                               [PostgreSQL + Neo4j 저장]    │
                                            │               │
                                            ▼               │
                               [가치 재계산 트리거]         │
                                            │               │
                                            ▼               │
                               [Physics Map 업데이트] ◄─────┘
```

---

## 2. 지원 SaaS 목록

### 2.1 결제/커머스

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Stripe** | payment_intent.succeeded | inflow |
| | charge.refunded | outflow |
| | customer.created | node_create |
| | subscription.created | recurring_inflow |
| **Shopify** | orders/create | inflow |
| | orders/cancelled | outflow |
| | refunds/create | outflow |
| | customers/create | node_create |
| **PayPal** | PAYMENT.CAPTURE.COMPLETED | inflow |
| | PAYMENT.CAPTURE.REFUNDED | outflow |
| **Square** | payment.completed | inflow |
| | refund.created | outflow |

### 2.2 회계/재무

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **QuickBooks** | Invoice.Created | pending_inflow |
| | Payment.Created | inflow |
| | Bill.Created | pending_outflow |
| | BillPayment.Created | outflow |
| **Xero** | INVOICE.CREATED | pending_inflow |
| | PAYMENT.CREATED | inflow |
| | BILL.CREATED | pending_outflow |
| **FreshBooks** | invoice.create | pending_inflow |
| | payment.create | inflow |

### 2.3 구독/SaaS

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Paddle** | subscription_created | recurring_inflow |
| | subscription_cancelled | recurring_end |
| | payment_succeeded | inflow |
| **Chargebee** | subscription_created | recurring_inflow |
| | payment_succeeded | inflow |
| | refund_created | outflow |
| **Recurly** | new_subscription | recurring_inflow |
| | successful_payment | inflow |

### 2.4 CRM/영업

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **HubSpot** | deal.propertyChange (stage=won) | potential_inflow |
| | contact.creation | node_create |
| **Salesforce** | Opportunity.Won | potential_inflow |
| | Account.Created | node_create |
| **Pipedrive** | deal.won | potential_inflow |
| | person.added | node_create |

### 2.5 뱅킹/핀테크

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Plaid** | transactions.sync | inflow/outflow |
| **Toss Payments** | PAYMENT_STATUS_CHANGED | inflow |
| | REFUND_STATUS_CHANGED | outflow |
| **카카오페이** | approved | inflow |
| | cancelled | outflow |

---

## 3. n8n 워크플로우 스펙

### 3.1 범용 Webhook (모든 SaaS 공통)

```json
{
  "name": "AUTUS Universal Webhook",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "universal-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Universal Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// ═══════════════════════════════════════════════════════════\n// AUTUS Zero Meaning 범용 정제기\n// ═══════════════════════════════════════════════════════════\n\nconst payload = $json.body || $json;\nconst headers = $json.headers || {};\n\n// SaaS 자동 감지\nfunction detectSaaS(headers, payload) {\n  if (headers['stripe-signature']) return 'stripe';\n  if (headers['x-shopify-hmac-sha256']) return 'shopify';\n  if (headers['x-paypal-auth-algo']) return 'paypal';\n  if (payload.realmId) return 'quickbooks';\n  if (payload.resourceId && payload.eventType) return 'xero';\n  return 'unknown';\n}\n\nconst saas = detectSaaS(headers, payload);\n\n// Zero Meaning 정제\nfunction extractZeroMeaning(saas, payload) {\n  const result = {\n    node_id: null,\n    value: 0,\n    flow_type: 'unknown',  // inflow, outflow, node_create\n    source: saas,\n    timestamp: new Date().toISOString()\n  };\n\n  switch(saas) {\n    case 'stripe':\n      if (payload.type === 'payment_intent.succeeded') {\n        result.node_id = payload.data.object.customer || 'anon_' + Date.now();\n        result.value = payload.data.object.amount / 100;\n        result.flow_type = 'inflow';\n      } else if (payload.type === 'charge.refunded') {\n        result.node_id = payload.data.object.customer || 'anon_' + Date.now();\n        result.value = payload.data.object.amount_refunded / 100;\n        result.flow_type = 'outflow';\n      } else if (payload.type === 'customer.created') {\n        result.node_id = payload.data.object.id;\n        result.flow_type = 'node_create';\n      }\n      break;\n\n    case 'shopify':\n      const eventName = headers['x-shopify-topic'] || '';\n      if (eventName.includes('orders/create') || eventName.includes('orders/paid')) {\n        result.node_id = payload.customer?.id?.toString() || 'anon_' + Date.now();\n        result.value = parseFloat(payload.total_price) || 0;\n        result.flow_type = 'inflow';\n      } else if (eventName.includes('refunds/create') || eventName.includes('orders/cancelled')) {\n        result.node_id = payload.order?.customer?.id?.toString() || 'anon_' + Date.now();\n        result.value = parseFloat(payload.refund?.transactions?.[0]?.amount || payload.total_price) || 0;\n        result.flow_type = 'outflow';\n      } else if (eventName.includes('customers/create')) {\n        result.node_id = payload.id?.toString();\n        result.flow_type = 'node_create';\n      }\n      break;\n\n    case 'paypal':\n      if (payload.event_type === 'PAYMENT.CAPTURE.COMPLETED') {\n        result.node_id = payload.resource.payer?.payer_id || 'anon_' + Date.now();\n        result.value = parseFloat(payload.resource.amount?.value) || 0;\n        result.flow_type = 'inflow';\n      } else if (payload.event_type === 'PAYMENT.CAPTURE.REFUNDED') {\n        result.node_id = payload.resource.payer?.payer_id || 'anon_' + Date.now();\n        result.value = parseFloat(payload.resource.amount?.value) || 0;\n        result.flow_type = 'outflow';\n      }\n      break;\n\n    case 'quickbooks':\n      if (payload.eventNotifications) {\n        const event = payload.eventNotifications[0];\n        const entityName = event.dataChangeEvent?.entities?.[0]?.name;\n        if (entityName === 'Payment') {\n          result.node_id = event.dataChangeEvent.entities[0].id;\n          result.flow_type = 'inflow';\n          // 금액은 별도 API 호출 필요\n        }\n      }\n      break;\n\n    default:\n      // 범용 매핑 시도\n      result.node_id = payload.customer_id || payload.user_id || payload.id || 'unknown_' + Date.now();\n      result.value = parseFloat(payload.amount || payload.total || payload.revenue || 0);\n      result.flow_type = payload.refund || payload.cancelled ? 'outflow' : 'inflow';\n  }\n\n  // Zero Meaning 강제: 의미 필드 제거\n  // ❌ name, email, address, description 등 제거됨\n\n  return result;\n}\n\nconst cleaned = extractZeroMeaning(saas, payload);\n\n// 유효성 검사\nif (!cleaned.node_id || cleaned.flow_type === 'unknown') {\n  return [{ json: { error: 'Invalid payload', saas, raw: payload } }];\n}\n\nreturn [{ json: cleaned }];"
      },
      "name": "Zero Meaning 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "equals",
              "value2": "node_create"
            }
          ]
        }
      },
      "name": "Flow Type 분기",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes",
        "method": "POST",
        "body": {
          "lat": 0,
          "lon": 0,
          "value": 0,
          "external_id": "={{$json.node_id}}",
          "source": "={{$json.source}}"
        },
        "options": {}
      },
      "name": "노드 생성 API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1000, 200]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/motions",
        "method": "POST",
        "body": {
          "source_external_id": "={{$json.flow_type === 'inflow' ? $json.node_id : 'owner'}}",
          "target_external_id": "={{$json.flow_type === 'inflow' ? 'owner' : $json.node_id}}",
          "amount": "={{$json.value}}"
        },
        "options": {}
      },
      "name": "모션 생성 API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1000, 400]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes/external/{{$json.node_id}}/calculate",
        "method": "POST",
        "options": {}
      },
      "name": "가치 재계산 트리거",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1250, 400]
    }
  ],
  "connections": {
    "Universal Webhook": {
      "main": [[{"node": "Zero Meaning 정제", "type": "main", "index": 0}]]
    },
    "Zero Meaning 정제": {
      "main": [[{"node": "Flow Type 분기", "type": "main", "index": 0}]]
    },
    "Flow Type 분기": {
      "main": [
        [{"node": "노드 생성 API", "type": "main", "index": 0}],
        [{"node": "모션 생성 API", "type": "main", "index": 0}]
      ]
    },
    "모션 생성 API": {
      "main": [[{"node": "가치 재계산 트리거", "type": "main", "index": 0}]]
    }
  }
}
```

### 3.2 Stripe 전용 워크플로우

```json
{
  "name": "Stripe → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "stripe-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Stripe Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// Stripe 서명 검증 (선택)\n// const signature = $input.first().json.headers['stripe-signature'];\n// TODO: crypto.timingSafeEqual로 검증\n\nconst event = $json.body;\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: null,\n  event_type: event.type,\n  stripe_id: event.id\n};\n\nswitch(event.type) {\n  case 'payment_intent.succeeded':\n    result.node_id = event.data.object.customer || 'stripe_anon_' + event.data.object.id;\n    result.value = event.data.object.amount / 100;\n    result.flow_type = 'inflow';\n    break;\n\n  case 'payment_intent.payment_failed':\n    // 실패는 무시 또는 로깅만\n    return [];\n\n  case 'charge.refunded':\n    result.node_id = event.data.object.customer || 'stripe_anon_' + event.data.object.payment_intent;\n    result.value = event.data.object.amount_refunded / 100;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'charge.dispute.created':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.amount / 100;\n    result.flow_type = 'outflow';  // 분쟁은 잠재적 outflow\n    break;\n\n  case 'customer.created':\n    result.node_id = event.data.object.id;\n    result.flow_type = 'node_create';\n    break;\n\n  case 'customer.subscription.created':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.items.data[0]?.price?.unit_amount / 100 || 0;\n    result.flow_type = 'recurring_setup';\n    break;\n\n  case 'invoice.paid':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.amount_paid / 100;\n    result.flow_type = 'inflow';\n    break;\n\n  default:\n    // 미지원 이벤트 로깅\n    console.log('Unsupported Stripe event:', event.type);\n    return [];\n}\n\nif (!result.node_id) return [];\n\n// Zero Meaning: 고객 이름, 이메일 등 제거\n// ❌ event.data.object.name, email, address 무시\n\nreturn [{ json: result }];"
      },
      "name": "Stripe 이벤트 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MERGE (n:Node {external_id: $node_id})\nON CREATE SET n.value = 0, n.created_at = datetime()\nON MATCH SET n.updated_at = datetime()\nRETURN n.external_id as node_id, n.value as current_value",
        "parameters": {
          "node_id": "={{$json.node_id}}"
        }
      },
      "name": "Neo4j 노드 Upsert",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "notEquals",
              "value2": "node_create"
            }
          ]
        }
      },
      "name": "모션 필요 여부",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MATCH (owner:Node {external_id: 'owner'})\nMATCH (customer:Node {external_id: $customer_id})\nCREATE (source)-[:FLOW {amount: $amount, type: $flow_type, created_at: datetime()}]->(target)\nWITH customer\nSET customer.value = customer.value + $value_change\nRETURN customer.external_id, customer.value",
        "parameters": {
          "customer_id": "={{$json.node_id}}",
          "amount": "={{$json.value}}",
          "flow_type": "={{$json.flow_type}}",
          "value_change": "={{$json.flow_type === 'inflow' ? $json.value : -$json.value}}"
        }
      },
      "name": "Neo4j 모션 + 가치 업데이트",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [1250, 250]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes/external/{{$json.node_id}}/recalculate-synergy",
        "method": "POST"
      },
      "name": "시너지 재계산",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1500, 250]
    }
  ],
  "connections": {
    "Stripe Webhook": {
      "main": [[{"node": "Stripe 이벤트 정제", "type": "main", "index": 0}]]
    },
    "Stripe 이벤트 정제": {
      "main": [[{"node": "Neo4j 노드 Upsert", "type": "main", "index": 0}]]
    },
    "Neo4j 노드 Upsert": {
      "main": [[{"node": "모션 필요 여부", "type": "main", "index": 0}]]
    },
    "모션 필요 여부": {
      "main": [
        [{"node": "Neo4j 모션 + 가치 업데이트", "type": "main", "index": 0}],
        []
      ]
    },
    "Neo4j 모션 + 가치 업데이트": {
      "main": [[{"node": "시너지 재계산", "type": "main", "index": 0}]]
    }
  }
}
```

### 3.3 Shopify 전용 워크플로우

```json
{
  "name": "Shopify → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "shopify-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Shopify Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// Shopify HMAC 검증 (선택)\n// const hmac = $input.first().json.headers['x-shopify-hmac-sha256'];\n// TODO: HMAC 검증 구현\n\nconst topic = $input.first().json.headers['x-shopify-topic'];\nconst payload = $json.body;\n\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: null,\n  event_topic: topic,\n  shopify_id: payload.id\n};\n\nswitch(topic) {\n  case 'orders/create':\n  case 'orders/paid':\n    result.node_id = payload.customer?.id?.toString() || 'shopify_guest_' + payload.id;\n    result.value = parseFloat(payload.total_price) || 0;\n    result.flow_type = 'inflow';\n    break;\n\n  case 'orders/cancelled':\n    result.node_id = payload.customer?.id?.toString() || 'shopify_guest_' + payload.id;\n    result.value = parseFloat(payload.total_price) || 0;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'orders/fulfilled':\n    // 배송 완료 - 가치 확정\n    result.node_id = payload.customer?.id?.toString();\n    result.flow_type = 'fulfilled';\n    break;\n\n  case 'refunds/create':\n    result.node_id = payload.order?.customer?.id?.toString();\n    result.value = payload.transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'customers/create':\n    result.node_id = payload.id?.toString();\n    result.flow_type = 'node_create';\n    break;\n\n  case 'customers/update':\n    // 고객 정보 업데이트는 Zero Meaning상 무시\n    // 이름, 이메일 변경은 가치에 영향 없음\n    return [];\n\n  default:\n    console.log('Unsupported Shopify topic:', topic);\n    return [];\n}\n\nif (!result.node_id) return [];\n\n// Zero Meaning 강제\n// ❌ payload.customer.first_name, last_name, email 무시\n// ❌ payload.shipping_address, billing_address 무시\n// ❌ payload.note, tags 무시\n\nreturn [{ json: result }];"
      },
      "name": "Shopify 이벤트 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MERGE (n:Node {external_id: $node_id, source: 'shopify'})\nON CREATE SET n.value = 0, n.created_at = datetime()\nRETURN n",
        "parameters": {
          "node_id": "={{$json.node_id}}"
        }
      },
      "name": "Neo4j 노드 생성/조회",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "isNotEmpty"
            }
          ]
        }
      },
      "name": "유효 이벤트 필터",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MATCH (shop:Node {external_id: 'shop_owner'})\nMATCH (customer:Node {external_id: $customer_id})\n\n// 모션 생성\nCREATE (shop)-[:FLOW {\n  amount: $amount,\n  direction: $direction,\n  shopify_order_id: $order_id,\n  created_at: datetime()\n}]->(customer)\n\n// 가치 업데이트\nWITH customer, $value_delta as delta\nSET customer.value = customer.value + delta,\n    customer.last_transaction = datetime()\n\nRETURN customer.external_id as id, customer.value as new_value",
        "parameters": {
          "customer_id": "={{$json.node_id}}",
          "amount": "={{Math.abs($json.value)}}",
          "direction": "={{$json.flow_type}}",
          "order_id": "={{$json.shopify_id}}",
          "value_delta": "={{$json.flow_type === 'inflow' ? $json.value : -$json.value}}"
        }
      },
      "name": "Neo4j 모션 + 가치",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [1250, 250]
    }
  ],
  "connections": {
    "Shopify Webhook": {
      "main": [[{"node": "Shopify 이벤트 정제", "type": "main", "index": 0}]]
    },
    "Shopify 이벤트 정제": {
      "main": [[{"node": "Neo4j 노드 생성/조회", "type": "main", "index": 0}]]
    },
    "Neo4j 노드 생성/조회": {
      "main": [[{"node": "유효 이벤트 필터", "type": "main", "index": 0}]]
    },
    "유효 이벤트 필터": {
      "main": [
        [{"node": "Neo4j 모션 + 가치", "type": "main", "index": 0}],
        []
      ]
    }
  }
}
```

### 3.4 QuickBooks 연동

```json
{
  "name": "QuickBooks → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickbooks-webhook",
        "responseMode": "onReceived"
      },
      "name": "QuickBooks Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const payload = $json.body;\n\n// QuickBooks 웹훅은 변경 알림만 옴\n// 실제 데이터는 API로 다시 조회 필요\n\nconst events = payload.eventNotifications || [];\nconst results = [];\n\nfor (const event of events) {\n  const entities = event.dataChangeEvent?.entities || [];\n  \n  for (const entity of entities) {\n    const result = {\n      entity_type: entity.name,\n      entity_id: entity.id,\n      operation: entity.operation,  // Create, Update, Delete\n      realm_id: event.realmId,\n      flow_type: null,\n      needs_api_call: true  // 상세 데이터 필요\n    };\n\n    // 엔티티 타입별 분류\n    switch(entity.name) {\n      case 'Payment':\n        result.flow_type = 'inflow';\n        break;\n      case 'SalesReceipt':\n        result.flow_type = 'inflow';\n        break;\n      case 'Invoice':\n        result.flow_type = 'pending_inflow';\n        break;\n      case 'Bill':\n        result.flow_type = 'pending_outflow';\n        break;\n      case 'BillPayment':\n        result.flow_type = 'outflow';\n        break;\n      case 'Vendor':\n      case 'Customer':\n        result.flow_type = 'node_create';\n        break;\n      default:\n        continue;  // 지원하지 않는 엔티티 스킵\n    }\n\n    results.push({ json: result });\n  }\n}\n\nreturn results;"
      },
      "name": "QuickBooks 이벤트 파싱",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "url": "https://quickbooks.api.intuit.com/v3/company/{{$json.realm_id}}/{{$json.entity_type.toLowerCase()}}/{{$json.entity_id}}",
        "method": "GET",
        "authentication": "oAuth2Api",
        "options": {}
      },
      "name": "QuickBooks API 상세 조회",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [750, 300]
    },
    {
      "parameters": {
        "functionCode": "const entity = $json;\nconst entityType = $input.first().json.entity_type;\n\n// Zero Meaning 정제\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: $input.first().json.flow_type\n};\n\nswitch(entityType) {\n  case 'Payment':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'SalesReceipt':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'Invoice':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.Balance) || 0;  // 미수금\n    break;\n  case 'Bill':\n    result.node_id = 'qb_vendor_' + entity.VendorRef?.value;\n    result.value = parseFloat(entity.Balance) || 0;  // 미지급금\n    break;\n  case 'BillPayment':\n    result.node_id = 'qb_vendor_' + entity.VendorRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'Customer':\n    result.node_id = 'qb_cust_' + entity.Id;\n    result.flow_type = 'node_create';\n    break;\n  case 'Vendor':\n    result.node_id = 'qb_vendor_' + entity.Id;\n    result.flow_type = 'node_create';\n    break;\n}\n\n// Zero Meaning 강제\n// ❌ entity.DisplayName, CompanyName, PrimaryEmailAddr 무시\n\nreturn [{ json: result }];"
      },
      "name": "Zero Meaning 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/webhooks/process",
        "method": "POST",
        "body": "={{$json}}",
        "options": {}
      },
      "name": "AUTUS API 전송",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1250, 300]
    }
  ],
  "connections": {
    "QuickBooks Webhook": {
      "main": [[{"node": "QuickBooks 이벤트 파싱", "type": "main", "index": 0}]]
    },
    "QuickBooks 이벤트 파싱": {
      "main": [[{"node": "QuickBooks API 상세 조회", "type": "main", "index": 0}]]
    },
    "QuickBooks API 상세 조회": {
      "main": [[{"node": "Zero Meaning 정제", "type": "main", "index": 0}]]
    },
    "Zero Meaning 정제": {
      "main": [[{"node": "AUTUS API 전송", "type": "main", "index": 0}]]
    }
  }
}
```

---

## 4. Zero Meaning 정제 규칙

### 4.1 필드 매핑 규칙

```javascript
// Zero Meaning 매퍼 모듈

const ZeroMeaningMapper = {
  
  // ═══════════════════════════════════════════════════════════
  // 허용 필드 (숫자 데이터만)
  // ═══════════════════════════════════════════════════════════
  
  ALLOWED_FIELDS: {
    // ID 계열
    'id': 'node_id',
    'customer_id': 'node_id',
    'user_id': 'node_id',
    'vendor_id': 'node_id',
    'account_id': 'node_id',
    
    // 금액 계열
    'amount': 'value',
    'total': 'value',
    'total_price': 'value',
    'total_amount': 'value',
    'revenue': 'value',
    'price': 'value',
    'balance': 'value',
    
    // 시간 계열
    'created_at': 'timestamp',
    'updated_at': 'timestamp',
    'occurred_at': 'timestamp'
  },
  
  // ═══════════════════════════════════════════════════════════
  // 금지 필드 (의미 데이터)
  // ═══════════════════════════════════════════════════════════
  
  FORBIDDEN_FIELDS: [
    // 신원
    'name', 'first_name', 'last_name', 'full_name',
    'email', 'phone', 'address', 'city', 'country',
    
    // 설명
    'description', 'note', 'notes', 'memo', 'comment',
    'title', 'subject', 'message',
    
    // 분류
    'type', 'category', 'tag', 'tags', 'label',
    'status', 'state', 'stage',
    
    // 기타 의미
    'company', 'organization', 'department',
    'product_name', 'item_name', 'sku'
  ],
  
  // ═══════════════════════════════════════════════════════════
  // 정제 함수
  // ═══════════════════════════════════════════════════════════
  
  cleanse(rawData) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(rawData)) {
      const lowerKey = key.toLowerCase();
      
      // 금지 필드 스킵
      if (this.FORBIDDEN_FIELDS.includes(lowerKey)) {
        continue;
      }
      
      // 허용 필드 매핑
      if (this.ALLOWED_FIELDS[lowerKey]) {
        const mappedKey = this.ALLOWED_FIELDS[lowerKey];
        cleaned[mappedKey] = this.normalizeValue(value, mappedKey);
        continue;
      }
      
      // 숫자 값만 허용
      if (typeof value === 'number') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  },
  
  normalizeValue(value, type) {
    switch(type) {
      case 'node_id':
        return String(value);
      case 'value':
        return parseFloat(value) || 0;
      case 'timestamp':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }
};

module.exports = ZeroMeaningMapper;
```

### 4.2 SaaS별 정제 예시

```javascript
// 정제 전 (Stripe)
{
  "id": "pi_1234567890",
  "customer": "cus_abc123",
  "amount": 5000,
  "currency": "usd",
  "customer_email": "john@example.com",      // ❌ 제거
  "customer_name": "John Doe",               // ❌ 제거
  "description": "Monthly subscription",      // ❌ 제거
  "shipping": {                               // ❌ 제거
    "address": { "city": "Seoul", ... }
  }
}

// 정제 후 (Zero Meaning)
{
  "node_id": "cus_abc123",
  "value": 50.00,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

```javascript
// 정제 전 (Shopify)
{
  "id": 123456789,
  "customer": {
    "id": 987654321,
    "first_name": "Jane",                    // ❌ 제거
    "last_name": "Smith",                    // ❌ 제거
    "email": "jane@shop.com"                 // ❌ 제거
  },
  "total_price": "150000.00",
  "line_items": [                            // ❌ 제거 (상품명 포함)
    { "name": "Blue T-Shirt", ... }
  ],
  "shipping_address": { ... },               // ❌ 제거
  "note": "Please gift wrap"                 // ❌ 제거
}

// 정제 후 (Zero Meaning)
{
  "node_id": "987654321",
  "value": 150000.00,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## 5. Neo4j 통합

### 5.1 그래프 스키마

```cypher
// ═══════════════════════════════════════════════════════════
// 노드 타입
// ═══════════════════════════════════════════════════════════

// Owner 노드 (상점/사업자 - 고정)
CREATE (owner:Node:Owner {
  external_id: 'owner',
  value: 0,
  created_at: datetime()
})

// Customer/Vendor 노드 (동적 생성)
CREATE (n:Node {
  external_id: $external_id,    // SaaS 고유 ID
  source: $source,              // 'stripe', 'shopify', 'quickbooks'
  value: 0,
  created_at: datetime(),
  updated_at: datetime()
})

// ═══════════════════════════════════════════════════════════
// 관계 타입
// ═══════════════════════════════════════════════════════════

// 돈 흐름 (Motion)
CREATE (a)-[:FLOW {
  amount: $amount,
  direction: $direction,        // 'inflow', 'outflow'
  source_event: $event_type,    // 'payment', 'refund', 'order'
  external_ref: $external_id,   // SaaS 트랜잭션 ID
  created_at: datetime()
}]->(b)

// ═══════════════════════════════════════════════════════════
// 인덱스
// ═══════════════════════════════════════════════════════════

CREATE INDEX node_external_id IF NOT EXISTS
FOR (n:Node) ON (n.external_id);

CREATE INDEX node_source IF NOT EXISTS
FOR (n:Node) ON (n.source);

CREATE INDEX node_value IF NOT EXISTS
FOR (n:Node) ON (n.value);
```

### 5.2 Cypher 쿼리 모음

```cypher
// ═══════════════════════════════════════════════════════════
// 노드 Upsert
// ═══════════════════════════════════════════════════════════

// 외부 ID로 노드 생성 또는 업데이트
MERGE (n:Node {external_id: $external_id})
ON CREATE SET 
  n.value = 0,
  n.source = $source,
  n.created_at = datetime()
ON MATCH SET 
  n.updated_at = datetime()
RETURN n;

// ═══════════════════════════════════════════════════════════
// 모션(돈 흐름) 생성
// ═══════════════════════════════════════════════════════════

// Inflow: 고객 → Owner
MATCH (customer:Node {external_id: $customer_id})
MATCH (owner:Node {external_id: 'owner'})
CREATE (customer)-[:FLOW {
  amount: $amount,
  direction: 'inflow',
  created_at: datetime()
}]->(owner)
WITH customer
SET customer.value = customer.value + $amount
RETURN customer;

// Outflow: Owner → 고객
MATCH (customer:Node {external_id: $customer_id})
MATCH (owner:Node {external_id: 'owner'})
CREATE (owner)-[:FLOW {
  amount: $amount,
  direction: 'outflow',
  created_at: datetime()
}]->(customer)
WITH customer
SET customer.value = customer.value - $amount
RETURN customer;

// ═══════════════════════════════════════════════════════════
// 가치 계산
// ═══════════════════════════════════════════════════════════

// 노드 가치 = 총 inflow - 총 outflow
MATCH (n:Node {external_id: $node_id})
OPTIONAL MATCH (n)-[inflow:FLOW {direction: 'inflow'}]->()
OPTIONAL MATCH ()-[outflow:FLOW {direction: 'outflow'}]->(n)
WITH n, 
     COALESCE(SUM(inflow.amount), 0) as total_in,
     COALESCE(SUM(outflow.amount), 0) as total_out
SET n.value = total_in - total_out,
    n.calculated_at = datetime()
RETURN n.external_id, n.value;

// ═══════════════════════════════════════════════════════════
// 시너지 계산
// ═══════════════════════════════════════════════════════════

// 연결된 노드 가치 합계의 10%
MATCH (n:Node {external_id: $node_id})-[:FLOW*1..2]-(connected:Node)
WHERE n <> connected
WITH n, SUM(DISTINCT connected.value) * 0.1 as synergy
SET n.synergy = synergy
RETURN n.external_id, n.value, n.synergy;

// ═══════════════════════════════════════════════════════════
// 조회 쿼리
// ═══════════════════════════════════════════════════════════

// 전체 노드 목록 (Physics Map용)
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id,
       n.value as value,
       n.source as source,
       n.created_at as created
ORDER BY n.value DESC
LIMIT 10000;

// 전체 모션 목록
MATCH (a:Node)-[f:FLOW]->(b:Node)
RETURN a.external_id as source,
       b.external_id as target,
       f.amount as amount,
       f.direction as direction,
       f.created_at as timestamp
ORDER BY f.created_at DESC
LIMIT 50000;

// 상위 가치 고객
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value
ORDER BY n.value DESC
LIMIT 100;
```

---

## 6. 실시간 동기화

### 6.1 Polling 방식 (기본)

```javascript
// frontend/src/hooks/useRealtimeData.ts

import { useState, useEffect, useCallback } from 'react';

interface RealtimeConfig {
  apiUrl: string;
  pollingInterval?: number;  // ms
}

export function useRealtimeData(config: RealtimeConfig) {
  const { apiUrl, pollingInterval = 5000 } = config;
  
  const [nodes, setNodes] = useState([]);
  const [motions, setMotions] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      // 병렬 fetch
      const [nodesRes, motionsRes] = await Promise.all([
        fetch(`${apiUrl}/nodes?limit=10000`),
        fetch(`${apiUrl}/motions?limit=50000`)
      ]);
      
      if (!nodesRes.ok || !motionsRes.ok) {
        throw new Error('API 호출 실패');
      }
      
      const [nodesData, motionsData] = await Promise.all([
        nodesRes.json(),
        motionsRes.json()
      ]);
      
      setNodes(nodesData);
      setMotions(motionsData);
      setLastUpdate(new Date());
      setError(null);
      
    } catch (err) {
      setError(err.message);
      console.error('데이터 fetch 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);
  
  // 초기 로드 + 폴링
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchData, pollingInterval]);
  
  // 수동 새로고침
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);
  
  return {
    nodes,
    motions,
    lastUpdate,
    isLoading,
    error,
    refresh
  };
}

// 사용 예시
function PhysicsMap() {
  const { nodes, motions, lastUpdate, refresh } = useRealtimeData({
    apiUrl: process.env.REACT_APP_API_URL,
    pollingInterval: 5000
  });
  
  useEffect(() => {
    if (cosmograph && nodes.length > 0) {
      cosmograph.setData({
        nodes: nodes.map(n => ({
          id: n.external_id,
          value: n.value
        })),
        links: motions.map(m => ({
          source: m.source,
          target: m.target,
          value: m.amount
        }))
      });
    }
  }, [nodes, motions]);
  
  return (
    <div>
      <div>마지막 업데이트: {lastUpdate?.toLocaleTimeString()}</div>
      <button onClick={refresh}>새로고침</button>
      <CosmographCanvas />
    </div>
  );
}
```

### 6.2 WebSocket 방식 (고급)

```python
# backend/websocket_manager.py

from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            'all': set(),
            'nodes': set(),
            'motions': set()
        }
    
    async def connect(self, websocket: WebSocket, channel: str = 'all'):
        await websocket.accept()
        self.active_connections[channel].add(websocket)
        self.active_connections['all'].add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        for channel in self.active_connections.values():
            channel.discard(websocket)
    
    async def broadcast(self, message: dict, channel: str = 'all'):
        """특정 채널 구독자에게 브로드캐스트"""
        connections = self.active_connections.get(channel, set())
        
        dead_connections = set()
        for connection in connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        # 죽은 연결 정리
        for dead in dead_connections:
            self.disconnect(dead)
    
    async def broadcast_node_update(self, node_id: str, value: float):
        await self.broadcast({
            'type': 'NODE_UPDATE',
            'data': {
                'node_id': node_id,
                'value': value,
                'timestamp': datetime.now().isoformat()
            }
        }, channel='nodes')
    
    async def broadcast_motion_created(self, motion: dict):
        await self.broadcast({
            'type': 'MOTION_CREATED',
            'data': motion
        }, channel='motions')

manager = ConnectionManager()

# FastAPI WebSocket 엔드포인트
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = 'all'):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            # 클라이언트 메시지 처리 (ping/pong 등)
            if data == 'ping':
                await websocket.send_text('pong')
    except:
        manager.disconnect(websocket)
```

```typescript
// frontend/src/hooks/useWebSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: string;
  data: any;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket 연결됨');
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // 자동 재연결
        reconnectTimeout.current = setTimeout(connect, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 에러:', error);
        ws.close();
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  }, [url]);
  
  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);
  
  // Heartbeat (연결 유지)
  useEffect(() => {
    if (!isConnected) return;
    
    const heartbeat = setInterval(() => {
      wsRef.current?.send('ping');
    }, 30000);
    
    return () => clearInterval(heartbeat);
  }, [isConnected]);
  
  return {
    isConnected,
    lastMessage,
    send: (data: any) => wsRef.current?.send(JSON.stringify(data))
  };
}
```

---

## 7. 에러 처리

### 7.1 n8n 에러 핸들링

```json
{
  "name": "에러 처리 워크플로우",
  "nodes": [
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.error !== undefined}}",
              "value2": true
            }
          ]
        }
      },
      "name": "에러 체크",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1
    },
    {
      "parameters": {
        "functionCode": "// 에러 로깅\nconst error = $json.error;\nconst context = {\n  workflow: $workflow.name,\n  node: $node.name,\n  timestamp: new Date().toISOString(),\n  input: $json\n};\n\nconsole.error('AUTUS Webhook Error:', { error, context });\n\nreturn [{\n  json: {\n    error_type: error.type || 'unknown',\n    error_message: error.message || String(error),\n    context\n  }\n}];"
      },
      "name": "에러 로깅",
      "type": "n8n-nodes-base.function"
    },
    {
      "parameters": {
        "url": "={{$env.SLACK_WEBHOOK_URL}}",
        "method": "POST",
        "body": {
          "text": "🚨 AUTUS Webhook 에러\n```{{JSON.stringify($json, null, 2)}}```"
        }
      },
      "name": "Slack 알림",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "tableName": "webhook_errors",
        "columns": "error_type,error_message,context,created_at"
      },
      "name": "에러 DB 저장",
      "type": "n8n-nodes-base.postgres"
    }
  ]
}
```

### 7.2 재시도 로직

```javascript
// 재시도 래퍼
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`시도 ${attempt}/${maxRetries} 실패:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

// 사용 예시
const result = await withRetry(
  () => fetch('/api/nodes', { method: 'POST', body: JSON.stringify(data) }),
  3,
  2000
);
```

---

## 8. 배포 설정

### 8.1 n8n Docker 설정

```yaml
# docker-compose.n8n.yml

version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com/
      - GENERIC_TIMEZONE=Asia/Seoul
      
      # 보안
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      
      # 데이터베이스
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      
      # 실행 설정
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7일
      
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - autus-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - autus-network

volumes:
  n8n_data:
  postgres_data:

networks:
  autus-network:
    external: true
```

### 8.2 환경 변수

```env
# .env.n8n

# n8n
N8N_PASSWORD=secure_password_here
N8N_ENCRYPTION_KEY=random_32_char_string

# Database
DB_PASSWORD=postgres_password

# AUTUS API
AUTUS_API_URL=https://api.autus.io
AUTUS_API_KEY=your_api_key

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password

# Slack (에러 알림)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# SaaS Credentials
STRIPE_WEBHOOK_SECRET=whsec_...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
```

### 8.3 Webhook URL 설정

```
각 SaaS에 등록할 Webhook URL:

Stripe:
  https://your-n8n-domain.com/webhook/stripe-webhook

Shopify:
  https://your-n8n-domain.com/webhook/shopify-webhook

QuickBooks:
  https://your-n8n-domain.com/webhook/quickbooks-webhook

범용:
  https://your-n8n-domain.com/webhook/universal-webhook
```

---

## 📊 통합 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AUTUS SaaS 연동 시스템                                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  지원 SaaS: 15+ (Stripe, Shopify, QuickBooks, ...)        │
│  n8n 워크플로우: 5개 (범용 + 전용)                         │
│  Zero Meaning 자동 정제                                     │
│  Neo4j 실시간 동기화                                        │
│  Polling (5초) 또는 WebSocket                              │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  데이터 흐름:                                               │
│  SaaS → Webhook → n8n → Zero Meaning → Neo4j → UI         │
│                                                             │
│  처리 지연: < 1초 (Webhook 수신 → DB 저장)                 │
│  UI 반영: 5초 (Polling) 또는 100ms (WebSocket)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*AUTUS SaaS 연동 시스템 스펙 © 2025*




# 🔗 AUTUS SaaS 연동 시스템 스펙

> **n8n 기반 범용 SaaS → AUTUS 통합 아키텍처**

---

## 📋 Table of Contents

1. [연동 아키텍처](#1-연동-아키텍처)
2. [지원 SaaS 목록](#2-지원-saas-목록)
3. [n8n 워크플로우 스펙](#3-n8n-워크플로우-스펙)
4. [Zero Meaning 정제 규칙](#4-zero-meaning-정제-규칙)
5. [Neo4j 통합](#5-neo4j-통합)
6. [실시간 동기화](#6-실시간-동기화)
7. [에러 처리](#7-에러-처리)
8. [배포 설정](#8-배포-설정)

---

## 1. 연동 아키텍처

### 1.1 전체 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTUS SaaS 연동 아키텍처                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ Shopify │ │ Stripe  │ │ QuickBooks│ │  Xero  │ │ 기타SaaS │       │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │
│       │           │           │           │           │             │
│       └───────────┴───────────┴───────────┴───────────┘             │
│                               │                                      │
│                               ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     n8n Webhook Hub                          │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  POST /webhook/shopify                                │   │   │
│  │  │  POST /webhook/stripe                                 │   │   │
│  │  │  POST /webhook/quickbooks                             │   │   │
│  │  │  POST /webhook/universal                              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               Zero Meaning 정제 레이어                       │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  • 이름/역할/국가 제거                                │   │   │
│  │  │  • 숫자만 추출 (금액, 수량)                           │   │   │
│  │  │  • ID → node_id 변환                                  │   │   │
│  │  │  • 금액 → value 정규화                                │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────┬───────────────────────────────┘   │
│                                │                                    │
│                    ┌───────────┴───────────┐                       │
│                    │                       │                        │
│                    ▼                       ▼                        │
│  ┌─────────────────────────┐   ┌─────────────────────────┐         │
│  │      PostgreSQL         │   │        Neo4j            │         │
│  │  ┌───────────────────┐  │   │  ┌───────────────────┐  │         │
│  │  │ nodes             │  │   │  │ (:Node)-[:FLOW]-> │  │         │
│  │  │ motions           │  │   │  │ Synergy 계산      │  │         │
│  │  │ import_logs       │  │   │  │ 경로 분석         │  │         │
│  │  └───────────────────┘  │   │  └───────────────────┘  │         │
│  └─────────────────────────┘   └─────────────────────────┘         │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Physics Map (Frontend)                    │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Cosmograph / Leaflet 실시간 렌더링                   │   │   │
│  │  │  5초 polling 또는 WebSocket 업데이트                  │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 데이터 흐름

```
[SaaS 이벤트]
     │
     ▼
[Webhook 수신] ─────────────────────────────────────────────┐
     │                                                       │
     ▼                                                       │
[이벤트 타입 판별]                                          │
     │                                                       │
     ├── payment_succeeded ─┐                               │
     ├── order_created ─────┼── [inflow] ──┐               │
     ├── subscription_renewed ─┘            │               │
     │                                       │               │
     ├── refund_issued ─────┐               │               │
     ├── order_cancelled ───┼── [outflow] ─┤               │
     ├── chargeback ────────┘               │               │
     │                                       │               │
     └── customer_created ─── [node_create] ┤               │
                                            │               │
                                            ▼               │
                               [Zero Meaning 정제]          │
                                            │               │
                                            ▼               │
                               [PostgreSQL + Neo4j 저장]    │
                                            │               │
                                            ▼               │
                               [가치 재계산 트리거]         │
                                            │               │
                                            ▼               │
                               [Physics Map 업데이트] ◄─────┘
```

---

## 2. 지원 SaaS 목록

### 2.1 결제/커머스

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Stripe** | payment_intent.succeeded | inflow |
| | charge.refunded | outflow |
| | customer.created | node_create |
| | subscription.created | recurring_inflow |
| **Shopify** | orders/create | inflow |
| | orders/cancelled | outflow |
| | refunds/create | outflow |
| | customers/create | node_create |
| **PayPal** | PAYMENT.CAPTURE.COMPLETED | inflow |
| | PAYMENT.CAPTURE.REFUNDED | outflow |
| **Square** | payment.completed | inflow |
| | refund.created | outflow |

### 2.2 회계/재무

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **QuickBooks** | Invoice.Created | pending_inflow |
| | Payment.Created | inflow |
| | Bill.Created | pending_outflow |
| | BillPayment.Created | outflow |
| **Xero** | INVOICE.CREATED | pending_inflow |
| | PAYMENT.CREATED | inflow |
| | BILL.CREATED | pending_outflow |
| **FreshBooks** | invoice.create | pending_inflow |
| | payment.create | inflow |

### 2.3 구독/SaaS

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Paddle** | subscription_created | recurring_inflow |
| | subscription_cancelled | recurring_end |
| | payment_succeeded | inflow |
| **Chargebee** | subscription_created | recurring_inflow |
| | payment_succeeded | inflow |
| | refund_created | outflow |
| **Recurly** | new_subscription | recurring_inflow |
| | successful_payment | inflow |

### 2.4 CRM/영업

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **HubSpot** | deal.propertyChange (stage=won) | potential_inflow |
| | contact.creation | node_create |
| **Salesforce** | Opportunity.Won | potential_inflow |
| | Account.Created | node_create |
| **Pipedrive** | deal.won | potential_inflow |
| | person.added | node_create |

### 2.5 뱅킹/핀테크

| SaaS | 이벤트 | 매핑 |
|------|--------|------|
| **Plaid** | transactions.sync | inflow/outflow |
| **Toss Payments** | PAYMENT_STATUS_CHANGED | inflow |
| | REFUND_STATUS_CHANGED | outflow |
| **카카오페이** | approved | inflow |
| | cancelled | outflow |

---

## 3. n8n 워크플로우 스펙

### 3.1 범용 Webhook (모든 SaaS 공통)

```json
{
  "name": "AUTUS Universal Webhook",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "universal-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Universal Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// ═══════════════════════════════════════════════════════════\n// AUTUS Zero Meaning 범용 정제기\n// ═══════════════════════════════════════════════════════════\n\nconst payload = $json.body || $json;\nconst headers = $json.headers || {};\n\n// SaaS 자동 감지\nfunction detectSaaS(headers, payload) {\n  if (headers['stripe-signature']) return 'stripe';\n  if (headers['x-shopify-hmac-sha256']) return 'shopify';\n  if (headers['x-paypal-auth-algo']) return 'paypal';\n  if (payload.realmId) return 'quickbooks';\n  if (payload.resourceId && payload.eventType) return 'xero';\n  return 'unknown';\n}\n\nconst saas = detectSaaS(headers, payload);\n\n// Zero Meaning 정제\nfunction extractZeroMeaning(saas, payload) {\n  const result = {\n    node_id: null,\n    value: 0,\n    flow_type: 'unknown',  // inflow, outflow, node_create\n    source: saas,\n    timestamp: new Date().toISOString()\n  };\n\n  switch(saas) {\n    case 'stripe':\n      if (payload.type === 'payment_intent.succeeded') {\n        result.node_id = payload.data.object.customer || 'anon_' + Date.now();\n        result.value = payload.data.object.amount / 100;\n        result.flow_type = 'inflow';\n      } else if (payload.type === 'charge.refunded') {\n        result.node_id = payload.data.object.customer || 'anon_' + Date.now();\n        result.value = payload.data.object.amount_refunded / 100;\n        result.flow_type = 'outflow';\n      } else if (payload.type === 'customer.created') {\n        result.node_id = payload.data.object.id;\n        result.flow_type = 'node_create';\n      }\n      break;\n\n    case 'shopify':\n      const eventName = headers['x-shopify-topic'] || '';\n      if (eventName.includes('orders/create') || eventName.includes('orders/paid')) {\n        result.node_id = payload.customer?.id?.toString() || 'anon_' + Date.now();\n        result.value = parseFloat(payload.total_price) || 0;\n        result.flow_type = 'inflow';\n      } else if (eventName.includes('refunds/create') || eventName.includes('orders/cancelled')) {\n        result.node_id = payload.order?.customer?.id?.toString() || 'anon_' + Date.now();\n        result.value = parseFloat(payload.refund?.transactions?.[0]?.amount || payload.total_price) || 0;\n        result.flow_type = 'outflow';\n      } else if (eventName.includes('customers/create')) {\n        result.node_id = payload.id?.toString();\n        result.flow_type = 'node_create';\n      }\n      break;\n\n    case 'paypal':\n      if (payload.event_type === 'PAYMENT.CAPTURE.COMPLETED') {\n        result.node_id = payload.resource.payer?.payer_id || 'anon_' + Date.now();\n        result.value = parseFloat(payload.resource.amount?.value) || 0;\n        result.flow_type = 'inflow';\n      } else if (payload.event_type === 'PAYMENT.CAPTURE.REFUNDED') {\n        result.node_id = payload.resource.payer?.payer_id || 'anon_' + Date.now();\n        result.value = parseFloat(payload.resource.amount?.value) || 0;\n        result.flow_type = 'outflow';\n      }\n      break;\n\n    case 'quickbooks':\n      if (payload.eventNotifications) {\n        const event = payload.eventNotifications[0];\n        const entityName = event.dataChangeEvent?.entities?.[0]?.name;\n        if (entityName === 'Payment') {\n          result.node_id = event.dataChangeEvent.entities[0].id;\n          result.flow_type = 'inflow';\n          // 금액은 별도 API 호출 필요\n        }\n      }\n      break;\n\n    default:\n      // 범용 매핑 시도\n      result.node_id = payload.customer_id || payload.user_id || payload.id || 'unknown_' + Date.now();\n      result.value = parseFloat(payload.amount || payload.total || payload.revenue || 0);\n      result.flow_type = payload.refund || payload.cancelled ? 'outflow' : 'inflow';\n  }\n\n  // Zero Meaning 강제: 의미 필드 제거\n  // ❌ name, email, address, description 등 제거됨\n\n  return result;\n}\n\nconst cleaned = extractZeroMeaning(saas, payload);\n\n// 유효성 검사\nif (!cleaned.node_id || cleaned.flow_type === 'unknown') {\n  return [{ json: { error: 'Invalid payload', saas, raw: payload } }];\n}\n\nreturn [{ json: cleaned }];"
      },
      "name": "Zero Meaning 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "equals",
              "value2": "node_create"
            }
          ]
        }
      },
      "name": "Flow Type 분기",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes",
        "method": "POST",
        "body": {
          "lat": 0,
          "lon": 0,
          "value": 0,
          "external_id": "={{$json.node_id}}",
          "source": "={{$json.source}}"
        },
        "options": {}
      },
      "name": "노드 생성 API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1000, 200]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/motions",
        "method": "POST",
        "body": {
          "source_external_id": "={{$json.flow_type === 'inflow' ? $json.node_id : 'owner'}}",
          "target_external_id": "={{$json.flow_type === 'inflow' ? 'owner' : $json.node_id}}",
          "amount": "={{$json.value}}"
        },
        "options": {}
      },
      "name": "모션 생성 API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1000, 400]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes/external/{{$json.node_id}}/calculate",
        "method": "POST",
        "options": {}
      },
      "name": "가치 재계산 트리거",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1250, 400]
    }
  ],
  "connections": {
    "Universal Webhook": {
      "main": [[{"node": "Zero Meaning 정제", "type": "main", "index": 0}]]
    },
    "Zero Meaning 정제": {
      "main": [[{"node": "Flow Type 분기", "type": "main", "index": 0}]]
    },
    "Flow Type 분기": {
      "main": [
        [{"node": "노드 생성 API", "type": "main", "index": 0}],
        [{"node": "모션 생성 API", "type": "main", "index": 0}]
      ]
    },
    "모션 생성 API": {
      "main": [[{"node": "가치 재계산 트리거", "type": "main", "index": 0}]]
    }
  }
}
```

### 3.2 Stripe 전용 워크플로우

```json
{
  "name": "Stripe → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "stripe-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Stripe Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// Stripe 서명 검증 (선택)\n// const signature = $input.first().json.headers['stripe-signature'];\n// TODO: crypto.timingSafeEqual로 검증\n\nconst event = $json.body;\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: null,\n  event_type: event.type,\n  stripe_id: event.id\n};\n\nswitch(event.type) {\n  case 'payment_intent.succeeded':\n    result.node_id = event.data.object.customer || 'stripe_anon_' + event.data.object.id;\n    result.value = event.data.object.amount / 100;\n    result.flow_type = 'inflow';\n    break;\n\n  case 'payment_intent.payment_failed':\n    // 실패는 무시 또는 로깅만\n    return [];\n\n  case 'charge.refunded':\n    result.node_id = event.data.object.customer || 'stripe_anon_' + event.data.object.payment_intent;\n    result.value = event.data.object.amount_refunded / 100;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'charge.dispute.created':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.amount / 100;\n    result.flow_type = 'outflow';  // 분쟁은 잠재적 outflow\n    break;\n\n  case 'customer.created':\n    result.node_id = event.data.object.id;\n    result.flow_type = 'node_create';\n    break;\n\n  case 'customer.subscription.created':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.items.data[0]?.price?.unit_amount / 100 || 0;\n    result.flow_type = 'recurring_setup';\n    break;\n\n  case 'invoice.paid':\n    result.node_id = event.data.object.customer;\n    result.value = event.data.object.amount_paid / 100;\n    result.flow_type = 'inflow';\n    break;\n\n  default:\n    // 미지원 이벤트 로깅\n    console.log('Unsupported Stripe event:', event.type);\n    return [];\n}\n\nif (!result.node_id) return [];\n\n// Zero Meaning: 고객 이름, 이메일 등 제거\n// ❌ event.data.object.name, email, address 무시\n\nreturn [{ json: result }];"
      },
      "name": "Stripe 이벤트 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MERGE (n:Node {external_id: $node_id})\nON CREATE SET n.value = 0, n.created_at = datetime()\nON MATCH SET n.updated_at = datetime()\nRETURN n.external_id as node_id, n.value as current_value",
        "parameters": {
          "node_id": "={{$json.node_id}}"
        }
      },
      "name": "Neo4j 노드 Upsert",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "notEquals",
              "value2": "node_create"
            }
          ]
        }
      },
      "name": "모션 필요 여부",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MATCH (owner:Node {external_id: 'owner'})\nMATCH (customer:Node {external_id: $customer_id})\nCREATE (source)-[:FLOW {amount: $amount, type: $flow_type, created_at: datetime()}]->(target)\nWITH customer\nSET customer.value = customer.value + $value_change\nRETURN customer.external_id, customer.value",
        "parameters": {
          "customer_id": "={{$json.node_id}}",
          "amount": "={{$json.value}}",
          "flow_type": "={{$json.flow_type}}",
          "value_change": "={{$json.flow_type === 'inflow' ? $json.value : -$json.value}}"
        }
      },
      "name": "Neo4j 모션 + 가치 업데이트",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [1250, 250]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/nodes/external/{{$json.node_id}}/recalculate-synergy",
        "method": "POST"
      },
      "name": "시너지 재계산",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1500, 250]
    }
  ],
  "connections": {
    "Stripe Webhook": {
      "main": [[{"node": "Stripe 이벤트 정제", "type": "main", "index": 0}]]
    },
    "Stripe 이벤트 정제": {
      "main": [[{"node": "Neo4j 노드 Upsert", "type": "main", "index": 0}]]
    },
    "Neo4j 노드 Upsert": {
      "main": [[{"node": "모션 필요 여부", "type": "main", "index": 0}]]
    },
    "모션 필요 여부": {
      "main": [
        [{"node": "Neo4j 모션 + 가치 업데이트", "type": "main", "index": 0}],
        []
      ]
    },
    "Neo4j 모션 + 가치 업데이트": {
      "main": [[{"node": "시너지 재계산", "type": "main", "index": 0}]]
    }
  }
}
```

### 3.3 Shopify 전용 워크플로우

```json
{
  "name": "Shopify → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "shopify-webhook",
        "responseMode": "onReceived",
        "options": {
          "rawBody": true
        }
      },
      "name": "Shopify Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "// Shopify HMAC 검증 (선택)\n// const hmac = $input.first().json.headers['x-shopify-hmac-sha256'];\n// TODO: HMAC 검증 구현\n\nconst topic = $input.first().json.headers['x-shopify-topic'];\nconst payload = $json.body;\n\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: null,\n  event_topic: topic,\n  shopify_id: payload.id\n};\n\nswitch(topic) {\n  case 'orders/create':\n  case 'orders/paid':\n    result.node_id = payload.customer?.id?.toString() || 'shopify_guest_' + payload.id;\n    result.value = parseFloat(payload.total_price) || 0;\n    result.flow_type = 'inflow';\n    break;\n\n  case 'orders/cancelled':\n    result.node_id = payload.customer?.id?.toString() || 'shopify_guest_' + payload.id;\n    result.value = parseFloat(payload.total_price) || 0;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'orders/fulfilled':\n    // 배송 완료 - 가치 확정\n    result.node_id = payload.customer?.id?.toString();\n    result.flow_type = 'fulfilled';\n    break;\n\n  case 'refunds/create':\n    result.node_id = payload.order?.customer?.id?.toString();\n    result.value = payload.transactions?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0;\n    result.flow_type = 'outflow';\n    break;\n\n  case 'customers/create':\n    result.node_id = payload.id?.toString();\n    result.flow_type = 'node_create';\n    break;\n\n  case 'customers/update':\n    // 고객 정보 업데이트는 Zero Meaning상 무시\n    // 이름, 이메일 변경은 가치에 영향 없음\n    return [];\n\n  default:\n    console.log('Unsupported Shopify topic:', topic);\n    return [];\n}\n\nif (!result.node_id) return [];\n\n// Zero Meaning 강제\n// ❌ payload.customer.first_name, last_name, email 무시\n// ❌ payload.shipping_address, billing_address 무시\n// ❌ payload.note, tags 무시\n\nreturn [{ json: result }];"
      },
      "name": "Shopify 이벤트 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MERGE (n:Node {external_id: $node_id, source: 'shopify'})\nON CREATE SET n.value = 0, n.created_at = datetime()\nRETURN n",
        "parameters": {
          "node_id": "={{$json.node_id}}"
        }
      },
      "name": "Neo4j 노드 생성/조회",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [750, 300]
    },
    {
      "parameters": {
        "conditions": {
          "string": [
            {
              "value1": "={{$json.flow_type}}",
              "operation": "isNotEmpty"
            }
          ]
        }
      },
      "name": "유효 이벤트 필터",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "operation": "executeQuery",
        "query": "MATCH (shop:Node {external_id: 'shop_owner'})\nMATCH (customer:Node {external_id: $customer_id})\n\n// 모션 생성\nCREATE (shop)-[:FLOW {\n  amount: $amount,\n  direction: $direction,\n  shopify_order_id: $order_id,\n  created_at: datetime()\n}]->(customer)\n\n// 가치 업데이트\nWITH customer, $value_delta as delta\nSET customer.value = customer.value + delta,\n    customer.last_transaction = datetime()\n\nRETURN customer.external_id as id, customer.value as new_value",
        "parameters": {
          "customer_id": "={{$json.node_id}}",
          "amount": "={{Math.abs($json.value)}}",
          "direction": "={{$json.flow_type}}",
          "order_id": "={{$json.shopify_id}}",
          "value_delta": "={{$json.flow_type === 'inflow' ? $json.value : -$json.value}}"
        }
      },
      "name": "Neo4j 모션 + 가치",
      "type": "n8n-nodes-base.neo4j",
      "typeVersion": 1,
      "position": [1250, 250]
    }
  ],
  "connections": {
    "Shopify Webhook": {
      "main": [[{"node": "Shopify 이벤트 정제", "type": "main", "index": 0}]]
    },
    "Shopify 이벤트 정제": {
      "main": [[{"node": "Neo4j 노드 생성/조회", "type": "main", "index": 0}]]
    },
    "Neo4j 노드 생성/조회": {
      "main": [[{"node": "유효 이벤트 필터", "type": "main", "index": 0}]]
    },
    "유효 이벤트 필터": {
      "main": [
        [{"node": "Neo4j 모션 + 가치", "type": "main", "index": 0}],
        []
      ]
    }
  }
}
```

### 3.4 QuickBooks 연동

```json
{
  "name": "QuickBooks → AUTUS",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "quickbooks-webhook",
        "responseMode": "onReceived"
      },
      "name": "QuickBooks Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300]
    },
    {
      "parameters": {
        "functionCode": "const payload = $json.body;\n\n// QuickBooks 웹훅은 변경 알림만 옴\n// 실제 데이터는 API로 다시 조회 필요\n\nconst events = payload.eventNotifications || [];\nconst results = [];\n\nfor (const event of events) {\n  const entities = event.dataChangeEvent?.entities || [];\n  \n  for (const entity of entities) {\n    const result = {\n      entity_type: entity.name,\n      entity_id: entity.id,\n      operation: entity.operation,  // Create, Update, Delete\n      realm_id: event.realmId,\n      flow_type: null,\n      needs_api_call: true  // 상세 데이터 필요\n    };\n\n    // 엔티티 타입별 분류\n    switch(entity.name) {\n      case 'Payment':\n        result.flow_type = 'inflow';\n        break;\n      case 'SalesReceipt':\n        result.flow_type = 'inflow';\n        break;\n      case 'Invoice':\n        result.flow_type = 'pending_inflow';\n        break;\n      case 'Bill':\n        result.flow_type = 'pending_outflow';\n        break;\n      case 'BillPayment':\n        result.flow_type = 'outflow';\n        break;\n      case 'Vendor':\n      case 'Customer':\n        result.flow_type = 'node_create';\n        break;\n      default:\n        continue;  // 지원하지 않는 엔티티 스킵\n    }\n\n    results.push({ json: result });\n  }\n}\n\nreturn results;"
      },
      "name": "QuickBooks 이벤트 파싱",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [500, 300]
    },
    {
      "parameters": {
        "url": "https://quickbooks.api.intuit.com/v3/company/{{$json.realm_id}}/{{$json.entity_type.toLowerCase()}}/{{$json.entity_id}}",
        "method": "GET",
        "authentication": "oAuth2Api",
        "options": {}
      },
      "name": "QuickBooks API 상세 조회",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [750, 300]
    },
    {
      "parameters": {
        "functionCode": "const entity = $json;\nconst entityType = $input.first().json.entity_type;\n\n// Zero Meaning 정제\nconst result = {\n  node_id: null,\n  value: 0,\n  flow_type: $input.first().json.flow_type\n};\n\nswitch(entityType) {\n  case 'Payment':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'SalesReceipt':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'Invoice':\n    result.node_id = 'qb_cust_' + entity.CustomerRef?.value;\n    result.value = parseFloat(entity.Balance) || 0;  // 미수금\n    break;\n  case 'Bill':\n    result.node_id = 'qb_vendor_' + entity.VendorRef?.value;\n    result.value = parseFloat(entity.Balance) || 0;  // 미지급금\n    break;\n  case 'BillPayment':\n    result.node_id = 'qb_vendor_' + entity.VendorRef?.value;\n    result.value = parseFloat(entity.TotalAmt) || 0;\n    break;\n  case 'Customer':\n    result.node_id = 'qb_cust_' + entity.Id;\n    result.flow_type = 'node_create';\n    break;\n  case 'Vendor':\n    result.node_id = 'qb_vendor_' + entity.Id;\n    result.flow_type = 'node_create';\n    break;\n}\n\n// Zero Meaning 강제\n// ❌ entity.DisplayName, CompanyName, PrimaryEmailAddr 무시\n\nreturn [{ json: result }];"
      },
      "name": "Zero Meaning 정제",
      "type": "n8n-nodes-base.function",
      "typeVersion": 1,
      "position": [1000, 300]
    },
    {
      "parameters": {
        "url": "={{$env.AUTUS_API_URL}}/webhooks/process",
        "method": "POST",
        "body": "={{$json}}",
        "options": {}
      },
      "name": "AUTUS API 전송",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [1250, 300]
    }
  ],
  "connections": {
    "QuickBooks Webhook": {
      "main": [[{"node": "QuickBooks 이벤트 파싱", "type": "main", "index": 0}]]
    },
    "QuickBooks 이벤트 파싱": {
      "main": [[{"node": "QuickBooks API 상세 조회", "type": "main", "index": 0}]]
    },
    "QuickBooks API 상세 조회": {
      "main": [[{"node": "Zero Meaning 정제", "type": "main", "index": 0}]]
    },
    "Zero Meaning 정제": {
      "main": [[{"node": "AUTUS API 전송", "type": "main", "index": 0}]]
    }
  }
}
```

---

## 4. Zero Meaning 정제 규칙

### 4.1 필드 매핑 규칙

```javascript
// Zero Meaning 매퍼 모듈

const ZeroMeaningMapper = {
  
  // ═══════════════════════════════════════════════════════════
  // 허용 필드 (숫자 데이터만)
  // ═══════════════════════════════════════════════════════════
  
  ALLOWED_FIELDS: {
    // ID 계열
    'id': 'node_id',
    'customer_id': 'node_id',
    'user_id': 'node_id',
    'vendor_id': 'node_id',
    'account_id': 'node_id',
    
    // 금액 계열
    'amount': 'value',
    'total': 'value',
    'total_price': 'value',
    'total_amount': 'value',
    'revenue': 'value',
    'price': 'value',
    'balance': 'value',
    
    // 시간 계열
    'created_at': 'timestamp',
    'updated_at': 'timestamp',
    'occurred_at': 'timestamp'
  },
  
  // ═══════════════════════════════════════════════════════════
  // 금지 필드 (의미 데이터)
  // ═══════════════════════════════════════════════════════════
  
  FORBIDDEN_FIELDS: [
    // 신원
    'name', 'first_name', 'last_name', 'full_name',
    'email', 'phone', 'address', 'city', 'country',
    
    // 설명
    'description', 'note', 'notes', 'memo', 'comment',
    'title', 'subject', 'message',
    
    // 분류
    'type', 'category', 'tag', 'tags', 'label',
    'status', 'state', 'stage',
    
    // 기타 의미
    'company', 'organization', 'department',
    'product_name', 'item_name', 'sku'
  ],
  
  // ═══════════════════════════════════════════════════════════
  // 정제 함수
  // ═══════════════════════════════════════════════════════════
  
  cleanse(rawData) {
    const cleaned = {};
    
    for (const [key, value] of Object.entries(rawData)) {
      const lowerKey = key.toLowerCase();
      
      // 금지 필드 스킵
      if (this.FORBIDDEN_FIELDS.includes(lowerKey)) {
        continue;
      }
      
      // 허용 필드 매핑
      if (this.ALLOWED_FIELDS[lowerKey]) {
        const mappedKey = this.ALLOWED_FIELDS[lowerKey];
        cleaned[mappedKey] = this.normalizeValue(value, mappedKey);
        continue;
      }
      
      // 숫자 값만 허용
      if (typeof value === 'number') {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  },
  
  normalizeValue(value, type) {
    switch(type) {
      case 'node_id':
        return String(value);
      case 'value':
        return parseFloat(value) || 0;
      case 'timestamp':
        return new Date(value).toISOString();
      default:
        return value;
    }
  }
};

module.exports = ZeroMeaningMapper;
```

### 4.2 SaaS별 정제 예시

```javascript
// 정제 전 (Stripe)
{
  "id": "pi_1234567890",
  "customer": "cus_abc123",
  "amount": 5000,
  "currency": "usd",
  "customer_email": "john@example.com",      // ❌ 제거
  "customer_name": "John Doe",               // ❌ 제거
  "description": "Monthly subscription",      // ❌ 제거
  "shipping": {                               // ❌ 제거
    "address": { "city": "Seoul", ... }
  }
}

// 정제 후 (Zero Meaning)
{
  "node_id": "cus_abc123",
  "value": 50.00,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

```javascript
// 정제 전 (Shopify)
{
  "id": 123456789,
  "customer": {
    "id": 987654321,
    "first_name": "Jane",                    // ❌ 제거
    "last_name": "Smith",                    // ❌ 제거
    "email": "jane@shop.com"                 // ❌ 제거
  },
  "total_price": "150000.00",
  "line_items": [                            // ❌ 제거 (상품명 포함)
    { "name": "Blue T-Shirt", ... }
  ],
  "shipping_address": { ... },               // ❌ 제거
  "note": "Please gift wrap"                 // ❌ 제거
}

// 정제 후 (Zero Meaning)
{
  "node_id": "987654321",
  "value": 150000.00,
  "timestamp": "2025-01-01T12:00:00Z"
}
```

---

## 5. Neo4j 통합

### 5.1 그래프 스키마

```cypher
// ═══════════════════════════════════════════════════════════
// 노드 타입
// ═══════════════════════════════════════════════════════════

// Owner 노드 (상점/사업자 - 고정)
CREATE (owner:Node:Owner {
  external_id: 'owner',
  value: 0,
  created_at: datetime()
})

// Customer/Vendor 노드 (동적 생성)
CREATE (n:Node {
  external_id: $external_id,    // SaaS 고유 ID
  source: $source,              // 'stripe', 'shopify', 'quickbooks'
  value: 0,
  created_at: datetime(),
  updated_at: datetime()
})

// ═══════════════════════════════════════════════════════════
// 관계 타입
// ═══════════════════════════════════════════════════════════

// 돈 흐름 (Motion)
CREATE (a)-[:FLOW {
  amount: $amount,
  direction: $direction,        // 'inflow', 'outflow'
  source_event: $event_type,    // 'payment', 'refund', 'order'
  external_ref: $external_id,   // SaaS 트랜잭션 ID
  created_at: datetime()
}]->(b)

// ═══════════════════════════════════════════════════════════
// 인덱스
// ═══════════════════════════════════════════════════════════

CREATE INDEX node_external_id IF NOT EXISTS
FOR (n:Node) ON (n.external_id);

CREATE INDEX node_source IF NOT EXISTS
FOR (n:Node) ON (n.source);

CREATE INDEX node_value IF NOT EXISTS
FOR (n:Node) ON (n.value);
```

### 5.2 Cypher 쿼리 모음

```cypher
// ═══════════════════════════════════════════════════════════
// 노드 Upsert
// ═══════════════════════════════════════════════════════════

// 외부 ID로 노드 생성 또는 업데이트
MERGE (n:Node {external_id: $external_id})
ON CREATE SET 
  n.value = 0,
  n.source = $source,
  n.created_at = datetime()
ON MATCH SET 
  n.updated_at = datetime()
RETURN n;

// ═══════════════════════════════════════════════════════════
// 모션(돈 흐름) 생성
// ═══════════════════════════════════════════════════════════

// Inflow: 고객 → Owner
MATCH (customer:Node {external_id: $customer_id})
MATCH (owner:Node {external_id: 'owner'})
CREATE (customer)-[:FLOW {
  amount: $amount,
  direction: 'inflow',
  created_at: datetime()
}]->(owner)
WITH customer
SET customer.value = customer.value + $amount
RETURN customer;

// Outflow: Owner → 고객
MATCH (customer:Node {external_id: $customer_id})
MATCH (owner:Node {external_id: 'owner'})
CREATE (owner)-[:FLOW {
  amount: $amount,
  direction: 'outflow',
  created_at: datetime()
}]->(customer)
WITH customer
SET customer.value = customer.value - $amount
RETURN customer;

// ═══════════════════════════════════════════════════════════
// 가치 계산
// ═══════════════════════════════════════════════════════════

// 노드 가치 = 총 inflow - 총 outflow
MATCH (n:Node {external_id: $node_id})
OPTIONAL MATCH (n)-[inflow:FLOW {direction: 'inflow'}]->()
OPTIONAL MATCH ()-[outflow:FLOW {direction: 'outflow'}]->(n)
WITH n, 
     COALESCE(SUM(inflow.amount), 0) as total_in,
     COALESCE(SUM(outflow.amount), 0) as total_out
SET n.value = total_in - total_out,
    n.calculated_at = datetime()
RETURN n.external_id, n.value;

// ═══════════════════════════════════════════════════════════
// 시너지 계산
// ═══════════════════════════════════════════════════════════

// 연결된 노드 가치 합계의 10%
MATCH (n:Node {external_id: $node_id})-[:FLOW*1..2]-(connected:Node)
WHERE n <> connected
WITH n, SUM(DISTINCT connected.value) * 0.1 as synergy
SET n.synergy = synergy
RETURN n.external_id, n.value, n.synergy;

// ═══════════════════════════════════════════════════════════
// 조회 쿼리
// ═══════════════════════════════════════════════════════════

// 전체 노드 목록 (Physics Map용)
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id,
       n.value as value,
       n.source as source,
       n.created_at as created
ORDER BY n.value DESC
LIMIT 10000;

// 전체 모션 목록
MATCH (a:Node)-[f:FLOW]->(b:Node)
RETURN a.external_id as source,
       b.external_id as target,
       f.amount as amount,
       f.direction as direction,
       f.created_at as timestamp
ORDER BY f.created_at DESC
LIMIT 50000;

// 상위 가치 고객
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value
ORDER BY n.value DESC
LIMIT 100;
```

---

## 6. 실시간 동기화

### 6.1 Polling 방식 (기본)

```javascript
// frontend/src/hooks/useRealtimeData.ts

import { useState, useEffect, useCallback } from 'react';

interface RealtimeConfig {
  apiUrl: string;
  pollingInterval?: number;  // ms
}

export function useRealtimeData(config: RealtimeConfig) {
  const { apiUrl, pollingInterval = 5000 } = config;
  
  const [nodes, setNodes] = useState([]);
  const [motions, setMotions] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const fetchData = useCallback(async () => {
    try {
      // 병렬 fetch
      const [nodesRes, motionsRes] = await Promise.all([
        fetch(`${apiUrl}/nodes?limit=10000`),
        fetch(`${apiUrl}/motions?limit=50000`)
      ]);
      
      if (!nodesRes.ok || !motionsRes.ok) {
        throw new Error('API 호출 실패');
      }
      
      const [nodesData, motionsData] = await Promise.all([
        nodesRes.json(),
        motionsRes.json()
      ]);
      
      setNodes(nodesData);
      setMotions(motionsData);
      setLastUpdate(new Date());
      setError(null);
      
    } catch (err) {
      setError(err.message);
      console.error('데이터 fetch 실패:', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl]);
  
  // 초기 로드 + 폴링
  useEffect(() => {
    fetchData();
    
    const interval = setInterval(fetchData, pollingInterval);
    
    return () => clearInterval(interval);
  }, [fetchData, pollingInterval]);
  
  // 수동 새로고침
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchData();
  }, [fetchData]);
  
  return {
    nodes,
    motions,
    lastUpdate,
    isLoading,
    error,
    refresh
  };
}

// 사용 예시
function PhysicsMap() {
  const { nodes, motions, lastUpdate, refresh } = useRealtimeData({
    apiUrl: process.env.REACT_APP_API_URL,
    pollingInterval: 5000
  });
  
  useEffect(() => {
    if (cosmograph && nodes.length > 0) {
      cosmograph.setData({
        nodes: nodes.map(n => ({
          id: n.external_id,
          value: n.value
        })),
        links: motions.map(m => ({
          source: m.source,
          target: m.target,
          value: m.amount
        }))
      });
    }
  }, [nodes, motions]);
  
  return (
    <div>
      <div>마지막 업데이트: {lastUpdate?.toLocaleTimeString()}</div>
      <button onClick={refresh}>새로고침</button>
      <CosmographCanvas />
    </div>
  );
}
```

### 6.2 WebSocket 방식 (고급)

```python
# backend/websocket_manager.py

from fastapi import WebSocket
from typing import Dict, Set
import asyncio
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            'all': set(),
            'nodes': set(),
            'motions': set()
        }
    
    async def connect(self, websocket: WebSocket, channel: str = 'all'):
        await websocket.accept()
        self.active_connections[channel].add(websocket)
        self.active_connections['all'].add(websocket)
    
    def disconnect(self, websocket: WebSocket):
        for channel in self.active_connections.values():
            channel.discard(websocket)
    
    async def broadcast(self, message: dict, channel: str = 'all'):
        """특정 채널 구독자에게 브로드캐스트"""
        connections = self.active_connections.get(channel, set())
        
        dead_connections = set()
        for connection in connections:
            try:
                await connection.send_json(message)
            except:
                dead_connections.add(connection)
        
        # 죽은 연결 정리
        for dead in dead_connections:
            self.disconnect(dead)
    
    async def broadcast_node_update(self, node_id: str, value: float):
        await self.broadcast({
            'type': 'NODE_UPDATE',
            'data': {
                'node_id': node_id,
                'value': value,
                'timestamp': datetime.now().isoformat()
            }
        }, channel='nodes')
    
    async def broadcast_motion_created(self, motion: dict):
        await self.broadcast({
            'type': 'MOTION_CREATED',
            'data': motion
        }, channel='motions')

manager = ConnectionManager()

# FastAPI WebSocket 엔드포인트
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str = 'all'):
    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            # 클라이언트 메시지 처리 (ping/pong 등)
            if data == 'ping':
                await websocket.send_text('pong')
    except:
        manager.disconnect(websocket)
```

```typescript
// frontend/src/hooks/useWebSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';

interface WSMessage {
  type: string;
  data: any;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket 연결됨');
      };
      
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setLastMessage(message);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        // 자동 재연결
        reconnectTimeout.current = setTimeout(connect, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket 에러:', error);
        ws.close();
      };
      
      wsRef.current = ws;
      
    } catch (error) {
      console.error('WebSocket 연결 실패:', error);
    }
  }, [url]);
  
  useEffect(() => {
    connect();
    
    return () => {
      clearTimeout(reconnectTimeout.current);
      wsRef.current?.close();
    };
  }, [connect]);
  
  // Heartbeat (연결 유지)
  useEffect(() => {
    if (!isConnected) return;
    
    const heartbeat = setInterval(() => {
      wsRef.current?.send('ping');
    }, 30000);
    
    return () => clearInterval(heartbeat);
  }, [isConnected]);
  
  return {
    isConnected,
    lastMessage,
    send: (data: any) => wsRef.current?.send(JSON.stringify(data))
  };
}
```

---

## 7. 에러 처리

### 7.1 n8n 에러 핸들링

```json
{
  "name": "에러 처리 워크플로우",
  "nodes": [
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{$json.error !== undefined}}",
              "value2": true
            }
          ]
        }
      },
      "name": "에러 체크",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1
    },
    {
      "parameters": {
        "functionCode": "// 에러 로깅\nconst error = $json.error;\nconst context = {\n  workflow: $workflow.name,\n  node: $node.name,\n  timestamp: new Date().toISOString(),\n  input: $json\n};\n\nconsole.error('AUTUS Webhook Error:', { error, context });\n\nreturn [{\n  json: {\n    error_type: error.type || 'unknown',\n    error_message: error.message || String(error),\n    context\n  }\n}];"
      },
      "name": "에러 로깅",
      "type": "n8n-nodes-base.function"
    },
    {
      "parameters": {
        "url": "={{$env.SLACK_WEBHOOK_URL}}",
        "method": "POST",
        "body": {
          "text": "🚨 AUTUS Webhook 에러\n```{{JSON.stringify($json, null, 2)}}```"
        }
      },
      "name": "Slack 알림",
      "type": "n8n-nodes-base.httpRequest"
    },
    {
      "parameters": {
        "tableName": "webhook_errors",
        "columns": "error_type,error_message,context,created_at"
      },
      "name": "에러 DB 저장",
      "type": "n8n-nodes-base.postgres"
    }
  ]
}
```

### 7.2 재시도 로직

```javascript
// 재시도 래퍼
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.log(`시도 ${attempt}/${maxRetries} 실패:`, error.message);
      
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay * attempt));
      }
    }
  }
  
  throw lastError;
}

// 사용 예시
const result = await withRetry(
  () => fetch('/api/nodes', { method: 'POST', body: JSON.stringify(data) }),
  3,
  2000
);
```

---

## 8. 배포 설정

### 8.1 n8n Docker 설정

```yaml
# docker-compose.n8n.yml

version: '3.8'

services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=0.0.0.0
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://your-domain.com/
      - GENERIC_TIMEZONE=Asia/Seoul
      
      # 보안
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      
      # 데이터베이스
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${DB_PASSWORD}
      
      # 실행 설정
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168  # 7일
      
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - postgres
    networks:
      - autus-network

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=n8n
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=n8n
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - autus-network

volumes:
  n8n_data:
  postgres_data:

networks:
  autus-network:
    external: true
```

### 8.2 환경 변수

```env
# .env.n8n

# n8n
N8N_PASSWORD=secure_password_here
N8N_ENCRYPTION_KEY=random_32_char_string

# Database
DB_PASSWORD=postgres_password

# AUTUS API
AUTUS_API_URL=https://api.autus.io
AUTUS_API_KEY=your_api_key

# Neo4j
NEO4J_URI=bolt://neo4j:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j_password

# Slack (에러 알림)
SLACK_WEBHOOK_URL=https://hooks.slack.com/...

# SaaS Credentials
STRIPE_WEBHOOK_SECRET=whsec_...
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
```

### 8.3 Webhook URL 설정

```
각 SaaS에 등록할 Webhook URL:

Stripe:
  https://your-n8n-domain.com/webhook/stripe-webhook

Shopify:
  https://your-n8n-domain.com/webhook/shopify-webhook

QuickBooks:
  https://your-n8n-domain.com/webhook/quickbooks-webhook

범용:
  https://your-n8n-domain.com/webhook/universal-webhook
```

---

## 📊 통합 요약

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  AUTUS SaaS 연동 시스템                                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  지원 SaaS: 15+ (Stripe, Shopify, QuickBooks, ...)        │
│  n8n 워크플로우: 5개 (범용 + 전용)                         │
│  Zero Meaning 자동 정제                                     │
│  Neo4j 실시간 동기화                                        │
│  Polling (5초) 또는 WebSocket                              │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  데이터 흐름:                                               │
│  SaaS → Webhook → n8n → Zero Meaning → Neo4j → UI         │
│                                                             │
│  처리 지연: < 1초 (Webhook 수신 → DB 저장)                 │
│  UI 반영: 5초 (Polling) 또는 100ms (WebSocket)             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*AUTUS SaaS 연동 시스템 스펙 © 2025*









