import type { ExecutionResult, TestCase, TestOutcome, TestResult } from '../types/execution';

/**
 * Corre los casos uno por uno con `runOne` y arma la respuesta del runner. El estado general es
 * SUCCESS si pasan todos; si no, el del primer caso que falla, con su error.
 */
export async function runTestCases(
  testCases: TestCase[],
  runOne: (testCase: TestCase, index: number) => Promise<TestOutcome>
): Promise<ExecutionResult> {
  const testResults: TestResult[] = [];
  let firstFailure: TestOutcome | undefined;

  for (const [index, testCase] of testCases.entries()) {
    const outcome = await runOne(testCase, index);

    testResults.push({
      testCaseIndex: index,
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      actualOutput: outcome.output,
      passed: outcome.passed,
      error: outcome.error,
    });

    if (!outcome.passed && !firstFailure) {
      firstFailure = outcome;
    }
  }

  return {
    status: firstFailure ? firstFailure.status : 'SUCCESS',
    error: firstFailure?.error,
    testResults,
    passedTests: testResults.filter((result) => result.passed).length,
    totalTests: testCases.length,
    output: firstFailure ? undefined : 'All tests passed!',
  };
}
