# PS0 Autograder

An automated grading system for MIT 6.102 Problem Set 0 (Turtle Soup).

## Overview

This autograder evaluates student submissions for PS0 by:

1. Testing student implementations against instructor tests
2. Testing instructor implementation against student tests
3. Aggregating personal art from all students
4. Generating detailed reports

## Directory Structure

```
PS0-autograder/
├── instructor/                 # Instructor's canonical files
│   ├── turtle.ts              # Turtle interface definition
│   ├── turtlesoup.ts          # Reference implementation
│   └── turtlesoupTest.ts      # Official test suite
├── submissions/               # Student submissions
│   ├── student1/              # Each student's work
│   │   ├── turtle.ts
│   │   ├── turtlesoup.ts
│   │   └── turtlesoupTest.ts
│   └── student2/
│       ├── turtle.ts
│       ├── turtlesoup.ts
│       └── turtlesoupTest.ts
├── autograde.ts               # Main autograder script
├── combined_art.html          # Generated combined art visualization
├── grading_report.json        # Detailed grading results
├── package.json               # Project dependencies
└── tsconfig.json              # TypeScript configuration
```

## How It Works

The autograder script (`autograde.ts`) performs the following tasks:

1. **Discovers Student Submissions**: Scans the `submissions/` directory for student submissions.

2. **Tests Student Implementations**: For each student:

   - Copies the instructor's `turtlesoupTest.ts` and `turtle.ts` to a temporary directory
   - Runs the instructor's tests against the student's implementation
   - Records pass/fail results for each test

3. **Tests Student Tests**: For each student:

   - Copies the instructor's `turtlesoup.ts` and `turtle.ts` to a temporary directory
   - Runs the student's tests against the instructor's implementation
   - Records if student tests pass with the correct implementation

4. **Aggregates Personal Art**:

   - Executes each student's `drawPersonalArt` function
   - Collects the path data generated by each student
   - Combines all art onto a single canvas with appropriate offsets

5. **Generates Reports**:
   - Creates a detailed JSON report with test results for each student
   - Provides a summary of overall performance
   - Generates a combined HTML visualization of all student art

## Usage

1. Install dependencies:

   ```
   npm install
   ```

2. Run the autograder:

   ```
   npm run autograde
   ```

3. Review the generated reports:
   - `grading_report.json`: Detailed test results
   - `combined_art.html`: Visual representation of all student art

## Requirements

- Node.js
- npm or yarn
- TypeScript
- Mocha and Chai for testing

## Dependencies

- ts-node: For executing TypeScript directly
- mocha: Test framework
- chai: Assertion library
- TypeScript: For static type checking
