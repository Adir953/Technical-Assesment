-- Datos de ejemplo para la plataforma de evaluaciones técnicas

-- ==============================================================================
-- INSERTAR USUARIOS
-- ==============================================================================

-- Administradores
INSERT INTO users (name, email, password_hash, role) VALUES
('Juan Pérez', 'juan.admin@example.com', '$2a$10$hashedpassword1', 'admin'),
('María García', 'maria.admin@example.com', '$2a$10$hashedpassword2', 'admin');

-- Estudiantes
INSERT INTO users (name, email, password_hash, role) VALUES
('Carlos López', 'carlos@example.com', '$2a$10$hashedpassword3', 'student'),
('Ana Martínez', 'ana@example.com', '$2a$10$hashedpassword4', 'student'),
('Luis Rodríguez', 'luis@example.com', '$2a$10$hashedpassword5', 'student'),
('Sofia Chen', 'sofia@example.com', '$2a$10$hashedpassword6', 'student');

-- ==============================================================================
-- INSERTAR PREGUNTAS
-- ==============================================================================

-- Pregunta 1: Encontrar número máximo
INSERT INTO questions (created_by, title, description, points, starter_code) VALUES
(1, 'Encuentra el número máximo',
'Dado un arreglo de números, retorna el valor máximo del arreglo.

Ejemplo:
Entrada: [3, 5, 1, 8, 2]
Salida: 8',
10,
'function findMax(arr) {
  // SOLUTION
}');

-- Pregunta 2: Invertir cadena
INSERT INTO questions (created_by, title, description, points, starter_code) VALUES
(1, 'Invierte una cadena',
'Dado un string, retorna el string invertido.

Ejemplo:
Entrada: "hola"
Salida: "aloh"',
10,
'function reverseString(str) {
  // SOLUTION
}');

-- Pregunta 3: Sumar números pares
INSERT INTO questions (created_by, title, description, points, starter_code) VALUES
(2, 'Suma números pares',
'Dado un arreglo de números, retorna la suma de todos los números pares.

Ejemplo:
Entrada: [1, 2, 3, 4, 5, 6]
Salida: 12 (2+4+6)',
15,
'function sumEvenNumbers(arr) {
  // SOLUTION
}');

-- ==============================================================================
-- INSERTAR CASOS DE PRUEBA
-- ==============================================================================

-- Casos de prueba para pregunta 1 (Encontrar máximo)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(1, '[[3, 5, 1, 8, 2]]', '8', true),
(1, '[[10, 20, 5]]', '20', true),
(1, '[[-5, -2, -10]]', '-2', true),
(1, '[[100]]', '100', true),
(1, '[[7, 7, 7, 7]]', '7', false);

-- Casos de prueba para pregunta 2 (Invertir cadena)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(2, '["hola"]', '"aloh"', true),
(2, '["abc"]', '"cba"', true),
(2, '["a"]', '"a"', true),
(2, '[""]', '""', true),
(2, '["racecar"]', '"racecar"', false);

-- Casos de prueba para pregunta 3 (Sumar números pares)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(3, '[[1, 2, 3, 4, 5, 6]]', '12', true),
(3, '[[2, 4, 6, 8]]', '20', true),
(3, '[[1, 3, 5]]', '0', true),
(3, '[[]]', '0', true),
(3, '[[0, 2, 4, 6, 8, 10]]', '30', false);

-- ==============================================================================
-- INSERTAR ASSESSMENTS
-- ==============================================================================

INSERT INTO assessments (created_by, title, description, duration_minutes, total_questions) VALUES
(1, 'Assessment JavaScript Básico',
'Evaluación de conceptos básicos de JavaScript: arreglos, strings y operaciones.
Tiempo límite: 60 minutos',
60, 3);

INSERT INTO assessments (created_by, title, description, duration_minutes, total_questions) VALUES
(2, 'Assessment Algoritmos Simples',
'Evaluación de algoritmos y lógica de programación.
Tiempo límite: 90 minutos',
90, 2);

-- ==============================================================================
-- VINCULAR PREGUNTAS A ASSESSMENTS
-- ==============================================================================

-- Assessment 1: 3 preguntas
INSERT INTO assessment_questions (assessment_id, question_id, question_order) VALUES
(1, 1, 1),  -- Encontrar máximo
(1, 2, 2),  -- Invertir cadena
(1, 3, 3);  -- Sumar pares

-- Assessment 2: 2 preguntas
INSERT INTO assessment_questions (assessment_id, question_id, question_order) VALUES
(2, 1, 1),  -- Encontrar máximo
(2, 3, 2);  -- Sumar pares

-- ==============================================================================
-- INSERTAR INTENTOS DE ASSESSMENT (Assessment Submissions)
-- ==============================================================================

-- Carlos intenta Assessment 1
INSERT INTO assessment_submissions (student_id, assessment_id, final_score, total_possible_points, started_at, completed_at)
VALUES (3, 1, 25, 35, '2026-09-10 09:00:00', '2026-09-10 09:35:00');

-- Ana intenta Assessment 1
INSERT INTO assessment_submissions (student_id, assessment_id, final_score, total_possible_points, started_at, completed_at)
VALUES (4, 1, 35, 35, '2026-09-10 10:00:00', '2026-09-10 10:45:00');

-- Luis intenta Assessment 2
INSERT INTO assessment_submissions (student_id, assessment_id, final_score, total_possible_points, started_at, completed_at)
VALUES (5, 2, 20, 25, '2026-09-12 14:00:00', '2026-09-12 14:50:00');

-- Sofía intenta Assessment 1 (en progreso)
INSERT INTO assessment_submissions (student_id, assessment_id, final_score, total_possible_points, started_at, completed_at)
VALUES (6, 1, NULL, 35, '2026-09-20 08:00:00', NULL);

-- ==============================================================================
-- INSERTAR RESPUESTAS A PREGUNTAS (Question Submissions)
-- ==============================================================================

-- Carlos responde pregunta 1 del assessment 1
INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, submitted_at)
VALUES
(1, 1,
'function findMax(arr) {
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}',
'javascript', 10, 4, 4, '2026-09-10 09:10:00');

-- Carlos responde pregunta 2 del assessment 1 (código incorrecto)
INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, compilation_error, submitted_at)
VALUES
(1, 2,
'function reverseString(str) {
  return str.split().reverse().join();
}',
'javascript', 0, 0, 4, 'Error: split is not a function', '2026-09-10 09:20:00');

-- Carlos responde pregunta 3 del assessment 1
INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, submitted_at)
VALUES
(1, 3,
'function sumEvenNumbers(arr) {
  return arr.reduce((sum, n) => n % 2 === 0 ? sum + n : sum, 0);
}',
'javascript', 15, 4, 4, '2026-09-10 09:30:00');

-- Ana responde correctamente todas
INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, submitted_at)
VALUES
(2, 1,
'function findMax(arr) {
  return Math.max(...arr);
}',
'javascript', 10, 4, 4, '2026-09-10 10:10:00');

INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, submitted_at)
VALUES
(2, 2,
'function reverseString(str) {
  return str.split("").reverse().join("");
}',
'javascript', 10, 4, 4, '2026-09-10 10:20:00');

INSERT INTO question_submissions
(assessment_submission_id, question_id, student_code, programming_language, score, passed_tests, total_tests, submitted_at)
VALUES
(2, 3,
'function sumEvenNumbers(arr) {
  let sum = 0;
  for (let n of arr) {
    if (n % 2 === 0) sum += n;
  }
  return sum;
}',
'javascript', 15, 4, 4, '2026-09-10 10:30:00');

-- ==============================================================================
-- INSERTAR RESULTADOS DE TEST CASES
-- ==============================================================================

-- Resultados para pregunta 1 de Carlos
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed)
VALUES
(1, 1, '[[3, 5, 1, 8, 2]]', '8', '8', true),
(1, 2, '[[10, 20, 5]]', '20', '20', true),
(1, 3, '[[-5, -2, -10]]', '-2', '-2', true),
(1, 4, '[[100]]', '100', '100', true);

-- Resultados para pregunta 2 de Carlos (incorrectos)
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed, error_message)
VALUES
(2, 5, '["hola"]', '"aloh"', NULL, false, 'TypeError: split is not a function'),
(2, 6, '["abc"]', '"cba"', NULL, false, 'TypeError: split is not a function'),
(2, 7, '["a"]', '"a"', NULL, false, 'TypeError: split is not a function'),
(2, 8, '[""]', '""', NULL, false, 'TypeError: split is not a function');

-- Resultados para pregunta 3 de Carlos
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed)
VALUES
(3, 9, '[[1, 2, 3, 4, 5, 6]]', '12', '12', true),
(3, 10, '[[2, 4, 6, 8]]', '20', '20', true),
(3, 11, '[[1, 3, 5]]', '0', '0', true),
(3, 12, '[[]]', '0', '0', true);

-- Resultados para pregunta 1 de Ana
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed)
VALUES
(4, 1, '[[3, 5, 1, 8, 2]]', '8', '8', true),
(4, 2, '[[10, 20, 5]]', '20', '20', true),
(4, 3, '[[-5, -2, -10]]', '-2', '-2', true),
(4, 4, '[[100]]', '100', '100', true);

-- Resultados para pregunta 2 de Ana
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed)
VALUES
(5, 5, '["hola"]', '"aloh"', '"aloh"', true),
(5, 6, '["abc"]', '"cba"', '"cba"', true),
(5, 7, '["a"]', '"a"', '"a"', true),
(5, 8, '[""]', '""', '""', true);

-- Resultados para pregunta 3 de Ana
INSERT INTO test_case_results
(question_submission_id, test_case_id, input_value, expected_output, actual_output, is_passed)
VALUES
(6, 9, '[[1, 2, 3, 4, 5, 6]]', '12', '12', true),
(6, 10, '[[2, 4, 6, 8]]', '20', '20', true),
(6, 11, '[[1, 3, 5]]', '0', '0', true),
(6, 12, '[[]]', '0', '0', true);
