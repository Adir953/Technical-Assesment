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

-- Cuentas de acceso a la plataforma (credenciales de demostración, no son secretos):
--   admin / admin            → evaluador
--   estudiante / estudiante  → estudiante
--   usuario / usuario        → estudiante
-- Formato del hash: scrypt$<salt hex>$<hash hex> (crypto.scryptSync, keylen 64).
INSERT INTO users (name, username, email, password_hash, role) VALUES
('Administrador', 'admin', 'admin@example.com',
 'scrypt$526e9af2df4904930ce4328cfa083c2c$feb9229b1ab8d60f6e1cfba7cb4c91ff97ef80c676281a5f318f2385df0a402bbfcbd8d74e764d4abdf47eee2361b016e1cf8370a62fcc8fccd81e92d5daefca',
 'admin'),
('Estudiante Demo', 'estudiante', 'estudiante@example.com',
 'scrypt$695adc8b29ce4b38e7b949c1b678ed33$f3d0548c19a53aa7e8c0dd436dbf3b8d064f18e838260d4bba254f6b77c3e8b836a049a404230be6c06dfcd54b282c812cb672dc64f2c61a0626674d0db72c67',
 'student'),
('Usuario de Prueba', 'usuario', 'usuario@example.com',
 'scrypt$233f3c1fc5fac98f08e8692985e7e72d$263aeecc134cd54e0b0c5622014ddd568fbfcdc52f548047611b09792f743cdbd9457630b45027728dfd081df4db4ee545bf2f62f1d88cdab79b099d3da6e18f',
 'student');

-- ==============================================================================
-- INSERTAR PREGUNTAS
-- ==============================================================================

-- Pregunta 1: Encontrar número máximo
INSERT INTO questions (created_by, title, description, points) VALUES
(1, 'Encuentra el número máximo',
'Dado un arreglo de números, retorna el valor máximo del arreglo.

Ejemplo:
Entrada: [3, 5, 1, 8, 2]
Salida: 8',
10);

-- Pregunta 2: Invertir cadena
INSERT INTO questions (created_by, title, description, points) VALUES
(1, 'Invierte una cadena',
'Dado un string, retorna el string invertido.

Ejemplo:
Entrada: "hola"
Salida: "aloh"',
10);

-- Pregunta 3: Sumar números pares
INSERT INTO questions (created_by, title, description, points) VALUES
(2, 'Suma números pares',
'Dado un arreglo de números, retorna la suma de todos los números pares.

Ejemplo:
Entrada: [1, 2, 3, 4, 5, 6]
Salida: 12 (2+4+6)',
15);

-- ==============================================================================
-- INSERTAR CÓDIGO INICIAL POR LENGUAJE
-- El runner llama a la primera función (o método público en Java) del código inicial.
-- ==============================================================================

INSERT INTO question_starter_codes (question_id, programming_language, starter_code) VALUES
(1, 'javascript',
'function findMax(arr) {
  // Escribe tu solución aquí
}
'),
(1, 'python',
'def find_max(arr):
    # Escribe tu solución aquí
    pass
'),
(1, 'java',
'public class Solution {
    public int findMax(int[] arr) {
        // Escribe tu solución aquí
        return 0;
    }
}
'),
(2, 'javascript',
'function reverseString(str) {
  // Escribe tu solución aquí
}
'),
(2, 'python',
'def reverse_string(s):
    # Escribe tu solución aquí
    pass
'),
(2, 'java',
'public class Solution {
    public String reverseString(String str) {
        // Escribe tu solución aquí
        return "";
    }
}
'),
(3, 'javascript',
'function sumEvenNumbers(arr) {
  // Escribe tu solución aquí
}
'),
(3, 'python',
'def sum_even_numbers(arr):
    # Escribe tu solución aquí
    pass
'),
(3, 'java',
'public class Solution {
    public int sumEvenNumbers(int[] arr) {
        // Escribe tu solución aquí
        return 0;
    }
}
');

-- ==============================================================================
-- INSERTAR CASOS DE PRUEBA
-- ==============================================================================

-- is_visible = true  → caso de ejemplo: se muestra en el enunciado y lo corre "Ejecutar" (máx. 2).
-- is_visible = false → caso oculto: solo se usa al enviar la respuesta para calificar.

-- Casos de prueba para pregunta 1 (Encontrar máximo)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(1, '[[3, 5, 1, 8, 2]]', '8', true),
(1, '[[10, 20, 5]]', '20', true),
(1, '[[-5, -2, -10]]', '-2', false),
(1, '[[100]]', '100', false),
(1, '[[7, 7, 7, 7]]', '7', false);

-- Casos de prueba para pregunta 2 (Invertir cadena)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(2, '["hola"]', '"aloh"', true),
(2, '["abc"]', '"cba"', true),
(2, '["a"]', '"a"', false),
(2, '[""]', '""', false),
(2, '["racecar"]', '"racecar"', false);

-- Casos de prueba para pregunta 3 (Sumar números pares)
INSERT INTO test_cases (question_id, input_value, expected_output, is_visible) VALUES
(3, '[[1, 2, 3, 4, 5, 6]]', '12', true),
(3, '[[2, 4, 6, 8]]', '20', true),
(3, '[[1, 3, 5]]', '0', false),
(3, '[[]]', '0', false),
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
