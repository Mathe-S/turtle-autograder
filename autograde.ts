import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { SimpleTurtle, Point, Color } from "./instructor/src/turtle";

/**
 * Type definitions for grading results
 */
interface StudentResult {
  studentId: string;
  implementationTests: {
    overall: boolean;
    details: {
      [testName: string]: boolean;
    };
    errors?: string;
  };
  studentTests: {
    overall: boolean;
    details: {
      [testName: string]: boolean;
    };
    errors?: string;
  };
  personalArt: {
    pathData: { start: Point; end: Point; color: Color }[];
    error?: string;
  };
}

interface GradingReport {
  timestamp: string;
  students: StudentResult[];
  summary: {
    totalStudents: number;
    passedImplementationTests: number;
    passedStudentTests: number;
    personalArtGenerationSuccess: number;
  };
}

/**
 * Import necessary functions from the instructor's turtlesoup.ts
 */
// Helper function to dynamically import functions from the instructor's implementation
async function importInstructorFunctions(): Promise<{
  generateHTML: (
    pathData: { start: Point; end: Point; color: Color }[]
  ) => string;
  saveHTMLToFile: (html: string, filename?: string) => void;
  openHTML: (filename?: string) => void;
  drawPersonalArt?: (turtle: SimpleTurtle) => void;
}> {
  // We need to import these functions to use in our grading
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {
      generateHTML,
      saveHTMLToFile,
      openHTML,
      drawPersonalArt,
    } = require("./instructor/src/turtlesoup");
    return { generateHTML, saveHTMLToFile, openHTML, drawPersonalArt };
  } catch (error) {
    console.error("Error importing instructor functions:", error);
    throw error;
  }
}

/**
 * Discovers all student submission directories
 * @param submissionsDir The base directory containing student submissions
 * @returns Array of student directory names
 */
function discoverStudentSubmissions(submissionsDir: string): string[] {
  try {
    const studentDirs = fs
      .readdirSync(submissionsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    console.log(
      `Found ${studentDirs.length} student submissions: ${studentDirs.join(
        ", "
      )}`
    );
    return studentDirs;
  } catch (error) {
    console.error("Error discovering student submissions:", error);
    return [];
  }
}

/**
 * Copy instructor files to a target directory
 * @param targetDir The directory to copy files to
 * @param files Array of files to copy
 */
function copyFiles(
  sourceDir: string,
  targetDir: string,
  files: string[]
): void {
  try {
    for (const file of files) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);

      if (fs.existsSync(sourcePath)) {
        const content = fs.readFileSync(sourcePath, "utf-8");
        fs.writeFileSync(targetPath, content);
        console.log(`Copied ${sourcePath} to ${targetPath}`);
      } else {
        console.error(`Source file ${sourcePath} does not exist`);
      }
    }
  } catch (error) {
    console.error("Error copying files:", error);
    throw error;
  }
}

/**
 * Run Mocha tests programmatically with a specific turtlesoup implementation
 * @param studentDir The student's directory
 * @param useInstructorTests Whether to use instructor tests or student tests
 * @returns Test results with pass/fail status
 */
function runTests(
  studentDir: string,
  useInstructorTests: boolean
): {
  overall: boolean;
  details: { [testName: string]: boolean };
  errors?: string;
} {
  // Prepare the environment for testing
  const tmpTestDir = path.join(studentDir, "tmp_test");

  try {
    // Create temporary test directory
    if (!fs.existsSync(tmpTestDir)) {
      fs.mkdirSync(tmpTestDir);
    }

    // Copy necessary files
    if (useInstructorTests) {
      // Test student implementation against instructor tests
      fs.copyFileSync(
        path.join("instructor/src", "turtle.ts"),
        path.join(tmpTestDir, "turtle.ts")
      );
      fs.copyFileSync(
        path.join(studentDir, "src", "turtlesoup.ts"),
        path.join(tmpTestDir, "turtlesoup.ts")
      );
      fs.copyFileSync(
        path.join("instructor/test", "turtlesoupTest.ts"),
        path.join(tmpTestDir, "turtlesoupTest.ts")
      );

      // Fix imports in the test file
      let testContent = fs.readFileSync(
        path.join(tmpTestDir, "turtlesoupTest.ts"),
        "utf-8"
      );
      testContent = testContent.replace(
        /from "\.\.\/src\/turtlesoup"/g,
        'from "./turtlesoup"'
      );
      testContent = testContent.replace(
        /from "\.\.\/src\/turtle"/g,
        'from "./turtle"'
      );
      fs.writeFileSync(path.join(tmpTestDir, "turtlesoupTest.ts"), testContent);
    } else {
      // Test instructor implementation against student tests
      fs.copyFileSync(
        path.join("instructor/src", "turtle.ts"),
        path.join(tmpTestDir, "turtle.ts")
      );
      fs.copyFileSync(
        path.join("instructor/src", "turtlesoup.ts"),
        path.join(tmpTestDir, "turtlesoup.ts")
      );
      fs.copyFileSync(
        path.join(studentDir, "test", "turtlesoupTest.ts"),
        path.join(tmpTestDir, "turtlesoupTest.ts")
      );

      // Fix imports in the test file
      let testContent = fs.readFileSync(
        path.join(tmpTestDir, "turtlesoupTest.ts"),
        "utf-8"
      );
      testContent = testContent.replace(
        /from "\.\/turtlesoup"/g,
        'from "./turtlesoup"'
      );
      testContent = testContent.replace(
        /from "\.\/turtle"/g,
        'from "./turtle"'
      );
      fs.writeFileSync(path.join(tmpTestDir, "turtlesoupTest.ts"), testContent);
    }

    // Run the tests and capture output
    const cmd = `cd ${tmpTestDir} && npx mocha -r ts-node/register turtlesoupTest.ts --reporter json`;
    const output = execSync(cmd, { encoding: "utf-8" });

    // Parse the JSON output from Mocha
    const results = JSON.parse(output);
    const testResults: { [testName: string]: boolean } = {};
    let allPassed = true;

    // Process test results
    for (const test of results.passes) {
      const testTitle = test.fullTitle;
      testResults[testTitle] = true;
    }

    for (const test of results.failures) {
      const testTitle = test.fullTitle;
      testResults[testTitle] = false;
      allPassed = false;
    }

    // Clean up
    fs.rmSync(tmpTestDir, { recursive: true, force: true });

    return {
      overall: allPassed,
      details: testResults,
    };
  } catch (error) {
    console.error(`Error running tests for ${studentDir}:`, error);

    // Try to clean up if possible
    if (fs.existsSync(tmpTestDir)) {
      try {
        fs.rmSync(tmpTestDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Error cleaning up temporary test directory:", e);
      }
    }

    return {
      overall: false,
      details: {},
      errors: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Execute student's drawPersonalArt function and collect path data
 * @param studentDir The student's directory
 * @returns Path data from the turtle after drawing
 */
function collectPersonalArt(studentDir: string): {
  pathData: { start: Point; end: Point; color: Color }[];
  error?: string;
} {
  const tmpArtDir = path.join(studentDir, "tmp_art");

  try {
    // Create temporary directory
    if (!fs.existsSync(tmpArtDir)) {
      fs.mkdirSync(tmpArtDir);
    }

    // Copy necessary files
    fs.copyFileSync(
      path.join("instructor/src", "turtle.ts"),
      path.join(tmpArtDir, "turtle.ts")
    );
    fs.copyFileSync(
      path.join(studentDir, "src", "turtlesoup.ts"),
      path.join(tmpArtDir, "turtlesoup.ts")
    );

    // Create a wrapper script that will execute drawPersonalArt and extract the path
    const wrapperContent = `
      import { SimpleTurtle } from './turtle';
      import { drawPersonalArt } from './turtlesoup';
      import * as fs from 'fs';

      // Create turtle, execute art function, and save the path
      (function() {
        try {
          const turtle = new SimpleTurtle();
          drawPersonalArt(turtle);
          const pathData = JSON.stringify(turtle.getPath());
          fs.writeFileSync('path.json', pathData);
          console.log('Art generation successful');
        } catch (error) {
          console.error('Error generating art:', error);
          process.exit(1);
        }
      })();
    `;

    fs.writeFileSync(path.join(tmpArtDir, "wrapper.ts"), wrapperContent);

    // Execute the wrapper
    execSync(`cd ${tmpArtDir} && npx ts-node wrapper.ts`, {
      encoding: "utf-8",
    });

    // Read the path data
    const pathData = JSON.parse(
      fs.readFileSync(path.join(tmpArtDir, "path.json"), "utf-8")
    );

    // Clean up
    fs.rmSync(tmpArtDir, { recursive: true, force: true });

    return { pathData };
  } catch (error) {
    console.error(`Error collecting personal art for ${studentDir}:`, error);

    // Try to clean up if possible
    if (fs.existsSync(tmpArtDir)) {
      try {
        fs.rmSync(tmpArtDir, { recursive: true, force: true });
      } catch (e) {
        console.error("Error cleaning up temporary art directory:", e);
      }
    }

    return {
      pathData: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main autograder function
 */
async function runAutograder(): Promise<void> {
  console.log("Starting PS0 autograder...");

  // Import instructor functions
  const { generateHTML, saveHTMLToFile, openHTML } =
    await importInstructorFunctions();

  // Discover student submissions
  const submissionsDir = path.join(process.cwd(), "Submissions_auto");
  const students = discoverStudentSubmissions(submissionsDir);

  // Prepare the grading report
  const gradingReport: GradingReport = {
    timestamp: new Date().toISOString(),
    students: [],
    summary: {
      totalStudents: students.length,
      passedImplementationTests: 0,
      passedStudentTests: 0,
      personalArtGenerationSuccess: 0,
    },
  };

  // Process each student
  for (const studentId of students) {
    console.log(`\nProcessing student: ${studentId}`);
    const studentDir = path.join(submissionsDir, studentId);

    // Initialize student result
    const studentResult: StudentResult = {
      studentId,
      implementationTests: {
        overall: false,
        details: {},
      },
      studentTests: {
        overall: false,
        details: {},
      },
      personalArt: {
        pathData: [],
      },
    };

    // Step 1: Test student implementation against instructor tests
    console.log(
      `Running instructor tests against ${studentId}'s implementation...`
    );
    studentResult.implementationTests = runTests(studentDir, true);

    if (studentResult.implementationTests.overall) {
      gradingReport.summary.passedImplementationTests++;
    }

    // Step 2: Test instructor implementation against student tests
    console.log(
      `Running ${studentId}'s tests against instructor implementation...`
    );
    studentResult.studentTests = runTests(studentDir, false);

    if (studentResult.studentTests.overall) {
      gradingReport.summary.passedStudentTests++;
    }

    // Step 3: Collect personal art
    console.log(`Collecting personal art from ${studentId}...`);
    studentResult.personalArt = collectPersonalArt(studentDir);

    if (!studentResult.personalArt.error) {
      gradingReport.summary.personalArtGenerationSuccess++;
    }

    // Add student result to the report
    gradingReport.students.push(studentResult);
  }

  // Generate grid layout of student art
  console.log("\nGenerating grid layout visualization of student art...");

  // Configuration for the grid layout
  const canvasWidth = 400; // Increased individual canvas width
  const canvasHeight = 400; // Increased individual canvas height
  const padding = 20; // Padding between canvases
  const studentsPerRow = 5; // Set to 5 students per row
  const labelHeight = 30; // Height for student ID label

  // Calculate the full grid dimensions
  const totalRows = Math.ceil(gradingReport.students.length / studentsPerRow);
  const fullWidth = studentsPerRow * (canvasWidth + padding) + padding;
  const fullHeight =
    totalRows * (canvasHeight + labelHeight + padding) + padding;

  // Generate SVG elements for each student
  let svgElements = "";
  let validStudentIndex = 0; // Separate index for students with valid art

  gradingReport.students.forEach((student) => {
    // Check for errors in personal art
    if (student.personalArt.error) {
      console.log(`Skipping ${student.studentId} due to art generation error.`);
      return; // Skip this student if there's an error
    }

    // Calculate position in the grid using validStudentIndex
    const row = Math.floor(validStudentIndex / studentsPerRow);
    const col = validStudentIndex % studentsPerRow;

    const xOffset = padding + col * (canvasWidth + padding);
    const yOffset = padding + row * (canvasHeight + labelHeight + padding);

    // Add student ID label
    svgElements += `
      <text 
        x="${xOffset + canvasWidth / 2}" 
        y="${yOffset + labelHeight / 2}" 
        text-anchor="middle" 
        dominant-baseline="middle" 
        font-family="Arial" 
        font-size="14" 
        font-weight="bold"
      >
        ${student.studentId}
      </text>
    `;

    // Create background for the canvas
    svgElements += `
      <rect 
        x="${xOffset}" 
        y="${yOffset + labelHeight}" 
        width="${canvasWidth}" 
        height="${canvasHeight}" 
        fill="#f0f0f0" 
        stroke="#ccc" 
        stroke-width="1"
      />
    `;

    // Add the student's art paths
    student.personalArt.pathData.forEach((segment) => {
      // Scale and center the paths within each canvas
      const x1 = segment.start.x + canvasWidth / 2;
      const y1 = segment.start.y + canvasHeight / 2 + labelHeight;
      const x2 = segment.end.x + canvasWidth / 2;
      const y2 = segment.end.y + canvasHeight / 2 + labelHeight;

      svgElements += `
        <line 
          x1="${xOffset + x1}" 
          y1="${yOffset + y1}" 
          x2="${xOffset + x2}" 
          y2="${yOffset + y2}" 
          stroke="${segment.color}" 
          stroke-width="2"
        />
      `;
    });

    validStudentIndex++; // Increment the valid student index
  });

  // Create the HTML with SVG grid
  const gridHTML = `<!DOCTYPE html>
  <html>
  <head>
      <title>Student Art Gallery</title>
      <style>
          body { margin: 0; font-family: Arial, sans-serif; }
          h1 { text-align: center; margin: 20px 0; }
          .container { display: flex; justify-content: center; }
      </style>
  </head>
  <body>
      <h1>Student Art Gallery</h1>
      <div class="container">
        <svg width="${fullWidth}" height="${fullHeight}">
          ${svgElements}
        </svg>
      </div>
  </body>
  </html>`;

  saveHTMLToFile(gridHTML, "student_art_gallery.html");

  // Save grading report
  const reportPath = path.join(process.cwd(), "grading_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(gradingReport, null, 2));
  console.log(`Grading report saved to ${reportPath}`);

  // Print summary
  console.log("\nGrading Summary:");
  console.log(`Total Students: ${gradingReport.summary.totalStudents}`);
  console.log(
    `Passed Instructor Tests: ${gradingReport.summary.passedImplementationTests}/${gradingReport.summary.totalStudents}`
  );
  console.log(
    `Passed Own Tests: ${gradingReport.summary.passedStudentTests}/${gradingReport.summary.totalStudents}`
  );
  console.log(
    `Successful Art Generation: ${gradingReport.summary.personalArtGenerationSuccess}/${gradingReport.summary.totalStudents}`
  );

  // Open the grid art visualization
  console.log("\nOpening student art gallery visualization...");
  openHTML("student_art_gallery.html");
}

// Run the autograder if this file is executed directly
if (require.main === module) {
  runAutograder().catch((error) => {
    console.error("Error running autograder:", error);
    process.exit(1);
  });
}
