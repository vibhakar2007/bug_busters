const fs = require('fs');
const path = require('path');

// 22 Conceptual Quiz Questions (No Code)
const quizQuestions = [
  {
    question_id: 4,
    question: "Which of the following data types is immutable in Python?",
    option_a: "List",
    option_b: "Dictionary",
    option_c: "Tuple",
    option_d: "Set",
    correct_option: "C",
    explanation: "Tuples in Python are immutable sequences; once created, their elements cannot be modified, added, or removed.",
    category: "quiz",
    difficulty: "easy",
    language: "Python",
    question_type: "quiz"
  },
  {
    question_id: 8,
    question: "Which keyword is used to create an anonymous function in Python?",
    option_a: "def",
    option_b: "lambda",
    option_c: "func",
    option_d: "anon",
    correct_option: "B",
    explanation: "The lambda keyword is used in Python to define small, anonymous, single-expression functions.",
    category: "quiz",
    difficulty: "easy",
    language: "Python",
    question_type: "quiz"
  },
  {
    question_id: 11,
    question: "Which statement correctly describes the 'is' operator in Python?",
    option_a: "Compares values for mathematical equality",
    option_b: "Checks if two variables refer to the exact same object in memory",
    option_c: "Converts data types automatically",
    option_d: "Checks whether a key exists in a dictionary",
    correct_option: "B",
    explanation: "The 'is' operator in Python checks identity — whether two references point to the same memory location (id(a) == id(b)).",
    category: "quiz",
    difficulty: "medium",
    language: "Python",
    question_type: "quiz"
  },
  {
    question_id: 13,
    question: "Which of these Python collections can contain duplicate elements?",
    option_a: "Set",
    option_b: "Dictionary Keys",
    option_c: "List",
    option_d: "Frozenset",
    correct_option: "C",
    explanation: "Lists are ordered collections that allow duplicate elements, unlike sets or dictionary keys.",
    category: "quiz",
    difficulty: "easy",
    language: "Python",
    question_type: "quiz"
  },
  {
    question_id: 15,
    question: "Which keyword is used to inherit a class in Java?",
    option_a: "implements",
    option_b: "extends",
    option_c: "inherits",
    option_d: "super",
    correct_option: "B",
    explanation: "In Java, the extends keyword is used by a child class to inherit fields and methods from a parent class.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 18,
    question: "Which of the following is NOT a Java primitive data type?",
    option_a: "int",
    option_b: "boolean",
    option_c: "String",
    option_d: "char",
    correct_option: "C",
    explanation: "String is a class and an object reference type in Java, not a primitive data type.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 20,
    question: "Which method is the main entry point of a Java standalone application?",
    option_a: "public void main(String[] args)",
    option_b: "public static void main(String[] args)",
    option_c: "public static int main(String[] args)",
    option_d: "void main()",
    correct_option: "B",
    explanation: "The JVM looks for the signature public static void main(String[] args) as the starting point of execution.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 21,
    question: "Which keyword prevents a method from being overridden in Java?",
    option_a: "static",
    option_b: "final",
    option_c: "const",
    option_d: "abstract",
    correct_option: "B",
    explanation: "Declaring a method as final prevents subclasses from overriding its implementation.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 22,
    question: "What is method overloading in Java?",
    option_a: "Multiple methods with same name but different parameters",
    option_b: "Multiple methods with same name and same parameters in subclasses",
    option_c: "Calling a method repeatedly in a loop",
    option_d: "Passing too many arguments to a method",
    correct_option: "A",
    explanation: "Method overloading occurs when two or more methods in the same class share the same name but have different parameter lists.",
    category: "quiz",
    difficulty: "medium",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 24,
    question: "Which concept allows Java to achieve multiple inheritance of type?",
    option_a: "Abstract Classes",
    option_b: "Interfaces",
    option_c: "Packages",
    option_d: "Enums",
    correct_option: "B",
    explanation: "Java does not support multiple inheritance with classes, but a class can implement multiple interfaces.",
    category: "quiz",
    difficulty: "medium",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 25,
    question: "What does the 'this' keyword refer to in Java?",
    option_a: "The parent class instance",
    option_b: "The current class instance",
    option_c: "The static context",
    option_d: "The JVM runtime",
    correct_option: "B",
    explanation: "'this' is a reference variable that refers to the current invoking object instance.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 26,
    question: "What is the primary purpose of a constructor in Java?",
    option_a: "To destroy unused objects",
    option_b: "To initialize object state and assign initial values",
    option_c: "To compile bytecode into machine code",
    option_d: "To handle unhandled exceptions",
    correct_option: "B",
    explanation: "Constructors are invoked when an object is instantiated to allocate memory and initialize its state.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 27,
    question: "Which runtime exception occurs when an integer is divided by zero in Java?",
    option_a: "NullPointerException",
    option_b: "ArithmeticException",
    option_c: "NumberFormatException",
    option_d: "IllegalArgumentException",
    correct_option: "B",
    explanation: "Integer division by zero in Java throws java.lang.ArithmeticException: / by zero.",
    category: "quiz",
    difficulty: "easy",
    language: "Java",
    question_type: "quiz"
  },
  {
    question_id: 29,
    question: "Which operator is used to obtain the address of a variable in C?",
    option_a: "*",
    option_b: "&",
    option_c: "->",
    option_d: "%",
    correct_option: "B",
    explanation: "The ampersand (&) is the address-of operator in C; it returns the memory address of its operand.",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 30,
    question: "What does a pointer variable store in C?",
    option_a: "A float value",
    option_b: "The memory address of another variable",
    option_c: "A character array",
    option_d: "The size of a data type",
    correct_option: "B",
    explanation: "A pointer is a variable whose value is the memory address of another variable.",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 32,
    question: "Which is the correct way to declare a pointer to an integer in C?",
    option_a: "int ptr*;",
    option_b: "int *ptr;",
    option_c: "pointer int ptr;",
    option_d: "&int ptr;",
    correct_option: "B",
    explanation: "int *ptr; declares ptr as a pointer to an integer in C.",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 34,
    question: "Which standard library function is used for dynamic memory allocation in C?",
    option_a: "alloc()",
    option_b: "malloc()",
    option_c: "new",
    option_d: "create()",
    correct_option: "B",
    explanation: "malloc() allocates a requested number of bytes in heap memory and returns a void pointer to it.",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 35,
    question: "What does the sizeof operator return in C?",
    option_a: "The number of bits in an integer",
    option_b: "The size of a data type or object in bytes",
    option_c: "The memory address of an object",
    option_d: "The number of characters in a string",
    correct_option: "B",
    explanation: "The sizeof compile-time operator yields the storage size of its operand in bytes (type size_t).",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 37,
    question: "Which operator is used to access a structure member through a pointer in C?",
    option_a: ".",
    option_b: "->",
    option_c: "::",
    option_d: "&",
    correct_option: "B",
    explanation: "The arrow operator (->) dereferences a structure pointer and accesses a member field.",
    category: "quiz",
    difficulty: "easy",
    language: "C",
    question_type: "quiz"
  },
  {
    question_id: 38,
    question: "Which language among Python, Java, and C uses manual memory management with functions like free()?",
    option_a: "Python",
    option_b: "Java",
    option_c: "C",
    option_d: "Both Java and Python",
    correct_option: "C",
    explanation: "C relies on manual heap memory management using malloc() and free(), whereas Java and Python have automatic garbage collection.",
    category: "quiz",
    difficulty: "easy",
    language: "General",
    question_type: "quiz"
  },
  {
    question_id: 39,
    question: "Which statement is correct regarding compiled vs interpreted languages?",
    option_a: "Python is directly compiled to native x86 machine code by default",
    option_b: "Java source code is compiled to platform-independent bytecode executed by the JVM",
    option_c: "C code runs inside a virtual machine runtime",
    option_d: "Java and C do not require a compiler",
    correct_option: "B",
    explanation: "javac compiles Java source into bytecode (.class), which is executed by the Java Virtual Machine (JVM).",
    category: "quiz",
    difficulty: "medium",
    language: "General",
    question_type: "quiz"
  },
  {
    question_id: 40,
    question: "Consider computer programming paradigms. Which combination is correctly matched?",
    option_a: "C - Pure Object Oriented, Java - Assembly Only",
    option_b: "Java - Object Oriented, C - Procedural / Imperative",
    option_c: "Python - Cannot define functions, C - Pure Functional",
    option_d: "Python - Strictly compiled to native machine binaries",
    correct_option: "B",
    explanation: "Java is an object-oriented programming language, while C is a procedural/imperative language.",
    category: "quiz",
    difficulty: "easy",
    language: "General",
    question_type: "quiz"
  }
];

// 18 Parallel Debugging Concepts with exact matching Python, Java, and C implementations
const debugConcepts = [
  {
    concept_id: "debug_int_div",
    pyId: 1, javaId: 101, cId: 201,
    question: "What is the output of the following code snippet?",
    pySnippet: "a = 10\nb = 3\nprint(a // b)",
    javaSnippet: "int a = 10;\nint b = 3;\nSystem.out.println(a / b);",
    cSnippet: "int a = 10, b = 3;\nprintf(\"%d\", a / b);",
    option_a: "3", option_b: "3.33", option_c: "4", option_d: "0",
    correct_option: "A",
    explanation: "Integer division discards the fractional part, resulting in 3."
  },
  {
    concept_id: "debug_mod",
    pyId: 2, javaId: 102, cId: 202,
    question: "What is the output of the following code snippet?",
    pySnippet: "a = 17\nb = 5\nprint(a % b)",
    javaSnippet: "int a = 17;\nint b = 5;\nSystem.out.println(a % b);",
    cSnippet: "int a = 17, b = 5;\nprintf(\"%d\", a % b);",
    option_a: "2", option_b: "3", option_c: "1", option_d: "5",
    correct_option: "A",
    explanation: "17 divided by 5 is 3 with a remainder of 2."
  },
  {
    concept_id: "debug_op_prec",
    pyId: 3, javaId: 103, cId: 203,
    question: "What is the output of the following code snippet?",
    pySnippet: "x = 5 + 3 * 2\nprint(x)",
    javaSnippet: "int x = 5 + 3 * 2;\nSystem.out.println(x);",
    cSnippet: "int x = 5 + 3 * 2;\nprintf(\"%d\", x);",
    option_a: "16", option_b: "11", option_c: "13", option_d: "10",
    correct_option: "B",
    explanation: "Multiplication precedes addition: 3 * 2 = 6, then 5 + 6 = 11."
  },
  {
    concept_id: "debug_if_else",
    pyId: 5, javaId: 105, cId: 205,
    question: "What is the output of the following code snippet?",
    pySnippet: "x = 12\nif x > 10:\n    print(\"Pass\")\nelse:\n    print(\"Fail\")",
    javaSnippet: "int x = 12;\nif (x > 10) {\n    System.out.println(\"Pass\");\n} else {\n    System.out.println(\"Fail\");\n}",
    cSnippet: "int x = 12;\nif (x > 10)\n    printf(\"Pass\");\nelse\n    printf(\"Fail\");",
    option_a: "Pass", option_b: "Fail", option_c: "Error", option_d: "None",
    correct_option: "A",
    explanation: "Since 12 is greater than 10, the if branch executes, printing 'Pass'."
  },
  {
    concept_id: "debug_loop_sum",
    pyId: 6, javaId: 106, cId: 206,
    question: "What is the output of the following code snippet?",
    pySnippet: "total = 0\nfor i in [1, 2, 3]:\n    total += i\nprint(total)",
    javaSnippet: "int total = 0;\nfor (int i = 1; i <= 3; i++) {\n    total += i;\n}\nSystem.out.println(total);",
    cSnippet: "int total = 0;\nfor (int i = 1; i <= 3; i++) {\n    total += i;\n}\nprintf(\"%d\", total);",
    option_a: "6", option_b: "3", option_c: "5", option_d: "0",
    correct_option: "A",
    explanation: "The loop sums the integers 1 + 2 + 3 = 6."
  },
  {
    concept_id: "debug_ternary",
    pyId: 7, javaId: 107, cId: 207,
    question: "What is the output of the following code snippet?",
    pySnippet: "a = 25\nb = 40\nm = a if a > b else b\nprint(m)",
    javaSnippet: "int a = 25, b = 40;\nint m = (a > b) ? a : b;\nSystem.out.println(m);",
    cSnippet: "int a = 25, b = 40;\nint m = (a > b) ? a : b;\nprintf(\"%d\", m);",
    option_a: "25", option_b: "40", option_c: "65", option_d: "15",
    correct_option: "B",
    explanation: "Since 25 > 40 is false, the conditional evaluates to 40."
  },
  {
    concept_id: "debug_array_index",
    pyId: 9, javaId: 109, cId: 209,
    question: "What is the output of the following code snippet?",
    pySnippet: "nums = [10, 20, 30]\nprint(nums[0] + nums[2])",
    javaSnippet: "int[] nums = {10, 20, 30};\nSystem.out.println(nums[0] + nums[2]);",
    cSnippet: "int nums[] = {10, 20, 30};\nprintf(\"%d\", nums[0] + nums[2]);",
    option_a: "30", option_b: "40", option_c: "50", option_d: "20",
    correct_option: "B",
    explanation: "nums[0] is 10 and nums[2] is 30. 10 + 30 = 40."
  },
  {
    concept_id: "debug_func_double",
    pyId: 10, javaId: 110, cId: 210,
    question: "What is the output of the following code snippet?",
    pySnippet: "def double_val(n):\n    return n * 2\n\nprint(double_val(7))",
    javaSnippet: "static int doubleVal(int n) {\n    return n * 2;\n}\n// in main:\nSystem.out.println(doubleVal(7));",
    cSnippet: "int double_val(int n) {\n    return n * 2;\n}\n// in main:\nprintf(\"%d\", double_val(7));",
    option_a: "14", option_b: "7", option_c: "9", option_d: "21",
    correct_option: "A",
    explanation: "Passing 7 to the function multiplies it by 2, returning 14."
  },
  {
    concept_id: "debug_str_concat",
    pyId: 12, javaId: 112, cId: 212,
    question: "What is the output of the following code snippet?",
    pySnippet: "a = \"Bug\"\nb = \"Busters\"\nprint(a + b)",
    javaSnippet: "String a = \"Bug\";\nString b = \"Busters\";\nSystem.out.println(a + b);",
    cSnippet: "char a[] = \"Bug\";\nchar b[] = \"Busters\";\nprintf(\"%s%s\", a, b);",
    option_a: "Bug Busters", option_b: "BugBusters", option_c: "Bug", option_d: "Error",
    correct_option: "B",
    explanation: "Direct concatenation of 'Bug' and 'Busters' produces 'BugBusters'."
  },
  {
    concept_id: "debug_logical_and",
    pyId: 14, javaId: 114, cId: 214,
    question: "What is the output of the following code snippet?",
    pySnippet: "res = (5 > 2) and (3 > 7)\nprint(res)",
    javaSnippet: "boolean res = (5 > 2) && (3 > 7);\nSystem.out.println(res);",
    cSnippet: "int res = (5 > 2) && (3 > 7);\nprintf(\"%d\", res);",
    option_a: "False (0)", option_b: "True (1)", option_c: "None", option_d: "Error",
    correct_option: "A",
    explanation: "5 > 2 is true, but 3 > 7 is false. true AND false evaluates to false."
  },
  {
    concept_id: "debug_nested_loop",
    pyId: 16, javaId: 116, cId: 216,
    question: "What is the output of the following code snippet?",
    pySnippet: "c = 0\nfor i in range(2):\n    for j in range(3):\n        c += 1\nprint(c)",
    javaSnippet: "int c = 0;\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        c++;\n    }\n}\nSystem.out.println(c);",
    cSnippet: "int c = 0;\nfor (int i = 0; i < 2; i++) {\n    for (int j = 0; j < 3; j++) {\n        c++;\n    }\n}\nprintf(\"%d\", c);",
    option_a: "5", option_b: "6", option_c: "4", option_d: "2",
    correct_option: "B",
    explanation: "The inner statement runs 2 * 3 = 6 times."
  },
  {
    concept_id: "debug_bitwise_and",
    pyId: 17, javaId: 117, cId: 217,
    question: "What is the output of the following code snippet?",
    pySnippet: "print(6 & 3)",
    javaSnippet: "System.out.println(6 & 3);",
    cSnippet: "printf(\"%d\", 6 & 3);",
    option_a: "2", option_b: "3", option_c: "6", option_d: "7",
    correct_option: "A",
    explanation: "6 (binary 110) AND 3 (binary 011) evaluates to binary 010 (decimal 2)."
  },
  {
    concept_id: "debug_while_down",
    pyId: 19, javaId: 119, cId: 219,
    question: "What is the output of the following code snippet?",
    pySnippet: "n = 3\nwhile n > 0:\n    n -= 1\nprint(n)",
    javaSnippet: "int n = 3;\nwhile (n > 0) {\n    n--;\n}\nSystem.out.println(n);",
    cSnippet: "int n = 3;\nwhile (n > 0) {\n    n--;\n}\nprintf(\"%d\", n);",
    option_a: "0", option_b: "1", option_c: "3", option_d: "-1",
    correct_option: "A",
    explanation: "The while loop decrements n until n becomes 0 and exits."
  },
  {
    concept_id: "debug_array_len",
    pyId: 23, javaId: 123, cId: 223,
    question: "What is the output of the following code snippet?",
    pySnippet: "items = [5, 10, 15, 20]\nprint(len(items))",
    javaSnippet: "int[] items = {5, 10, 15, 20};\nSystem.out.println(items.length);",
    cSnippet: "int items[] = {5, 10, 15, 20};\nprintf(\"%d\", (int)(sizeof(items) / sizeof(items[0])));",
    option_a: "3", option_b: "4", option_c: "5", option_d: "20",
    correct_option: "B",
    explanation: "The collection contains exactly 4 elements."
  },
  {
    concept_id: "debug_even_odd",
    pyId: 28, javaId: 128, cId: 228,
    question: "What is the output of the following code snippet?",
    pySnippet: "n = 8\nprint(\"Even\" if n % 2 == 0 else \"Odd\")",
    javaSnippet: "int n = 8;\nSystem.out.println((n % 2 == 0) ? \"Even\" : \"Odd\");",
    cSnippet: "int n = 8;\nprintf(\"%s\", (n % 2 == 0) ? \"Even\" : \"Odd\");",
    option_a: "Even", option_b: "Odd", option_c: "0", option_d: "Error",
    correct_option: "A",
    explanation: "8 % 2 is 0, satisfying the condition to print 'Even'."
  },
  {
    concept_id: "debug_reassign",
    pyId: 31, javaId: 131, cId: 231,
    question: "What is the output of the following code snippet?",
    pySnippet: "x = 10\nx = x + 5\nx = x * 2\nprint(x)",
    javaSnippet: "int x = 10;\nx = x + 5;\nx = x * 2;\nSystem.out.println(x);",
    cSnippet: "int x = 10;\nx = x + 5;\nx = x * 2;\nprintf(\"%d\", x);",
    option_a: "20", option_b: "25", option_c: "30", option_d: "15",
    correct_option: "C",
    explanation: "10 + 5 is 15, then 15 * 2 becomes 30."
  },
  {
    concept_id: "debug_diff",
    pyId: 33, javaId: 133, cId: 233,
    question: "What is the output of the following code snippet?",
    pySnippet: "a = 15\nb = 20\nprint(b - a)",
    javaSnippet: "int a = 15, b = 20;\nSystem.out.println(b - a);",
    cSnippet: "int a = 15, b = 20;\nprintf(\"%d\", b - a);",
    option_a: "5", option_b: "-5", option_c: "0", option_d: "35",
    correct_option: "A",
    explanation: "20 - 15 evaluates to 5."
  },
  {
    concept_id: "debug_square",
    pyId: 36, javaId: 136, cId: 236,
    question: "What is the output of the following code snippet?",
    pySnippet: "n = 4\nprint(n * n)",
    javaSnippet: "int n = 4;\nSystem.out.println(n * n);",
    cSnippet: "int n = 4;\nprintf(\"%d\", n * n);",
    option_a: "8", option_b: "16", option_c: "12", option_d: "4",
    correct_option: "B",
    explanation: "4 multiplied by 4 is 16."
  }
];

// Generate full question bank
const fullQuestionBank = [...quizQuestions];

// For each debug concept, create Python, Java, and C variants
debugConcepts.forEach((c) => {
  // Python Variant
  fullQuestionBank.push({
    question_id: c.pyId,
    concept_id: c.concept_id,
    question: c.question,
    code_snippet: c.pySnippet,
    option_a: c.option_a,
    option_b: c.option_b,
    option_c: c.option_c,
    option_d: c.option_d,
    correct_option: c.correct_option,
    explanation: c.explanation,
    category: "debugging",
    difficulty: "easy",
    language: "Python",
    question_type: "debug"
  });

  // Java Variant
  fullQuestionBank.push({
    question_id: c.javaId,
    concept_id: c.concept_id,
    question: c.question,
    code_snippet: c.javaSnippet,
    option_a: c.option_a,
    option_b: c.option_b,
    option_c: c.option_c,
    option_d: c.option_d,
    correct_option: c.correct_option,
    explanation: c.explanation,
    category: "debugging",
    difficulty: "easy",
    language: "Java",
    question_type: "debug"
  });

  // C Variant
  fullQuestionBank.push({
    question_id: c.cId,
    concept_id: c.concept_id,
    question: c.question,
    code_snippet: c.cSnippet,
    option_a: c.option_a,
    option_b: c.option_b,
    option_c: c.option_c,
    option_d: c.option_d,
    correct_option: c.correct_option,
    explanation: c.explanation,
    category: "debugging",
    difficulty: "easy",
    language: "C",
    question_type: "debug"
  });
});

// Sort by question_id
fullQuestionBank.sort((a, b) => a.question_id - b.question_id);

const jsonStr = JSON.stringify(fullQuestionBank, null, 2);
fs.writeFileSync(path.join(process.cwd(), 'data', 'questions.json'), jsonStr, 'utf8');
fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'questions.json'), jsonStr, 'utf8');

console.log(`Successfully generated ${fullQuestionBank.length} questions.`);
