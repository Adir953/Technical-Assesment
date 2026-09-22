# Base de Datos - Technical Assessment Platform

Esta carpeta contiene los scripts SQL para crear y poblar la base de datos PostgreSQL de la plataforma.

## Archivos

### 1. **schema.sql**
Define la estructura completa de la base de datos:
- Tablas principales (users, assessments, questions, etc.)
- Relaciones entre tablas
- Restricciones de integridad

### 2. **DATABASE_SCHEMA.md**
Documentación detallada:
- Descripción de cada tabla y sus campos
- Relaciones entre tablas
- Flujos de datos del sistema
- Queries útiles para operaciones comunes

### 3. **data.sql**
Datos de ejemplo para testing:
- 2 administradores
- 4 estudiantes
- 3 preguntas con casos de prueba
- 2 assessments
- Intentos de estudiantes con respuestas y resultados

## Instalación

### Prerequisitos
- PostgreSQL 12 o superior
- Cliente `psql` o gestor gráfico de PostgreSQL

### Pasos

1. **Crear la base de datos**
```bash
createdb technical_assessment_platform
```

2. **Ejecutar el script de schema**
```bash
psql -U postgres -d technical_assessment_platform -f schema.sql
```

3. **Cargar datos de ejemplo (opcional)**
```bash
psql -U postgres -d technical_assessment_platform -f data.sql
```

### Usando pgAdmin o DBeaver

1. Crear nueva base de datos llamada `technical_assessment_platform`
2. Abrir el editor SQL
3. Copiar el contenido de `schema.sql` y ejecutar
4. Copiar el contenido de `data.sql` y ejecutar

## Estructura de Usuarios

### Administrador
- Email: `juan.admin@example.com`
- Email: `maria.admin@example.com`
- Password: (hasheada - usar bcrypt en producción)

### Estudiantes
- `carlos@example.com`
- `ana@example.com`
- `luis@example.com`
- `sofia@example.com`

## Estructura Principal

```
users (id, name, email, password_hash, role)
├── assessments (created by admin)
│   ├── assessment_questions
│   │   └── questions (created by admin)
│   │       └── test_cases
│   │           └── test_case_results
│   └── assessment_submissions (created by student)
│       └── question_submissions (student code)
│           └── test_case_results (execution results)
```

## Operaciones Comunes

### Ver todos los assessments
```sql
SELECT * FROM assessments;
```

### Ver preguntas de un assessment
```sql
SELECT q.id, q.title, q.points, aq.question_order
FROM assessment_questions aq
JOIN questions q ON aq.question_id = q.id
WHERE aq.assessment_id = 1
ORDER BY aq.question_order;
```

### Ver intentos de un estudiante
```sql
SELECT a.title, s.final_score, s.total_possible_points, s.started_at, s.completed_at
FROM assessment_submissions s
JOIN assessments a ON s.assessment_id = a.id
WHERE s.student_id = 3
ORDER BY s.started_at DESC;
```

### Ver respuesta detallada de estudiante
```sql
SELECT 
    q.title,
    qs.student_code,
    qs.programming_language,
    qs.score,
    qs.passed_tests,
    qs.total_tests
FROM question_submissions qs
JOIN questions q ON qs.question_id = q.id
WHERE qs.assessment_submission_id = 1
ORDER BY qs.submitted_at;
```

## Notas

- Las contraseñas en `data.sql` son ejemplos. En producción, usar bcrypt o similar
- Los timestamps están en formato UTC
- Los test cases con `is_visible = false` son ocultos (se ejecutan pero no se muestran al estudiante)
