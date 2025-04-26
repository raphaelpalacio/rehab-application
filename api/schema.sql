CREATE TABLE IF NOT EXISTS doctors (
    id VARCHAR(36) PRIMARY KEY,
    email TEXT,
    connect_code TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY,
    email TEXT,
    connect_code TEXT UNIQUE,
    doctor_id VARCHAR(36) DEFAULT NULL REFERENCES doctors(id)
);

CREATE TABLE IF NOT EXISTS videos (
    id SERIAL PRIMARY KEY,
    creator VARCHAR(36),
    doctor_id VARCHAR(36) REFERENCES doctors(id),
    patient_id VARCHAR(36) REFERENCES patients(id),
    title TEXT NOT NULL DEFAULT '',
    object_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS poses (
    id SERIAL PRIMARY KEY,
    frame_id INTEGER, 
    object_name TEXT NOT NULL,
    keypoints DOUBLE PRECISION[][]
);

