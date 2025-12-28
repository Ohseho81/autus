-- AUTUS Database Initialization
-- ==============================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Nodes Table
CREATE TABLE IF NOT EXISTS nodes (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    revenue FLOAT DEFAULT 0.0,
    time_spent FLOAT DEFAULT 0.0,
    x FLOAT DEFAULT 0.0,
    y FLOAT DEFAULT 0.0,
    z FLOAT DEFAULT 0.0,
    fitness FLOAT DEFAULT 0.5,
    density FLOAT DEFAULT 0.5,
    frequency FLOAT DEFAULT 0.5,
    penalty FLOAT DEFAULT 0.0,
    cluster VARCHAR(50) DEFAULT 'STABLE',
    orbit VARCHAR(50) DEFAULT 'SAFETY',
    tags JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Entanglements Table
CREATE TABLE IF NOT EXISTS entanglements (
    id SERIAL PRIMARY KEY,
    node_a VARCHAR(100) NOT NULL,
    node_b VARCHAR(100) NOT NULL,
    intensity FLOAT DEFAULT 0.5,
    correlation FLOAT DEFAULT 0.8,
    entanglement_type VARCHAR(50) DEFAULT 'synergy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(node_a, node_b)
);

-- Action Logs Table
CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    action_id VARCHAR(100) NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    params JSONB DEFAULT '{}'::jsonb,
    result JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    executed_at TIMESTAMP
);

-- System States Table
CREATE TABLE IF NOT EXISTS system_states (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_nodes INTEGER,
    total_value FLOAT,
    entropy FLOAT,
    money_efficiency FLOAT,
    cluster_distribution JSONB,
    orbit_distribution JSONB,
    quantum_stats JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nodes_cluster ON nodes(cluster);
CREATE INDEX IF NOT EXISTS idx_nodes_orbit ON nodes(orbit);
CREATE INDEX IF NOT EXISTS idx_nodes_created ON nodes(created_at);
CREATE INDEX IF NOT EXISTS idx_entanglements_nodes ON entanglements(node_a, node_b);
CREATE INDEX IF NOT EXISTS idx_action_logs_status ON action_logs(status);
CREATE INDEX IF NOT EXISTS idx_system_states_timestamp ON system_states(timestamp);

-- Update Trigger
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_nodes_modtime ON nodes;
CREATE TRIGGER update_nodes_modtime
    BEFORE UPDATE ON nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Initial Data (Optional)
-- INSERT INTO nodes (id, name, revenue, fitness) VALUES ('demo_001', 'Demo User', 100000, 0.8);

