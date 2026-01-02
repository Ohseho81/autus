-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;











-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTUS REALTIME - DATABASE INITIALIZATION
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create n8n database for n8n service
CREATE DATABASE n8n;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE n8n TO autus;

-- Switch to autus database
\c autus;

-- ═══════════════════════════════════════════════════════════════════════════════
-- NODES TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nodes (
    id SERIAL PRIMARY KEY,
    person_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    lat DECIMAL(10, 6),
    lng DECIMAL(10, 6),
    money_label DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- MONEY EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS money_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'income',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- BURN EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS burn_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    person_id VARCHAR(50) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    burn_type VARCHAR(50) DEFAULT 'expense',
    tags TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES nodes(person_id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUTOMATIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS automations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    automation_type VARCHAR(50) NOT NULL,
    n8n_workflow_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    value DECIMAL(15, 2) DEFAULT 0,
    synergy_rate DECIMAL(5, 4) DEFAULT 0.20,
    variables JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- FEEDBACK TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    automation_id INTEGER NOT NULL,
    rating INTEGER NOT NULL CHECK (rating IN (-1, 1)),
    comment TEXT,
    synergy_adjustment DECIMAL(5, 4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (automation_id) REFERENCES automations(id)
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE INDEX idx_money_events_person ON money_events(person_id);
CREATE INDEX idx_money_events_created ON money_events(created_at);
CREATE INDEX idx_burn_events_person ON burn_events(person_id);
CREATE INDEX idx_burn_events_created ON burn_events(created_at);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_feedback_automation ON feedback(automation_id);
CREATE INDEX idx_audit_log_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO nodes (person_id, name, lat, lng, money_label) VALUES
    ('P01', '오세호', 37.5415, 127.0155, 56000000),
    ('P02', '김경희', 37.5416, 127.0156, 25000000),
    ('P03', '오선우', 37.5414, 127.0154, 23000000),
    ('P04', '오연우', 37.5417, 127.0157, 11000000),
    ('P05', '오은우', 37.5413, 127.0153, 7000000)
ON CONFLICT (person_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ AUTUS Database initialized successfully!';
END $$;
















