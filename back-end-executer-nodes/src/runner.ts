import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { executePython } from './executors/pythonExecutor';
import { executeJavaScript } from './executors/nodeExecutor';
import { executeJava } from './executors/javaExecutor';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;
const RUNTIME = process.env.RUNTIME || 'python';
// Fixed server-side so callers cannot extend how long user code may run.
const EXECUTION_TIMEOUT_MS = Number(process.env.EXECUTION_TIMEOUT_MS ?? 5000);

// Harnesses print results as compact JSON, so expected outputs are normalized the same way.
function canonicalJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    return value;
  }
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', runtime: RUNTIME });
});

app.post('/run', async (req, res) => {
  try {
    let { code, templateCode, testCases } = req.body;
    const timeoutMs = EXECUTION_TIMEOUT_MS;

    if (!code || !templateCode || !testCases || !Array.isArray(testCases)) {
      return res.status(400).json({
        status: 'COMPILE_ERROR',
        error: 'Missing required fields or invalid testCases format',
      });
    }

    testCases = testCases.map((tc: any) => ({
      input: tc.input,
      expectedOutput: canonicalJson(tc.expectedOutput ?? tc.expected),
      isVisible: tc.isVisible ?? true,
    }));

    let result;
    if (RUNTIME === 'python') {
      result = await executePython(code, templateCode, testCases, timeoutMs);
    } else if (RUNTIME === 'node') {
      result = await executeJavaScript(code, templateCode, testCases, timeoutMs);
    } else if (RUNTIME === 'java') {
      result = await executeJava(code, templateCode, testCases, timeoutMs);
    } else {
      return res.status(400).json({
        status: 'RUNTIME_ERROR',
        error: `Unknown runtime: ${RUNTIME}`,
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('Execution error:', error);
    return res.status(500).json({
      status: 'RUNTIME_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.listen(PORT, () => {
  console.log(`${RUNTIME.toUpperCase()} Runner listening on port ${PORT}`);
});
