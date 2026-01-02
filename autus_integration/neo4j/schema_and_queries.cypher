// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Neo4j 스키마 및 쿼리
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. 인덱스 생성
// ─────────────────────────────────────────────────────────────────────────────

// 노드 external_id 인덱스 (필수)
CREATE INDEX node_external_id IF NOT EXISTS
FOR (n:Node) ON (n.external_id);

// 노드 source 인덱스
CREATE INDEX node_source IF NOT EXISTS
FOR (n:Node) ON (n.source);

// 노드 value 인덱스 (정렬/필터용)
CREATE INDEX node_value IF NOT EXISTS
FOR (n:Node) ON (n.value);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Owner 노드 생성 (시스템 노드)
// ─────────────────────────────────────────────────────────────────────────────

// Owner 노드 생성 (모든 inflow의 target)
MERGE (owner:Node:Owner {external_id: 'owner'})
ON CREATE SET
    owner.source = 'system',
    owner.value = 0,
    owner.direct_money = 0,
    owner.synergy = 0,
    owner.created_at = datetime()
RETURN owner;

// ─────────────────────────────────────────────────────────────────────────────
// 3. 노드 CRUD 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드 Upsert (생성 또는 업데이트)
// Parameters: $external_id, $source
MERGE (n:Node {external_id: $external_id})
ON CREATE SET 
    n.source = $source,
    n.value = 0,
    n.direct_money = 0,
    n.synergy = 0,
    n.created_at = datetime()
ON MATCH SET 
    n.updated_at = datetime()
RETURN n.external_id as id, n.value as value, n.source as source;

// 전체 노드 조회 (Physics Map용)
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN 
    n.external_id as id, 
    n.value as value, 
    n.source as source,
    n.direct_money as direct_money,
    n.synergy as synergy
ORDER BY n.value DESC
LIMIT 10000;

// 가치 ≤ 0 노드 조회 (삭제 대상)
MATCH (n:Node)
WHERE n.value <= 0 AND n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value, n.source as source
ORDER BY n.value ASC;

// 상위 시너지 노드 조회
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value, n.synergy as synergy
ORDER BY n.synergy DESC
LIMIT 10;

// ─────────────────────────────────────────────────────────────────────────────
// 4. 모션(돈 흐름) 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// Inflow 모션 생성 (고객 → Owner)
// Parameters: $source_id, $target_id, $amount, $fee
MATCH (source:Node {external_id: $source_id})
MATCH (target:Node {external_id: $target_id})
CREATE (source)-[f:FLOW {
    amount: $amount,
    direction: 'inflow',
    fee: $fee,
    created_at: datetime()
}]->(target)
WITH source, target, f
SET source.direct_money = source.direct_money,
    target.direct_money = target.direct_money + $amount
RETURN f.amount as amount, f.direction as direction;

// Outflow 모션 생성 (Owner → 고객)
// Parameters: $source_id, $target_id, $amount, $fee
MATCH (source:Node {external_id: $source_id})
MATCH (target:Node {external_id: $target_id})
CREATE (source)-[f:FLOW {
    amount: $amount,
    direction: 'outflow',
    fee: $fee,
    created_at: datetime()
}]->(target)
WITH source, target, f
SET source.direct_money = source.direct_money - $amount
RETURN f.amount as amount, f.direction as direction;

// 전체 모션 조회 (Physics Map 화살표용)
MATCH (source:Node)-[f:FLOW]->(target:Node)
RETURN 
    source.external_id as source,
    target.external_id as target,
    f.amount as amount,
    f.direction as direction,
    f.fee as fee
ORDER BY f.created_at DESC
LIMIT 50000;

// ─────────────────────────────────────────────────────────────────────────────
// 5. 가치 계산 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드 가치 재계산
// V = direct_money + synergy
// synergy = 연결된 노드 가치 합계의 10%
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
WHERE connected.external_id <> 'owner' AND connected <> n
WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
SET n.synergy = synergy,
    n.value = n.direct_money + synergy
RETURN n.external_id as id, n.value as value, n.direct_money as direct_money, n.synergy as synergy;

// 전체 노드 가치 일괄 재계산
MATCH (n:Node)
WHERE n.external_id <> 'owner'
OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
WHERE connected.external_id <> 'owner' AND connected <> n
WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
SET n.synergy = synergy,
    n.value = n.direct_money + synergy
RETURN count(n) as updated_count;

// ─────────────────────────────────────────────────────────────────────────────
// 6. 분석 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드별 연결 관계 조회
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})-[f:FLOW]-(connected:Node)
RETURN 
    connected.external_id as connected_id,
    connected.value as connected_value,
    f.amount as flow_amount,
    f.direction as direction;

// 총 통계 조회
MATCH (n:Node)
WHERE n.external_id <> 'owner'
OPTIONAL MATCH (n)-[f:FLOW]->()
WITH count(DISTINCT n) as total_nodes,
     sum(n.value) as total_value,
     sum(n.synergy) as total_synergy,
     count(f) as total_motions
RETURN total_nodes, total_value, total_synergy, total_motions;

// 소스별 통계
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.source as source, count(n) as count, sum(n.value) as total_value
ORDER BY total_value DESC;

// 반복 모션 패턴 분석 (자동화 대상)
MATCH (source:Node)-[f:FLOW]->(target:Node)
WITH source.external_id as src, target.external_id as tgt, count(f) as flow_count, sum(f.amount) as total_amount
WHERE flow_count >= 3
RETURN src, tgt, flow_count, total_amount
ORDER BY flow_count DESC;

// ─────────────────────────────────────────────────────────────────────────────
// 7. 정리 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 가치 ≤ 0 노드 삭제 (CUT)
// 주의: 실제 삭제 전 백업 권장
MATCH (n:Node)
WHERE n.value <= 0 AND n.external_id <> 'owner'
DETACH DELETE n
RETURN count(n) as deleted_count;

// 특정 노드 삭제
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
WHERE n.external_id <> 'owner'
DETACH DELETE n
RETURN 'deleted' as status;

// ─────────────────────────────────────────────────────────────────────────────
// 8. 복리 예측 쿼리 (12개월)
// ─────────────────────────────────────────────────────────────────────────────

// 노드별 12개월 복리 예측
// 공식: Future V = V × (1 + synergy_rate)^months
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
WITH n, 
     CASE WHEN n.direct_money > 0 THEN n.synergy / n.direct_money ELSE 0.1 END as synergy_rate
UNWIND range(1, 12) as month
RETURN 
    n.external_id as id,
    month,
    n.value * (1 + synergy_rate) ^ month as projected_value;



// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Neo4j 스키마 및 쿼리
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1. 인덱스 생성
// ─────────────────────────────────────────────────────────────────────────────

// 노드 external_id 인덱스 (필수)
CREATE INDEX node_external_id IF NOT EXISTS
FOR (n:Node) ON (n.external_id);

// 노드 source 인덱스
CREATE INDEX node_source IF NOT EXISTS
FOR (n:Node) ON (n.source);

// 노드 value 인덱스 (정렬/필터용)
CREATE INDEX node_value IF NOT EXISTS
FOR (n:Node) ON (n.value);

// ─────────────────────────────────────────────────────────────────────────────
// 2. Owner 노드 생성 (시스템 노드)
// ─────────────────────────────────────────────────────────────────────────────

// Owner 노드 생성 (모든 inflow의 target)
MERGE (owner:Node:Owner {external_id: 'owner'})
ON CREATE SET
    owner.source = 'system',
    owner.value = 0,
    owner.direct_money = 0,
    owner.synergy = 0,
    owner.created_at = datetime()
RETURN owner;

// ─────────────────────────────────────────────────────────────────────────────
// 3. 노드 CRUD 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드 Upsert (생성 또는 업데이트)
// Parameters: $external_id, $source
MERGE (n:Node {external_id: $external_id})
ON CREATE SET 
    n.source = $source,
    n.value = 0,
    n.direct_money = 0,
    n.synergy = 0,
    n.created_at = datetime()
ON MATCH SET 
    n.updated_at = datetime()
RETURN n.external_id as id, n.value as value, n.source as source;

// 전체 노드 조회 (Physics Map용)
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN 
    n.external_id as id, 
    n.value as value, 
    n.source as source,
    n.direct_money as direct_money,
    n.synergy as synergy
ORDER BY n.value DESC
LIMIT 10000;

// 가치 ≤ 0 노드 조회 (삭제 대상)
MATCH (n:Node)
WHERE n.value <= 0 AND n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value, n.source as source
ORDER BY n.value ASC;

// 상위 시너지 노드 조회
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.external_id as id, n.value as value, n.synergy as synergy
ORDER BY n.synergy DESC
LIMIT 10;

// ─────────────────────────────────────────────────────────────────────────────
// 4. 모션(돈 흐름) 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// Inflow 모션 생성 (고객 → Owner)
// Parameters: $source_id, $target_id, $amount, $fee
MATCH (source:Node {external_id: $source_id})
MATCH (target:Node {external_id: $target_id})
CREATE (source)-[f:FLOW {
    amount: $amount,
    direction: 'inflow',
    fee: $fee,
    created_at: datetime()
}]->(target)
WITH source, target, f
SET source.direct_money = source.direct_money,
    target.direct_money = target.direct_money + $amount
RETURN f.amount as amount, f.direction as direction;

// Outflow 모션 생성 (Owner → 고객)
// Parameters: $source_id, $target_id, $amount, $fee
MATCH (source:Node {external_id: $source_id})
MATCH (target:Node {external_id: $target_id})
CREATE (source)-[f:FLOW {
    amount: $amount,
    direction: 'outflow',
    fee: $fee,
    created_at: datetime()
}]->(target)
WITH source, target, f
SET source.direct_money = source.direct_money - $amount
RETURN f.amount as amount, f.direction as direction;

// 전체 모션 조회 (Physics Map 화살표용)
MATCH (source:Node)-[f:FLOW]->(target:Node)
RETURN 
    source.external_id as source,
    target.external_id as target,
    f.amount as amount,
    f.direction as direction,
    f.fee as fee
ORDER BY f.created_at DESC
LIMIT 50000;

// ─────────────────────────────────────────────────────────────────────────────
// 5. 가치 계산 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드 가치 재계산
// V = direct_money + synergy
// synergy = 연결된 노드 가치 합계의 10%
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
WHERE connected.external_id <> 'owner' AND connected <> n
WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
SET n.synergy = synergy,
    n.value = n.direct_money + synergy
RETURN n.external_id as id, n.value as value, n.direct_money as direct_money, n.synergy as synergy;

// 전체 노드 가치 일괄 재계산
MATCH (n:Node)
WHERE n.external_id <> 'owner'
OPTIONAL MATCH (n)-[:FLOW]-(connected:Node)
WHERE connected.external_id <> 'owner' AND connected <> n
WITH n, COALESCE(SUM(DISTINCT connected.direct_money) * 0.1, 0) as synergy
SET n.synergy = synergy,
    n.value = n.direct_money + synergy
RETURN count(n) as updated_count;

// ─────────────────────────────────────────────────────────────────────────────
// 6. 분석 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 노드별 연결 관계 조회
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})-[f:FLOW]-(connected:Node)
RETURN 
    connected.external_id as connected_id,
    connected.value as connected_value,
    f.amount as flow_amount,
    f.direction as direction;

// 총 통계 조회
MATCH (n:Node)
WHERE n.external_id <> 'owner'
OPTIONAL MATCH (n)-[f:FLOW]->()
WITH count(DISTINCT n) as total_nodes,
     sum(n.value) as total_value,
     sum(n.synergy) as total_synergy,
     count(f) as total_motions
RETURN total_nodes, total_value, total_synergy, total_motions;

// 소스별 통계
MATCH (n:Node)
WHERE n.external_id <> 'owner'
RETURN n.source as source, count(n) as count, sum(n.value) as total_value
ORDER BY total_value DESC;

// 반복 모션 패턴 분석 (자동화 대상)
MATCH (source:Node)-[f:FLOW]->(target:Node)
WITH source.external_id as src, target.external_id as tgt, count(f) as flow_count, sum(f.amount) as total_amount
WHERE flow_count >= 3
RETURN src, tgt, flow_count, total_amount
ORDER BY flow_count DESC;

// ─────────────────────────────────────────────────────────────────────────────
// 7. 정리 쿼리
// ─────────────────────────────────────────────────────────────────────────────

// 가치 ≤ 0 노드 삭제 (CUT)
// 주의: 실제 삭제 전 백업 권장
MATCH (n:Node)
WHERE n.value <= 0 AND n.external_id <> 'owner'
DETACH DELETE n
RETURN count(n) as deleted_count;

// 특정 노드 삭제
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
WHERE n.external_id <> 'owner'
DETACH DELETE n
RETURN 'deleted' as status;

// ─────────────────────────────────────────────────────────────────────────────
// 8. 복리 예측 쿼리 (12개월)
// ─────────────────────────────────────────────────────────────────────────────

// 노드별 12개월 복리 예측
// 공식: Future V = V × (1 + synergy_rate)^months
// Parameters: $external_id
MATCH (n:Node {external_id: $external_id})
WITH n, 
     CASE WHEN n.direct_money > 0 THEN n.synergy / n.direct_money ELSE 0.1 END as synergy_rate
UNWIND range(1, 12) as month
RETURN 
    n.external_id as id,
    month,
    n.value * (1 + synergy_rate) ^ month as projected_value;








