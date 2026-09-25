import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { HandsOnTestCase, TestCaseResult, ExecutionOutcome } from '@/types/handsOnDebug';

const MINGW_BIN = 'C:\\Users\\VIBHAKAR\\AppData\\Local\\Microsoft\\WinGet\\Packages\\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\\mingw64\\bin';
const JAVA_BIN = 'C:\\Program Files\\Common Files\\Oracle\\Java\\javapath';
const PYTHON_BIN = 'C:\\Users\\VIBHAKAR\\AppData\\Local\\Programs\\Python\\Python310';

const SYSTEM_ENV = {
  ...process.env,
  PATH: `${MINGW_BIN};${JAVA_BIN};${PYTHON_BIN};${process.env.PATH || ''}`,
  PYTHONUNBUFFERED: '1',
};

const FORBIDDEN_PYTHON_MODULES = [
  'os', 'sys', 'subprocess', 'socket', 'shutil', 'ctypes', 'urllib',
  'requests', 'http', 'ftplib', 'smtplib', 'webbrowser', 'pathlib',
  'tempfile', 'glob', 'pickle',
];

const FORBIDDEN_C_CPP_PATTERNS = [
  /\bsystem\s*\(/i,
  /\bpopen\s*\(/i,
  /\bfork\s*\(/i,
  /\bexecl\s*\(/i,
  /\bexecv\s*\(/i,
  /\bexecvp\s*\(/i,
  /\bexecve\s*\(/i,
  /\bremove\s*\(/i,
  /\bunlink\s*\(/i,
  /\bCreateProcess/i,
];

const FORBIDDEN_JAVA_PATTERNS = [
  /Runtime\.getRuntime/i,
  /ProcessBuilder/i,
  /System\.exit/i,
  /ClassLoader/i,
  /java\.nio\.file/i,
  /java\.io\.File/i,
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, language, function_name, test_cases } = body as {
      code: string;
      language: string;
      function_name: string;
      test_cases: HandsOnTestCase[];
    };

    if (!code || !function_name || !test_cases) {
      return NextResponse.json(
        { success: false, error: 'Missing code, function_name, or test_cases in request payload.' },
        { status: 400 }
      );
    }

    const normLang = (language || 'python').toLowerCase();

    // 1. Language validation
    const validLanguages = ['python', 'javascript', 'java', 'c', 'cpp'];
    if (!validLanguages.includes(normLang)) {
      return NextResponse.json(
        { success: false, error: `Unsupported language '${normLang}'. Supported languages: Python, JavaScript, Java, C, C++.` },
        { status: 400 }
      );
    }

    // 2. Dispatch to specific language runner
    if (normLang === 'python') {
      return handlePython(code, function_name, test_cases);
    } else if (normLang === 'javascript') {
      return handleJavaScript(code, function_name, test_cases);
    } else if (normLang === 'java') {
      return handleJava(code, function_name, test_cases);
    } else if (normLang === 'c') {
      return handleC(code, function_name, test_cases);
    } else if (normLang === 'cpp') {
      return handleCpp(code, function_name, test_cases);
    }

    return NextResponse.json({ success: false, error: 'Unknown language runner.' }, { status: 400 });
  } catch (err: unknown) {
    console.error('Execution API error:', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown execution failure.' },
      { status: 500 }
    );
  }
}

// -------------------------------------------------------------
// PYTHON RUNNER
// -------------------------------------------------------------
async function handlePython(code: string, function_name: string, test_cases: HandsOnTestCase[]) {
  // Security Checks
  for (const mod of FORBIDDEN_PYTHON_MODULES) {
    const regex = new RegExp(`\\b(import\\s+${mod}|from\\s+${mod}\\b)`, 'i');
    if (regex.test(code)) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Importing module '${mod}' is forbidden.`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }
  }

  const dangerousCalls = [/\bopen\s*\(/, /\b__import__\b/, /\beval\s*\(/, /\bexec\s*\(/];
  for (const pattern of dangerousCalls) {
    if (pattern.test(code)) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Prohibited call '${pattern.source}' is blocked.`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }
  }

  const testCasesJson = JSON.stringify(test_cases);
  const pythonHarness = `
import json, time

# User Code
${code}

def __run_tests():
    test_cases = json.loads('''${testCasesJson}''')
    results = []
    passed_count = 0
    fn = globals().get('${function_name}')

    if not callable(fn):
        print("###BUG_BUSTERS_RESULT_START###")
        print(json.dumps({
            "success": False,
            "error": "Function '${function_name}' is not defined or is not callable in your code.",
            "test_results": []
        }))
        return

    for idx, tc in enumerate(test_cases):
        inputs = tc["inputs"]
        expected = tc["expected"]
        desc = tc.get("description", "")
        start_t = time.perf_counter()
        actual = None
        err = None

        try:
            actual = fn(*inputs)
        except Exception as e:
            err = f"{type(e).__name__}: {str(e)}"
        end_t = time.perf_counter()

        passed = False
        if err is None:
            try:
                passed = json.dumps(actual, sort_keys=True) == json.dumps(expected, sort_keys=True)
            except Exception:
                passed = (actual == expected)

        if passed:
            passed_count += 1

        results.append({
            "test_case_index": idx,
            "passed": passed,
            "inputs": inputs,
            "expected": expected,
            "actual": actual,
            "error": err,
            "execution_time_ms": round((end_t - start_t) * 1000, 2),
            "description": desc
        })

    print("###BUG_BUSTERS_RESULT_START###")
    print(json.dumps({
        "success": True,
        "error": None,
        "test_results": results,
        "passed_count": passed_count,
        "total_count": len(test_cases),
        "all_passed": passed_count == len(test_cases)
    }))

__run_tests()
`;

  const outcome = await executeProcess('python', ['-c', pythonHarness], test_cases.length);
  return NextResponse.json(outcome);
}

// -------------------------------------------------------------
// JAVASCRIPT RUNNER (Node.js fallback if not in browser)
// -------------------------------------------------------------
async function handleJavaScript(code: string, function_name: string, test_cases: HandsOnTestCase[]) {
  const testCasesJson = JSON.stringify(test_cases);
  const jsHarness = `
const testCases = ${testCasesJson};
${code}

function __runTests() {
  const fn = typeof ${function_name} === 'function' ? ${function_name} : null;
  if (!fn) {
    console.log("###BUG_BUSTERS_RESULT_START###");
    console.log(JSON.stringify({
      success: false,
      error: "Function '${function_name}' is not defined in your JavaScript code.",
      test_results: []
    }));
    return;
  }

  const results = [];
  let passedCount = 0;

  for (let idx = 0; idx < testCases.length; idx++) {
    const tc = testCases[idx];
    const t0 = performance.now();
    let actual = null;
    let err = null;
    try {
      actual = fn(...tc.inputs);
    } catch (e) {
      err = e && e.name ? (e.name + ': ' + e.message) : (e ? String(e.message || e) : 'Error');
    }
    const t1 = performance.now();

    const passed = (err === null) && (JSON.stringify(actual) === JSON.stringify(tc.expected));
    if (passed) passedCount++;

    results.push({
      test_case_index: idx,
      passed,
      inputs: tc.inputs,
      expected: tc.expected,
      actual,
      error: err,
      execution_time_ms: +(t1 - t0).toFixed(2),
      description: tc.description || ''
    });
  }

  console.log("###BUG_BUSTERS_RESULT_START###");
  console.log(JSON.stringify({
    success: true,
    error: null,
    test_results: results,
    passed_count: passedCount,
    total_count: testCases.length,
    all_passed: passedCount === testCases.length
  }));
}
__runTests();
`;

  const outcome = await executeProcess('node', ['-e', jsHarness], test_cases.length);
  return NextResponse.json(outcome);
}

// -------------------------------------------------------------
// JAVA RUNNER
// -------------------------------------------------------------
async function handleJava(code: string, function_name: string, test_cases: HandsOnTestCase[]) {
  // Security Checks
  for (const pat of FORBIDDEN_JAVA_PATTERNS) {
    if (pat.test(code)) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Restricted Java class/method '${pat.source}' is blocked.`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-java-'));
  const runnerFile = path.join(tmpDir, 'Runner.java');

  // Replace public class Solution with class Solution so Runner is public
  let sanitizedCode = code;
  if (/public\s+class\s+Solution/i.test(sanitizedCode)) {
    sanitizedCode = sanitizedCode.replace(/public\s+class\s+Solution/i, 'class Solution');
  }

  // Generate test case invocation blocks for Java
  const testBlocks = test_cases.map((tc, idx) => {
    const inputsFormatted = tc.inputs.map((inp) => {
      if (typeof inp === 'string') return `"${inp.replace(/"/g, '\\"')}"`;
      if (typeof inp === 'boolean') return inp ? 'true' : 'false';
      return inp;
    }).join(', ');

    const expectedStr = JSON.stringify(tc.expected);
    const isBool = typeof tc.expected === 'boolean';
    const isString = typeof tc.expected === 'string';

    return `
    {
      int idx = ${idx};
      String desc = "${(tc.description || '').replace(/"/g, '\\"')}";
      long t0 = System.nanoTime();
      Object actual = null;
      String err = null;
      boolean passed = false;
      try {
        ${isString ? `actual = Solution.${function_name}(${inputsFormatted});` : isBool ? `actual = Solution.${function_name}(${inputsFormatted});` : `actual = Solution.${function_name}(${inputsFormatted});`}
      } catch (Throwable e) {
        err = e.getClass().getSimpleName() + ": " + (e.getMessage() != null ? e.getMessage() : e.toString());
      }
      long t1 = System.nanoTime();
      double execMs = Math.round((t1 - t0) / 10000.0) / 100.0;

      if (err == null && actual != null) {
        ${isString ? `passed = actual.toString().equals("${tc.expected}");` : isBool ? `passed = actual.equals(${tc.expected ? 'true' : 'false'});` : `passed = actual.toString().equals("${tc.expected}");`}
      }
      if (passed) passedCount++;

      StringBuilder tcJson = new StringBuilder();
      tcJson.append("{\\"test_case_index\\":").append(idx)
        .append(",\\"passed\\":").append(passed)
        .append(",\\"inputs\\":").append("${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}")
        .append(",\\"expected\\":").append("${expectedStr.replace(/"/g, '\\"')}")
        .append(",\\"actual\\":").append(quote(actual))
        .append(",\\"error\\":").append(quote(err))
        .append(",\\"execution_time_ms\\":").append(execMs)
        .append(",\\"description\\":").append(quote(desc))
        .append("}");
      tcResults.add(tcJson.toString());
    }
    `;
  }).join('\n');

  const javaSource = `
import java.util.*;

${sanitizedCode}

public class Runner {
  static String quote(Object obj) {
    if (obj == null) return "null";
    String s = obj.toString();
    StringBuilder sb = new StringBuilder();
    sb.append('"');
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      if (c == '"') { sb.append('\\\\'); sb.append('"'); }
      else if (c == '\\\\') { sb.append('\\\\'); sb.append('\\\\'); }
      else if (c == '\\n') { sb.append('\\\\'); sb.append('n'); }
      else { sb.append(c); }
    }
    sb.append('"');
    return sb.toString();
  }

  public static void main(String[] args) {
    int passedCount = 0;
    int totalCount = ${test_cases.length};
    List<String> tcResults = new ArrayList<>();

    ${testBlocks}

    System.out.println("###BUG_BUSTERS_RESULT_START###");
    StringBuilder sb = new StringBuilder();
    sb.append("{")
      .append("\\"success\\":true,")
      .append("\\"error\\":null,")
      .append("\\"test_results\\":[").append(String.join(",", tcResults)).append("],")
      .append("\\"passed_count\\":").append(passedCount).append(",")
      .append("\\"total_count\\":").append(totalCount).append(",")
      .append("\\"all_passed\\":").append(passedCount == totalCount)
      .append("}");
    System.out.println(sb.toString());
  }
}
`;

  try {
    fs.writeFileSync(runnerFile, javaSource, 'utf8');
    const outcome = await executeProcess('java', [runnerFile], test_cases.length, tmpDir);
    return NextResponse.json(outcome);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

// -------------------------------------------------------------
// C RUNNER
// -------------------------------------------------------------
async function handleC(code: string, function_name: string, test_cases: HandsOnTestCase[]) {
  // Security Checks
  for (const pat of FORBIDDEN_C_CPP_PATTERNS) {
    if (pat.test(code)) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Prohibited C function call '${pat.source}' is blocked.`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-c-'));
  const cFile = path.join(tmpDir, 'runner.c');
  const exeFile = path.join(tmpDir, 'runner.exe');

  const testBlocks = test_cases.map((tc, idx) => {
    const isString = typeof tc.expected === 'string';
    const isBool = typeof tc.expected === 'boolean';
    const inputsFormatted = tc.inputs.map((inp) => {
      if (typeof inp === 'string') {
        // strdup to avoid modifying read-only string literals if function modifies in-place
        return `strdup("${inp.replace(/"/g, '\\"')}")`;
      }
      if (typeof inp === 'boolean') return inp ? '1' : '0';
      return inp;
    }).join(', ');

    return `
    {
      int idx = ${idx};
      const char* desc = "${(tc.description || '').replace(/"/g, '\\"')}";
      int passed = 0;
      ${isString ? `
        char* actual = ${function_name}(${inputsFormatted});
        if (actual != NULL && strcmp(actual, "${tc.expected}") == 0) passed = 1;
        if (passed) passed_count++;
        printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":\\"${tc.expected}\\",\\"actual\\":\\"%s\\",\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
          idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", actual ? actual : "NULL", desc);
      ` : isBool ? `
        int actual = ${function_name}(${inputsFormatted});
        if (actual == ${tc.expected ? '1' : '0'}) passed = 1;
        if (passed) passed_count++;
        printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":%s,\\"actual\\":%s,\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
          idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", "${tc.expected}", actual ? "true" : "false", desc);
      ` : `
        long long actual = ${function_name}(${inputsFormatted});
        if (actual == ${tc.expected}LL) passed = 1;
        if (passed) passed_count++;
        printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":${tc.expected},\\"actual\\":%lld,\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
          idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", actual, desc);
      `}
      ${idx < test_cases.length - 1 ? 'printf(",");' : ''}
    }
    `;
  }).join('\n');

  const cSource = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

${code}

int main() {
  int passed_count = 0;
  int total_count = ${test_cases.length};

  printf("###BUG_BUSTERS_RESULT_START###\\n");
  printf("{\\"success\\":true,\\"error\\":null,\\"test_results\\":[");
  ${testBlocks}
  printf("],\\"passed_count\\":%d,\\"total_count\\":%d,\\"all_passed\\":%s}\\n",
    passed_count, total_count, passed_count == total_count ? "true" : "false");
  return 0;
}
`;

  try {
    fs.writeFileSync(cFile, cSource, 'utf8');

    // 1. Compile with gcc
    const compileResult = await runShellProcess('gcc', [cFile, '-o', exeFile], tmpDir, 4000);
    if (!compileResult.success) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'CompilationError',
        logs: [],
        error: `C Compilation Error:\n${compileResult.error || 'Failed to compile C source.'}`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }

    // 2. Run compiled binary
    const outcome = await executeProcess(exeFile, [], test_cases.length, tmpDir);
    return NextResponse.json(outcome);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

// -------------------------------------------------------------
// C++ RUNNER
// -------------------------------------------------------------
async function handleCpp(code: string, function_name: string, test_cases: HandsOnTestCase[]) {
  // Security Checks
  for (const pat of FORBIDDEN_C_CPP_PATTERNS) {
    if (pat.test(code)) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'SecurityViolation',
        logs: [],
        error: `Security Violation: Prohibited C++ function call '${pat.source}' is blocked.`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-cpp-'));
  const cppFile = path.join(tmpDir, 'runner.cpp');
  const exeFile = path.join(tmpDir, 'runner.exe');

  const testBlocks = test_cases.map((tc, idx) => {
    const isString = typeof tc.expected === 'string';
    const isBool = typeof tc.expected === 'boolean';
    const inputsFormatted = tc.inputs.map((inp) => {
      if (typeof inp === 'string') return `std::string("${inp.replace(/"/g, '\\"')}")`;
      if (typeof inp === 'boolean') return inp ? 'true' : 'false';
      return inp;
    }).join(', ');

    return `
    {
      int idx = ${idx};
      std::string desc = "${(tc.description || '').replace(/"/g, '\\"')}";
      bool passed = false;
      try {
        ${isString ? `
          std::string actual = ${function_name}(${inputsFormatted});
          if (actual == "${tc.expected}") passed = true;
          if (passed) passed_count++;
          printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":\\"${tc.expected}\\",\\"actual\\":\\"%s\\",\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
            idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", actual.c_str(), desc.c_str());
        ` : isBool ? `
          bool actual = ${function_name}(${inputsFormatted});
          if (actual == ${tc.expected ? 'true' : 'false'}) passed = true;
          if (passed) passed_count++;
          printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":%s,\\"actual\\":%s,\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
            idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", "${tc.expected}", actual ? "true" : "false", desc.c_str());
        ` : `
          long long actual = ${function_name}(${inputsFormatted});
          if (actual == ${tc.expected}LL) passed = true;
          if (passed) passed_count++;
          printf("{\\"test_case_index\\":%d,\\"passed\\":%s,\\"inputs\\":%s,\\"expected\\":${tc.expected},\\"actual\\":%lld,\\"error\\":null,\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
            idx, passed ? "true" : "false", "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", actual, desc.c_str());
        `}
      } catch (const std::exception& e) {
        printf("{\\"test_case_index\\":%d,\\"passed\\":false,\\"inputs\\":%s,\\"expected\\":null,\\"actual\\":null,\\"error\\":\\"%s\\",\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
          idx, "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", e.what(), desc.c_str());
      } catch (...) {
        printf("{\\"test_case_index\\":%d,\\"passed\\":false,\\"inputs\\":%s,\\"expected\\":null,\\"actual\\":null,\\"error\\":\\"Exception thrown\\",\\"execution_time_ms\\":0.1,\\"description\\":\\"%s\\"}",
          idx, "${JSON.stringify(tc.inputs).replace(/"/g, '\\"')}", desc.c_str());
      }
      ${idx < test_cases.length - 1 ? 'printf(",");' : ''}
    }
    `;
  }).join('\n');

  const cppSource = `
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <stdexcept>

${code}

int main() {
  int passed_count = 0;
  int total_count = ${test_cases.length};

  printf("###BUG_BUSTERS_RESULT_START###\\n");
  printf("{\\"success\\":true,\\"error\\":null,\\"test_results\\":[");
  ${testBlocks}
  printf("],\\"passed_count\\":%d,\\"total_count\\":%d,\\"all_passed\\":%s}\\n",
    passed_count, total_count, passed_count == total_count ? "true" : "false");
  return 0;
}
`;

  try {
    fs.writeFileSync(cppFile, cppSource, 'utf8');

    // 1. Compile with g++
    const compileResult = await runShellProcess('g++', [cppFile, '-o', exeFile], tmpDir, 4000);
    if (!compileResult.success) {
      return NextResponse.json<ExecutionOutcome>({
        success: false,
        error_type: 'CompilationError',
        logs: [],
        error: `C++ Compilation Error:\n${compileResult.error || 'Failed to compile C++ source.'}`,
        test_results: [],
        passed_count: 0,
        total_count: test_cases.length,
        all_passed: false,
      });
    }

    // 2. Run compiled binary
    const outcome = await executeProcess(exeFile, [], test_cases.length, tmpDir);
    return NextResponse.json(outcome);
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

// -------------------------------------------------------------
// PROCESS EXECUTION HELPERS
// -------------------------------------------------------------
function runShellProcess(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number
): Promise<{ success: boolean; stdout: string; error: string | null }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, {
      cwd,
      timeout: timeoutMs,
      env: SYSTEM_ENV,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        error: code === 0 ? null : (stderr.trim() || `Process exited with code ${code}`),
      });
    });

    proc.on('error', (err) => {
      resolve({
        success: false,
        stdout,
        error: err.message,
      });
    });
  });
}

async function executeProcess(
  cmd: string,
  args: string[],
  totalTestCases: number,
  cwd?: string,
  timeoutMs = 3000
): Promise<ExecutionOutcome> {
  return new Promise<ExecutionOutcome>((resolve) => {
    let timedOut = false;
    const proc = spawn(cmd, args, {
      cwd: cwd || process.cwd(),
      env: SYSTEM_ENV,
    });

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill('SIGKILL');
      } catch {}
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (exitCode, signal) => {
      clearTimeout(timer);

      // 1. Time Limit Exceeded detection
      if (timedOut || signal === 'SIGTERM' || signal === 'SIGKILL') {
        resolve({
          success: false,
          error_type: 'TimeLimitExceeded',
          logs: stdout.trim() ? [stdout.trim()] : [],
          error: `Time Limit Exceeded (TLE): Execution exceeded ${timeoutMs / 1000}s limit. Check for infinite loops (e.g. while condition never terminates) or runaway recursion.`,
          test_results: Array.from({ length: totalTestCases }, (_, i) => ({
            test_case_index: i,
            passed: false,
            status: 'time_limit_exceeded',
            inputs: [],
            expected: null,
            actual: null,
            error: `Time Limit Exceeded (> ${timeoutMs}ms)`,
            execution_time_ms: timeoutMs,
            description: `Test Case #${i + 1} timed out`,
          })),
          passed_count: 0,
          total_count: totalTestCases,
          all_passed: false,
        });
        return;
      }

      // 2. Process Crash / Runtime Error detection
      if (exitCode !== 0 && !stdout.includes('###BUG_BUSTERS_RESULT_START###')) {
        let errorType: 'RuntimeError' | 'CompilationError' = 'RuntimeError';
        let errorMsg = '';

        if (/compilation failed|error:\s+/i.test(stderr)) {
          errorType = 'CompilationError';
          errorMsg = `Compilation Error:\n${stderr.trim()}`;
        } else if (exitCode === 3221225477 || exitCode === -1073741819 || signal === 'SIGSEGV') {
          errorMsg = 'Runtime Error (SIGSEGV): Segmentation Fault / Access Violation. Code attempted to access invalid memory or dereference an invalid pointer/index.';
        } else if (exitCode === 3221225620 || exitCode === -1073741676 || signal === 'SIGFPE') {
          errorMsg = 'Runtime Error (SIGFPE): Arithmetic Exception / Integer division by zero occurred during execution.';
        } else if (exitCode === 3221225725 || exitCode === -1073741571) {
          errorMsg = 'Runtime Error (Stack Overflow): Exceeded maximum call stack size, typically caused by infinite recursion.';
        } else if (stderr.trim()) {
          errorMsg = `Runtime Error:\n${stderr.trim()}`;
        } else {
          errorMsg = `Runtime Error: Process terminated unexpectedly with exit code ${exitCode}.`;
        }

        resolve({
          success: false,
          error_type: errorType,
          logs: stdout.trim() ? [stdout.trim()] : [],
          error: errorMsg,
          test_results: Array.from({ length: totalTestCases }, (_, i) => ({
            test_case_index: i,
            passed: false,
            status: errorType === 'CompilationError' ? 'compilation_error' : 'runtime_error',
            inputs: [],
            expected: null,
            actual: null,
            error: errorMsg,
            execution_time_ms: 0,
            description: `Test Case #${i + 1} crash`,
          })),
          passed_count: 0,
          total_count: totalTestCases,
          all_passed: false,
        });
        return;
      }

      // 3. Normal execution output parsing
      try {
        const parts = stdout.split('###BUG_BUSTERS_RESULT_START###');
        const logsOutput = parts[0].trim();
        const jsonOutput = parts[1] ? parts[1].trim() : parts[0].trim();

        const parsed = JSON.parse(jsonOutput);
        const rawResults: TestCaseResult[] = parsed.test_results || [];

        let hasRuntimeError = false;
        let hasTLE = false;

        const enrichedResults: TestCaseResult[] = rawResults.map((r) => {
          let status: 'passed' | 'failed' | 'time_limit_exceeded' | 'runtime_error' = r.passed ? 'passed' : 'failed';
          if (r.error) {
            if (/time|timeout/i.test(r.error)) {
              status = 'time_limit_exceeded';
              hasTLE = true;
            } else {
              status = 'runtime_error';
              hasRuntimeError = true;
            }
          }
          return {
            ...r,
            status,
          };
        });

        const overallErrorType = hasTLE
          ? 'TimeLimitExceeded'
          : hasRuntimeError || parsed.error
          ? 'RuntimeError'
          : null;

        resolve({
          success: parsed.success !== false && !hasRuntimeError && !hasTLE,
          error_type: overallErrorType,
          logs: logsOutput ? logsOutput.split('\n') : [],
          error: parsed.error || (hasRuntimeError ? 'Runtime Error encountered during execution of one or more test cases.' : hasTLE ? 'Time Limit Exceeded during test execution.' : null),
          test_results: enrichedResults,
          passed_count: parsed.passed_count || 0,
          total_count: parsed.total_count || totalTestCases,
          all_passed: parsed.all_passed || false,
        });
      } catch {
        resolve({
          success: false,
          error_type: 'RuntimeError',
          logs: [stdout.trim()],
          error: stderr.trim() || 'Failed to parse execution output from runner.',
          test_results: [],
          passed_count: 0,
          total_count: totalTestCases,
          all_passed: false,
        });
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error_type: 'RuntimeError',
        logs: [],
        error: `Execution error: ${err.message}`,
        test_results: [],
        passed_count: 0,
        total_count: totalTestCases,
        all_passed: false,
      });
    });
  });
}
