CREATE TABLE doctors (
    id TEXT PRIMARY KEY CHECK (length(id) <= 32),
    email TEXT,
    connect_code TEXT UNIQUE,
    patients TEXT[] DEFAULT '{}'
);

CREATE TABLE patients (
    id TEXT PRIMARY KEY CHECK (length(id) <= 32),
    email TEXT,
    connect_code TEXT UNIQUE,
    doctor_id TEXT
);

CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    doctor_id TEXT,
    patient_id TEXT,
    file_path TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);