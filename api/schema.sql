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