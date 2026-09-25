export type HandsOnLanguage = 'python' | 'javascript' | 'java' | 'c' | 'cpp';

export type TestCaseStatus =
  | 'passed'
  | 'failed'
  | 'time_limit_exceeded'
  | 'runtime_error'
  | 'compilation_error';

export type ExecutionErrorType =
  | 'TimeLimitExceeded'
  | 'RuntimeError'
  | 'CompilationError'
  | 'SecurityViolation'
  | null;

export interface HandsOnTestCase {
  inputs: unknown[];
  expected: unknown;
  description: string;
}

export interface HandsOnDebugQuestion {
  id: number;
  title: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  description: string;
  function_name: string;
  function_name_python: string;
  function_name_java?: string;
  function_name_c?: string;
  function_name_cpp?: string;
  language: string;
  initial_code: string;
  initial_code_python: string;
  initial_code_java?: string;
  initial_code_c?: string;
  initial_code_cpp?: string;
  solution_code: string;
  solution_code_python: string;
  solution_code_java?: string;
  solution_code_c?: string;
  solution_code_cpp?: string;
  test_cases: HandsOnTestCase[];
  hints: string[];
}

export interface TestCaseResult {
  test_case_index: number;
  passed: boolean;
  status?: TestCaseStatus;
  inputs: unknown[];
  expected: unknown;
  actual: unknown;
  error?: string;
  execution_time_ms: number;
  description: string;
}

export interface ExecutionOutcome {
  success: boolean;
  error_type?: ExecutionErrorType;
  logs: string[];
  error: string | null;
  test_results: TestCaseResult[];
  passed_count: number;
  total_count: number;
  all_passed: boolean;
}

export interface HandsOnSubmission {
  question_id: number;
  code: string;
  language: HandsOnLanguage;
  passed_test_cases: number;
  total_test_cases: number;
  is_solved: boolean;
  submitted_at: string;
}

export interface HandsOnSessionState {
  currentQuestionIndex: number;
  codes: Record<number, string>; // questionId -> user edited code
  selectedLanguages: Record<number, HandsOnLanguage>;
  submissions: Record<number, HandsOnSubmission>;
  isCompleted: boolean;
  completedAt?: string;
}
