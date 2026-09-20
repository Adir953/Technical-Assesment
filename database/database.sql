-- Technical Assessment Platform - PostgreSQL Schema
-- Estructura simple de base de datos para la plataforma de evaluación técnica

-- ==============================================================================
-- TABLA: users
-- Usuarios del sistema: estudiantes y administradores
-- ==============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA: assessments
-- Evaluaciones técnicas creadas por administradores
-- ==============================================================================
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA: questions
-- Ejercicios de programación
-- ==============================================================================
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    created_by INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    points INTEGER NOT NULL,
    starter_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA: assessment_questions
-- Relación entre assessments y questions
-- ==============================================================================
CREATE TABLE assessment_questions (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    UNIQUE(assessment_id, question_id)
);

-- ==============================================================================
-- TABLA: test_cases
-- Casos de prueba para validar soluciones
-- ==============================================================================
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    input_value TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_visible BOOLEAN DEFAULT TRUE
);

-- ==============================================================================
-- TABLA: assessment_submissions
-- Seguimiento de intentos de estudiantes en assessments
-- ==============================================================================
CREATE TABLE assessment_submissions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id),
    assessment_id INTEGER NOT NULL REFERENCES assessments(id),
    final_score INTEGER,
    total_possible_points INTEGER NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- ==============================================================================
-- TABLA: question_submissions
-- Respuestas de estudiantes a preguntas específicas
-- ==============================================================================
CREATE TABLE question_submissions (
    id SERIAL PRIMARY KEY,
    assessment_submission_id INTEGER NOT NULL REFERENCES assessment_submissions(id),
    question_id INTEGER NOT NULL REFERENCES questions(id),
    student_code TEXT NOT NULL,
    programming_language VARCHAR(50) NOT NULL,
    score INTEGER,
    passed_tests INTEGER DEFAULT 0,
    total_tests INTEGER NOT NULL,
    compilation_error TEXT,
    execution_output TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- TABLA: test_case_results
-- Resultados detallados de cada caso de prueba
-- ==============================================================================
CREATE TABLE test_case_results (
    id SERIAL PRIMARY KEY,
    question_submission_id INTEGER NOT NULL REFERENCES question_submissions(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id),
    input_value TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    actual_output TEXT,
    is_passed BOOLEAN,
    error_message TEXT
);
