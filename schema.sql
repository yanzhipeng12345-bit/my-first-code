-- Iron Tracker Database Schema (v4.5.1)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    weight_kg DECIMAL(5, 2),
    height_cm INTEGER,
    age INTEGER,
    gender VARCHAR(10),
    body_fat_percentage DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    total_duration_minutes INTEGER,
    gross_calories DECIMAL(8, 2),
    net_calories DECIMAL(8, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_date)
);

CREATE TABLE IF NOT EXISTS actions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,  -- 'strength', 'cardio', 'mobility'
    body_part VARCHAR(100),
    exercise_name VARCHAR(255),
    sets INTEGER,
    reps INTEGER,
    weight_kg DECIMAL(8, 2),
    duration_minutes INTEGER,
    cardio_type VARCHAR(50),  -- 'low', 'medium', 'high'
    distance_km DECIMAL(8, 2),
    rpe VARCHAR(20),  -- 'easy', 'medium', 'hard'
    calories_burned DECIMAL(8, 2),
    action_timestamp BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS edits (
    id SERIAL PRIMARY KEY,
    action_id INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
    edit_type VARCHAR(50),  -- 'post_edit', 'correction', 'deletion'
    reason TEXT,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    total_workouts INTEGER DEFAULT 0,
    total_calories DECIMAL(12, 2) DEFAULT 0,
    avg_session_duration DECIMAL(8, 2) DEFAULT 0,
    last_workout_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_date ON sessions(user_id, session_date);
CREATE INDEX idx_actions_session ON actions(session_id);
CREATE INDEX idx_edits_action ON edits(action_id);
CREATE INDEX idx_users_email ON users(email);

-- Sample data (deidentified)
INSERT INTO users (username, email, weight_kg, height_cm, age, gender)
VALUES 
    ('user_001', 'user001@example.com', 75, 180, 25, 'male'),
    ('user_002', 'user002@example.com', 65, 165, 28, 'female')
ON CONFLICT DO NOTHING;
