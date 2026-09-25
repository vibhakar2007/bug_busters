import {
  HandsOnTestCase,
  TestCaseResult,
  ExecutionOutcome,
  TestCaseStatus,
} from '@/types/handsOnDebug';

/**
 * Deep equality check for primitives, arrays, and objects.
 */
function areDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Handle Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!areDeepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Handle Objects
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a as Record<string, unknown>);
    const keysB = Object.keys(b as Record<string, unknown>);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!areDeepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Generates the sandboxed Worker script that executes the user code safely.
 */
function buildWorkerScript(): string {
  return `
    self.onmessage = function(e) {
      const { userCode, functionName, testCases } = e.data;
      const logs = [];
      
      // Shadow and disable network / dangerous APIs inside worker
      const safeConsole = {
        log: function(...args) {
          logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
        warn: function(...args) {
          logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        },
        error: function(...args) {
          logs.push('[ERR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
        }
      };

      try {
        self.fetch = undefined;
        self.XMLHttpRequest = undefined;
        self.WebSocket = undefined;
        self.importScripts = undefined;
      } catch (err) {}

      try {
        // Construct execution environment with sanitized scope
        const runnerFunction = new Function(
          'console',
          \`
            "use strict";
            \${userCode};
            if (typeof \${functionName} !== 'function') {
              throw new Error("Function '\${functionName}' is not defined or is not a function.");
            }
            return \${functionName};
          \`
        );

        const targetFn = runnerFunction(safeConsole);

        const testResults = [];
        let passedCount = 0;

        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          const startT = performance.now();
          let actualVal;
          let hasError = false;
          let errorMsg = null;

          try {
            // Clone inputs to avoid mutation affecting other tests
            const clonedInputs = JSON.parse(JSON.stringify(tc.inputs));
            actualVal = targetFn.apply(null, clonedInputs);
          } catch (fnErr) {
            hasError = true;
            errorMsg = fnErr instanceof Error ? fnErr.message : String(fnErr);
          }
          const endT = performance.now();

          testResults.push({
            test_case_index: i,
            inputs: tc.inputs,
            expected: tc.expected,
            actual: actualVal,
            error: errorMsg,
            execution_time_ms: Math.round((endT - startT) * 100) / 100,
            description: tc.description,
            hasError: hasError
          });
        }

        self.postMessage({
          success: true,
          logs: logs,
          testResults: testResults,
          error: null
        });
      } catch (compileErr) {
        self.postMessage({
          success: false,
          logs: logs,
          testResults: [],
          error: compileErr instanceof Error ? compileErr.message : String(compileErr)
        });
      }
    };
  `;
}

/**
 * In-Browser JavaScript Sandboxed Code Execution
 */
export async function executeInBrowserJavaScript(
  userCode: string,
  functionName: string,
  testCases: HandsOnTestCase[],
  timeoutMs = 2500
): Promise<ExecutionOutcome> {
  // 1. Basic sanitization check for critical forbidden tokens
  const forbiddenPatterns = [
    /\bwindow\b/,
    /\bdocument\b/,
    /\blocalStorage\b/,
    /\bsessionStorage\b/,
    /\bindexedDB\b/,
    /\bcookie\b/,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(userCode)) {
      return {
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Access to '${pattern.source.replace(/\\b/g, '')}' is blocked in competitive environment.`,
        test_results: [],
        passed_count: 0,
        total_count: testCases.length,
        all_passed: false,
      };
    }
  }

  // 2. Execute within sandboxed Web Worker with timeout protection
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    let timer: NodeJS.Timeout | null = null;
    let finished = false;

    const cleanup = () => {
      finished = true;
      if (timer) clearTimeout(timer);
      if (worker) {
        worker.terminate();
        worker = null;
      }
    };

    try {
      const blob = new Blob([buildWorkerScript()], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      worker = new Worker(workerUrl);

      timer = setTimeout(() => {
        if (!finished) {
          cleanup();
          resolve({
            success: false,
            error_type: 'TimeLimitExceeded',
            logs: [],
            error: `Time Limit Exceeded (TLE): Execution exceeded ${timeoutMs}ms limit. Check for infinite loops (e.g. while loops without termination) or runaway recursion.`,
            test_results: testCases.map((tc, idx) => ({
              test_case_index: idx,
              passed: false,
              status: 'time_limit_exceeded',
              inputs: tc.inputs,
              expected: tc.expected,
              actual: null,
              error: `Time Limit Exceeded (> ${timeoutMs}ms)`,
              execution_time_ms: timeoutMs,
              description: tc.description,
            })),
            passed_count: 0,
            total_count: testCases.length,
            all_passed: false,
          });
        }
      }, timeoutMs);

      worker.onmessage = (e) => {
        cleanup();
        const data = e.data;

        if (!data.success) {
          const isSyntax = /syntax|unexpected|parsing|token/i.test(data.error || '');
          resolve({
            success: false,
            error_type: isSyntax ? 'CompilationError' : 'RuntimeError',
            logs: data.logs || [],
            error: `${isSyntax ? 'Compilation / Syntax Error' : 'Runtime Error'}:\n${data.error}`,
            test_results: testCases.map((tc, idx) => ({
              test_case_index: idx,
              passed: false,
              status: isSyntax ? 'compilation_error' : 'runtime_error',
              inputs: tc.inputs,
              expected: tc.expected,
              actual: null,
              error: data.error || 'Execution Error',
              execution_time_ms: 0,
              description: tc.description,
            })),
            passed_count: 0,
            total_count: testCases.length,
            all_passed: false,
          });
          return;
        }

        const rawResults = data.testResults || [];
        let passed = 0;
        let hasRuntimeError = false;

        const verifiedResults: TestCaseResult[] = rawResults.map((r: {
          test_case_index: number;
          inputs: unknown[];
          expected: unknown;
          actual: unknown;
          error?: string;
          execution_time_ms: number;
          description: string;
          hasError?: boolean;
        }) => {
          let status: TestCaseStatus = 'failed';
          if (r.hasError) {
            hasRuntimeError = true;
            status = 'runtime_error';
          } else if (areDeepEqual(r.actual, r.expected)) {
            status = 'passed';
            passed++;
          } else {
            status = 'failed';
          }

          return {
            test_case_index: r.test_case_index,
            passed: status === 'passed',
            status,
            inputs: r.inputs,
            expected: r.expected,
            actual: r.actual,
            error: r.error,
            execution_time_ms: r.execution_time_ms,
            description: r.description,
          };
        });

        resolve({
          success: !hasRuntimeError,
          error_type: hasRuntimeError ? 'RuntimeError' : null,
          error: hasRuntimeError ? 'Runtime Error: An unhandled exception was thrown during test execution.' : null,
          logs: data.logs || [],
          test_results: verifiedResults,
          passed_count: passed,
          total_count: testCases.length,
          all_passed: passed === testCases.length,
        });
      };

      worker.onerror = (err) => {
        cleanup();
        resolve({
          success: false,
          error_type: 'RuntimeError',
          logs: [],
          error: `Runtime Error in Web Worker: ${err.message || 'Worker thread script crashed.'}`,
          test_results: testCases.map((tc, idx) => ({
            test_case_index: idx,
            passed: false,
            status: 'runtime_error',
            inputs: tc.inputs,
            expected: tc.expected,
            actual: null,
            error: err.message || 'Worker runtime crash',
            execution_time_ms: 0,
            description: tc.description,
          })),
          passed_count: 0,
          total_count: testCases.length,
          all_passed: false,
        });
      };

      worker.postMessage({
        userCode,
        functionName,
        testCases,
      });
    } catch {
      cleanup();
      // Fallback: synchronous sandbox runner
      resolve(runFallbackJavaScript(userCode, functionName, testCases));
    }
  });
}

/**
 * Fallback runner if Web Workers are restricted in environment
 */
function runFallbackJavaScript(
  userCode: string,
  functionName: string,
  testCases: HandsOnTestCase[]
): ExecutionOutcome {
  const logs: string[] = [];
  const safeConsole = {
    log: (...args: unknown[]) =>
      logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    warn: (...args: unknown[]) =>
      logs.push('[WARN] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    error: (...args: unknown[]) =>
      logs.push('[ERR] ' + args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
  };

  try {
    const fnRunner = new Function(
      'console',
      `
        "use strict";
        ${userCode};
        if (typeof ${functionName} !== 'function') {
          throw new Error("Function '${functionName}' was not defined.");
        }
        return ${functionName};
      `
    );

    const targetFn = fnRunner(safeConsole);
    let passed = 0;
    let hasRuntimeError = false;
    const results: TestCaseResult[] = [];

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const startT = performance.now();
      let actualVal;
      let errorMsg: string | undefined = undefined;

      try {
        actualVal = targetFn.apply(null, JSON.parse(JSON.stringify(tc.inputs)));
      } catch (e) {
        hasRuntimeError = true;
        errorMsg = e instanceof Error ? e.message : String(e);
      }
      const endT = performance.now();

      let status: TestCaseStatus = 'failed';
      if (errorMsg) {
        status = 'runtime_error';
      } else if (areDeepEqual(actualVal, tc.expected)) {
        status = 'passed';
        passed++;
      } else {
        status = 'failed';
      }

      results.push({
        test_case_index: i,
        passed: status === 'passed',
        status,
        inputs: tc.inputs,
        expected: tc.expected,
        actual: actualVal,
        error: errorMsg,
        execution_time_ms: Math.round((endT - startT) * 100) / 100,
        description: tc.description,
      });
    }

    return {
      success: !hasRuntimeError,
      error_type: hasRuntimeError ? 'RuntimeError' : null,
      error: hasRuntimeError ? 'Runtime Error encountered in test execution.' : null,
      logs,
      test_results: results,
      passed_count: passed,
      total_count: testCases.length,
      all_passed: passed === testCases.length,
    };
  } catch (err) {
    const isSyntax = /syntax|unexpected|token/i.test(err instanceof Error ? err.message : String(err));
    return {
      success: false,
      error_type: isSyntax ? 'CompilationError' : 'RuntimeError',
      logs,
      error: err instanceof Error ? err.message : String(err),
      test_results: testCases.map((tc, idx) => ({
        test_case_index: idx,
        passed: false,
        status: isSyntax ? 'compilation_error' : 'runtime_error',
        inputs: tc.inputs,
        expected: tc.expected,
        actual: null,
        error: err instanceof Error ? err.message : String(err),
        execution_time_ms: 0,
        description: tc.description,
      })),
      passed_count: 0,
      total_count: testCases.length,
      all_passed: false,
    };
  }
}
