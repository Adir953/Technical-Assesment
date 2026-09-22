import { runTestCases } from '../../src/utils/testRunner';
import type { TestCase, TestOutcome } from '../../src/types/execution';

const cases: TestCase[] = ['1', '2', '3'].map((n) => ({
  input: `[${n}]`,
  expectedOutput: n,
  isVisible: true,
}));

describe('runTestCases', () => {
  it('GIVEN varios casos donde alguno falla, WHEN se ejecutan, THEN el estado general es el del primer caso que falla', async () => {
    const outcomes: TestOutcome[] = [
      { status: 'SUCCESS', passed: true, output: '1' },
      { status: 'TIME_LIMIT_EXCEEDED', passed: false, error: 'Execution time exceeded' },
      { status: 'WRONG_ANSWER', passed: false, output: '2', error: 'Expected: 3, Got: 2' },
    ];

    const result = await runTestCases(cases, async (_testCase, index) => outcomes[index]);

    expect(result).toMatchObject({
      status: 'TIME_LIMIT_EXCEEDED',
      error: 'Execution time exceeded',
      passedTests: 1,
      totalTests: 3,
    });
    expect(result.testResults?.map((r) => r.passed)).toEqual([true, false, false]);
  });

  it('GIVEN casos que pasan todos, WHEN se ejecutan, THEN responde SUCCESS', async () => {
    const result = await runTestCases(cases, async (testCase) => ({
      status: 'SUCCESS',
      passed: true,
      output: testCase.expectedOutput,
    }));

    expect(result).toMatchObject({ status: 'SUCCESS', passedTests: 3, output: 'All tests passed!' });
  });
});
