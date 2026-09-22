# Technical Assessment Platform

Plataforma web para crear, presentar y calificar evaluaciones técnicas de programación.

Un **evaluador** crea evaluaciones (*assessments*) con ejercicios de programación y sus casos de
prueba. Un **candidato** las resuelve desde un editor en el navegador, en **Python, JavaScript o
Java**: ejecuta su código, ve la salida y los errores de compilación con número de línea, y envía sus
respuestas. La plataforma compila y ejecuta cada respuesta en un entorno aislado, la valida contra
todos los casos de prueba y calcula el puntaje automáticamente.

## Funcionalidades

### Evaluador

- Crear preguntas: título, descripción, puntaje, lenguajes permitidos con su código inicial y casos
  de prueba, visibles (de ejemplo) u ocultos.
- Crear assessments: nombre, descripción, tiempo límite y preguntas, en el orden elegido.

### Candidato

- Listado de assessments con el estado del último intento: pendiente, en curso o aprobado/no aprobado.
- Detalle del intento: tiempo restante, preguntas, estado de cada una y puntaje acumulado.
- Editor de código (Monaco, el editor de VS Code) con selector de lenguaje:
  - **Ejecutar** prueba el código con los casos de ejemplo, sin guardar nada.
  - **Enviar** califica con todos los casos, incluidos los ocultos. Se puede reenviar, y cuenta el
    último envío.
- Consola con estado de compilación, errores con número de línea, salida del programa y resultado por
  caso (por ejemplo: *5 casos ejecutados, 4 exitosos, 1 fallido, resultado 80 %*).
- Resultados: puntaje obtenido, preguntas correctas e incorrectas, tiempo consumido y la opción de
  volver a presentar.

### Plataforma

- Puntaje proporcional a los casos aprobados de cada pregunta (4 de 5 casos en una pregunta de 10
  puntos = 8 puntos).
- Tiempo límite validado en el servidor: una respuesta enviada fuera de tiempo se rechaza y el intento
  se cierra.
- Ejecución aislada del código enviado (ver [Seguridad](#seguridad-de-la-ejecución)).

## Arquitectura

```text
Navegador ──► frontend (Angular + nginx) ──/api──► backend-api (Express) ──► PostgreSQL
                     :4200                           :3000       │
                                                                 │ red interna (sin internet)
                                            ┌────────────────────┼────────────────────┐
                                            ▼                    ▼                    ▼
                                      python-runner         node-runner          java-runner
```

| Componente | Tecnología | Responsabilidad |
|---|---|---|
| `front-end` | Angular 20, Monaco Editor, nginx | Interfaz web. nginx sirve la aplicación y reenvía `/api` al backend |
| `back-end-main-node` | Node.js, Express, TypeScript, Drizzle ORM | API principal: autenticación, assessments, preguntas, intentos y calificación |
| `back-end-executer-nodes` | Node.js, Express, TypeScript | Runners: compilan y ejecutan el código contra los casos de prueba. Una imagen por lenguaje (Python 3, Node.js, OpenJDK 17) con el mismo código base |
| `database` | PostgreSQL 15 | Esquema (`schema.sql`) y datos iniciales (`data.sql`) |

### Estructura del repositorio

```text
.
├── back-end-main-node/          API principal
│   ├── src/
│   │   ├── routes/              Definición de endpoints y permisos
│   │   ├── controllers/         Validación de la petición y respuesta HTTP
│   │   ├── services/            Reglas de negocio (calificación, tiempo límite, intentos)
│   │   ├── repositories/        Acceso a datos con Drizzle
│   │   ├── models/              Tablas de la base de datos
│   │   ├── middleware/          Autenticación (JWT) y manejo de errores
│   │   └── clients/             Cliente HTTP hacia los runners
│   ├── tests/
│   └── Dockerfile
├── back-end-executer-nodes/     Runners de código
│   ├── src/
│   │   ├── executors/           Un ejecutor por lenguaje
│   │   ├── services/            Cola de ejecución (una a la vez por runner)
│   │   └── utils/               Sandbox, validación de sintaxis y armado de los casos
│   ├── tests/
│   └── Dockerfile.python · Dockerfile.node · Dockerfile.java
├── front-end/                   Aplicación Angular
│   ├── src/app/
│   │   ├── pages/               Login, listado, detalle, editor, resultados y panel del evaluador
│   │   ├── shared/              Editor Monaco, consola de ejecución
│   │   └── core/                Servicios de API y sesión, guards, modelos
│   ├── nginx.conf
│   └── Dockerfile
├── database/
│   ├── schema.sql               Tablas
│   ├── data.sql                 Datos iniciales
│   └── migrations/              Scripts para actualizar una base de datos ya creada
├── docker-compose.yaml
└── DOCKER_EXPLICADO.md          Explicación detallada de la configuración de Docker
```

## Ejecución en local

### Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (macOS, Windows o Linux) o Docker
  Engine con Docker Compose 2.1 o superior.
- Los puertos **4200**, **3000**, **5432** y **8080** libres.

No hace falta instalar Node.js, Java, Python ni PostgreSQL: todo se construye y corre dentro de los
contenedores.

### Levantar la plataforma

Desde la raíz del repositorio (el mismo comando en macOS, Windows y Linux):

```bash
docker compose up -d --build --wait
```

- `--build` construye las imágenes. La primera vez tarda varios minutos, porque descarga las imágenes
  base y las dependencias. Las siguientes veces reutiliza la caché.
- `--wait` no devuelve la terminal hasta que todos los servicios están listos.

Cuando termine, abre **http://localhost:4200**.

### Cuentas de prueba

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `admin` | Evaluador: crea preguntas y assessments |
| `estudiante` | `estudiante` | Candidato |
| `usuario` | `usuario` | Candidato |

La base de datos se crea la primera vez con 3 preguntas (con código inicial en los tres lenguajes y 5
casos de prueba cada una) y 2 assessments listos para presentar.

### Prueba rápida: resolver el assessment "Algoritmos Simples"

Para ver la plataforma en funcionamiento, entra como `estudiante` / `estudiante`, pulsa **Iniciar** en
*Assessment Algoritmos Simples* y resuelve sus dos preguntas con las soluciones de abajo. Cada pregunta
se responde en un lenguaje distinto, para ver que el mismo assessment acepta varios lenguajes.

#### 1. Encuentra el número máximo (10 puntos), en Python

Retorna el valor máximo del arreglo.

```python
def find_max(arr):
    return max(arr)
```

#### 2. Suma números pares (15 puntos), en Java

Retorna la suma de los números pares del arreglo (0 si no hay ninguno).

```java
public class Solution {
    public int sumEvenNumbers(int[] arr) {
        int sum = 0;
        for (int n : arr) {
            if (n % 2 == 0) {
                sum += n;
            }
        }
        return sum;
    }
}
```

En cada pregunta:

1. Pulsa **Resolver**, elige el lenguaje en el editor y pega la solución.
2. **Ejecutar** corre solo los 2 casos de ejemplo y muestra la salida de cada uno, sin calificar.
3. **Enviar respuesta** corre los 5 casos, incluidos los 3 ocultos, y guarda el puntaje: cada caso que
   pasa suma la parte proporcional de los puntos de la pregunta.

Al terminar, pulsa **Finalizar assessment**. Con estas dos soluciones el resultado es 25 de 25 puntos.

Para ver cómo responde la plataforma cuando algo sale mal, puedes probar también:

- una solución incompleta (por ejemplo, `return arr[0]` en la primera pregunta), que da puntaje parcial;
- un error de sintaxis (por ejemplo, borrar un `;` en Java), que la consola muestra como error de
  compilación, indicando la línea.

### Servicios

| Servicio | Dirección | Uso |
|---|---|---|
| Aplicación web | http://localhost:4200 | Punto de entrada |
| API principal | http://localhost:3000/api | Acceso directo a la API (ver [API](#api-del-nodo-principal)) |
| Adminer | http://localhost:8080 | Consultar la base de datos. Sistema *PostgreSQL*, servidor `postgres`, usuario y contraseña `postgres` |
| PostgreSQL | `localhost:5432` | Base de datos `technical_assessment_platform` |

Los runners no publican puertos: solo la API principal puede llamarlos.

### Comandos útiles

| Comando | Para qué |
|---|---|
| `docker compose ps` | Estado de cada servicio |
| `docker compose logs -f backend-api` | Registros de un servicio en tiempo real |
| `docker compose down` | Detener y quitar los contenedores (los datos se conservan) |
| `docker compose down -v` | Lo mismo y además **borra la base de datos**: al volver a levantar se crea de nuevo con los datos iniciales |
| `docker compose up -d --build --wait <servicio>` | Reconstruir un solo servicio tras cambiar su código |
| `docker compose down -v --rmi all` | Eliminar todo lo del proyecto: contenedores, red, base de datos e imágenes (ver abajo) |

### Eliminar todo lo del proyecto

Para dejar el equipo como antes de levantar la plataforma, ejecuta desde la raíz del repositorio:

```bash
docker compose down -v --rmi all
```

- `down` detiene y quita los contenedores de todos los servicios y la red que Compose creó para ellos.
- `-v` borra también los volúmenes del proyecto, es decir, **la base de datos con todo lo que se
  haya creado** (preguntas, assessments e intentos).
- `--rmi all` borra las imágenes que usan los servicios: las que se construyeron desde este repositorio
  (API, front-end y runners) y las descargadas (`postgres` y `adminer`). Si otro proyecto usa esas
  mismas imágenes descargadas, tendrá que volver a descargarlas.

Después de esto, el siguiente `docker compose up -d --build --wait` vuelve a descargar y construir todo
desde cero, así que tarda como la primera vez. La caché de construcción de Docker no se borra con este
comando; si también quieres liberar ese espacio, usa `docker builder prune`.

### Configuración

La plataforma funciona sin configuración. Para cambiar puertos o credenciales, crea un archivo `.env`
en la raíz con las variables que quieras sobrescribir:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `FRONTEND_PORT` | `4200` | Puerto de la aplicación web |
| `DB_PORT` | `5432` | Puerto de PostgreSQL en el equipo |
| `DB_NAME` · `DB_USER` · `DB_PASSWORD` | `technical_assessment_platform` · `postgres` · `postgres` | Credenciales de la base de datos (solo se aplican al crearla) |
| `JWT_SECRET` | valor de desarrollo | Clave para firmar las sesiones. Debe definirse en cualquier entorno compartido |

### Pruebas

Cada módulo tiene sus pruebas unitarias con Jest. Estas sí requieren Node.js 24 en el equipo:

```bash
cd back-end-main-node && npm ci && npm test
cd back-end-executer-nodes && npm ci && npm test
cd front-end && npm ci && npm test
```

## API del nodo principal

Base: `http://localhost:3000/api`. Desde el navegador se accede por `http://localhost:4200/api`.

La especificación completa (OpenAPI 3.0), con los esquemas de cada petición y respuesta, los códigos de
error y ejemplos, está en [back-end-main-node/openapi.yaml](back-end-main-node/openapi.yaml). Para verla
de forma interactiva, ábrela en [Swagger Editor](https://editor.swagger.io/) (*File → Import file*) o
con una extensión de OpenAPI en tu editor.

**Autenticación.** `POST /auth/login` deja la sesión en una cookie `httpOnly` (`tap_session`) con un
JWT válido por 8 horas; las demás rutas la exigen. El usuario y el rol salen siempre de la sesión,
nunca del cuerpo de la petición.

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | Público | Inicia sesión. Cuerpo: `{ username, password }`. Responde el usuario y su rol |
| `POST` | `/auth/logout` | Público | Cierra la sesión |
| `GET` | `/auth/me` | Sesión | Usuario de la sesión actual |
| `GET` | `/assessments` | Sesión | Lista de assessments |
| `GET` | `/assessments/:id` | Sesión | Assessment con sus preguntas en orden y el puntaje total posible |
| `POST` | `/assessments` | Evaluador | Crea un assessment. Cuerpo: `{ title, description?, durationMinutes, questionIds[] }` |
| `GET` | `/questions` | Sesión | Lista de preguntas |
| `GET` | `/questions/:id` | Sesión | Pregunta con su código inicial por lenguaje y solo los casos de prueba visibles |
| `POST` | `/questions` | Evaluador | Crea una pregunta. Cuerpo: `{ title, description, points, starterCodes: { python?, javascript?, java? }, testCases: [{ inputValue, expectedOutput, isVisible }] }` |
| `POST` | `/questions/:id/run` | Sesión | Ejecuta código con los 2 primeros casos visibles, sin guardar nada. Cuerpo: `{ code, language }` |
| `GET` | `/submissions` | Candidato | Intentos del candidato, del más reciente al más antiguo |
| `POST` | `/submissions` | Candidato | Inicia un intento. Cuerpo: `{ assessmentId }`. `409` si ya hay uno en curso |
| `GET` | `/submissions/:id` | Candidato | Intento con sus envíos y el resultado de cada caso de prueba |
| `POST` | `/submissions/:id/questions` | Candidato | Envía y califica una respuesta con todos los casos. Cuerpo: `{ questionId, code, language }`. `409` si el intento terminó o se acabó el tiempo |
| `POST` | `/submissions/:id/complete` | Candidato | Finaliza el intento y fija el puntaje final (la suma del último envío de cada pregunta) |

`language` puede ser `python`, `javascript` o `java`. Un candidato solo puede ver y modificar sus
propios intentos (`403` en otro caso).

Los casos de prueba usan JSON: `inputValue` es la **lista de argumentos** de la función y
`expectedOutput` el valor que debe retornar. Por ejemplo, para `findMax(arr)`:
`inputValue: "[[3, 5, 1, 8]]"`, `expectedOutput: "8"`.

**Resultado de una ejecución** (`/questions/:id/run` con una solución que retorna el primer elemento):

```json
{
  "status": "WRONG_ANSWER",
  "error": "Expected: 8, Got: 3",
  "testResults": [
    { "testCaseIndex": 0, "input": "[[3, 5, 1, 8, 2]]", "expectedOutput": "8", "actualOutput": "3", "passed": false, "error": "Expected: 8, Got: 3" },
    { "testCaseIndex": 1, "input": "[[10, 20, 5]]", "expectedOutput": "20", "actualOutput": "10", "passed": false, "error": "Expected: 20, Got: 10" }
  ],
  "passedTests": 0,
  "totalTests": 2
}
```

`status` puede ser `SUCCESS`, `WRONG_ANSWER`, `COMPILE_ERROR`, `RUNTIME_ERROR` o
`TIME_LIMIT_EXCEEDED`.

**Errores:** todas las respuestas de error tienen la forma
`{ "error": { "status": 404, "message": "...", "timestamp": "..." } }`.

**Salud:** `GET http://localhost:3000/health` responde `{ "status": "ok" }`.

## Seguridad de la ejecución

El código enviado por los candidatos se considera no confiable. Cada runner:

- Ejecuta el código con un usuario sin privilegios, sin *capabilities* y sin posibilidad de escalarlos.
- Tiene el sistema de archivos en solo lectura: el código no puede crear, modificar ni borrar
  archivos, ni leer el código del servidor.
- Está en una red interna, sin acceso a internet ni a la base de datos.
- Limita cada ejecución a 5 segundos y 64 KB de salida, y cada contenedor a 1 CPU, memoria fija y un
  número máximo de procesos (lo que protege contra bucles infinitos, consumo de memoria y *fork bombs*).
- No pasa las variables de entorno del servidor al código, y al terminar elimina los procesos que
  este haya dejado vivos.

El detalle de cada medida y el motivo de cada opción de Docker están en
[DOCKER_EXPLICADO.md](DOCKER_EXPLICADO.md).

## Documentación adicional

- [DOCKER_EXPLICADO.md](DOCKER_EXPLICADO.md): cada línea de `docker-compose.yaml` y de los
  Dockerfile, explicada.
- [database/DATABASE_SCHEMA.md](database/DATABASE_SCHEMA.md): tablas y relaciones de la base de datos.
