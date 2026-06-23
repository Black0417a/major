CREATE TABLE majors (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  major_class TEXT NOT NULL,
  degree TEXT,
  duration INTEGER,
  description TEXT,
  data_basis TEXT,
  verified_detail_status TEXT,
  sources_json TEXT,
  source_note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE major_vectors (
  major_id INTEGER PRIMARY KEY REFERENCES majors(id),
  vector_json TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE questionnaire_questions (
  id TEXT PRIMARY KEY,
  dimension TEXT NOT NULL,
  sub_dimension TEXT NOT NULL,
  text TEXT NOT NULL,
  reverse_scored INTEGER DEFAULT 0,
  weight REAL DEFAULT 1
);

CREATE TABLE assessment_sessions (
  id TEXT PRIMARY KEY,
  anonymous_token TEXT NOT NULL,
  status TEXT NOT NULL,
  current_step INTEGER DEFAULT 0,
  answer_snapshot TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assessment_results (
  session_id TEXT PRIMARY KEY REFERENCES assessment_sessions(id),
  student_vector TEXT NOT NULL,
  result_json TEXT NOT NULL,
  generated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Production note: MajorTI is currently stateless and should not use
-- assessment_sessions or assessment_results unless the deployment adds
-- explicit isolation, expiration, and privacy controls. They remain here only
-- as a future optional design reference, not as active runtime storage.

CREATE TABLE admission_scores (
  id INTEGER PRIMARY KEY,
  major_id INTEGER REFERENCES majors(id),
  university_name TEXT,
  province TEXT,
  year INTEGER,
  batch TEXT,
  min_score INTEGER,
  min_rank INTEGER,
  source TEXT
);

CREATE TABLE employment_stats (
  id INTEGER PRIMARY KEY,
  major_id INTEGER REFERENCES majors(id),
  year INTEGER,
  employment_rate REAL,
  salary_median INTEGER,
  source TEXT
);
