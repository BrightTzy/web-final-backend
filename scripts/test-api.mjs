// next-backend/scripts/test-api.mjs

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let teacherToken = "";
let studentToken = "";
let student2Token = "";
let createdCourseId = "";
let openCourseId = "";
let closeCourseId = "";
let enrolledCourseId = "";

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log(`Starting API Tests against ${BASE_URL}...\n`);

  // 1. Unauthenticated request to protected route
  console.log("Test 1: Unauthenticated request to /api/course");
  const unauthRes = await fetch(`${BASE_URL}/api/course`);
  assert(unauthRes.status === 401, "Unauthenticated request rejected with 401");

  // 2. Login as Teacher 1
  console.log("\nTest 2: Teacher login");
  const tLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "teacher1@au.edu", password: "password123" }),
  });
  const tLoginData = await tLoginRes.json();
  assert(tLoginRes.status === 200, "Teacher login status 200");
  assert(tLoginData.user?.role === "Teacher", "User role is Teacher");
  teacherToken = tLoginData.token;

  // 3. GET /api/me as Teacher
  console.log("\nTest 3: Verify /api/me for Teacher");
  const meRes = await fetch(`${BASE_URL}/api/me`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const meData = await meRes.json();
  assert(meRes.status === 200, "/api/me returns 200");
  assert(meData.user?.username === "teacher1", "Verified teacher1 identity");

  // 4. Teacher views own course list
  console.log("\nTest 4: Teacher views own courses");
  const tCoursesRes = await fetch(`${BASE_URL}/api/course`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const tCoursesData = await tCoursesRes.json();
  assert(tCoursesRes.status === 200, "Teacher gets 200 for courses");
  assert(Array.isArray(tCoursesData.courseList), "Returns courseList array");
  const allOwnCourses = tCoursesData.courseList.every(
    (c) => c.teacherId === tLoginData.user.id,
  );
  assert(allOwnCourses, "Teacher can view only their own courses");

  const enrolledCourse = tCoursesData.courseList.find(
    (c) => c.enrolledStudents && c.enrolledStudents.length > 0,
  );
  if (enrolledCourse) {
    enrolledCourseId = enrolledCourse._id;
  }

  // 5. Teacher creates a new course
  console.log("\nTest 5: Teacher creates new course");
  const createRes = await fetch(`${BASE_URL}/api/course`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "API Automated Test Course",
      duration: 15,
      topics: ["Testing", "Jest", "Automation"],
      price: 1500,
      maxStudents: 5,
      status: "Open",
    }),
  });
  const createData = await createRes.json();
  assert(createRes.status === 201, "Teacher creates course returns 201");
  createdCourseId = createData.id;

  // 6. Teacher views course details with enrolled students
  console.log("\nTest 6: Teacher views course details");
  const detailsRes = await fetch(`${BASE_URL}/api/course/${enrolledCourseId}`, {
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  const detailsData = await detailsRes.json();
  assert(detailsRes.status === 200, "View course details returns 200");
  assert(
    detailsData.course?.enrolledStudents?.length > 0,
    "Course details displays enrolled students",
  );

  // 7. Teacher updates own course
  console.log("\nTest 7: Teacher updates own course");
  const updateRes = await fetch(`${BASE_URL}/api/course/${createdCourseId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "API Automated Test Course (Updated)",
      price: 1800,
    }),
  });
  assert(updateRes.status === 200, "Teacher updates course returns 200");

  // 8. Delete course with enrolled students must be REJECTED
  console.log("\nTest 8: Delete course with enrolled students");
  const delEnrolledRes = await fetch(
    `${BASE_URL}/api/course/${enrolledCourseId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${teacherToken}` },
    },
  );
  assert(
    delEnrolledRes.status === 400,
    "Deleting course with enrolled students is rejected with 400",
  );

  // 9. Delete course with NO enrolled students succeeds
  console.log("\nTest 9: Delete course with zero enrolled students");
  const delEmptyRes = await fetch(`${BASE_URL}/api/course/${createdCourseId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${teacherToken}` },
  });
  assert(
    delEmptyRes.status === 200,
    "Deleting course with zero enrolled students succeeds with 200",
  );

  // 10. Login as Student
  console.log("\nTest 10: Student login");
  const sLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student2@au.edu", password: "password123" }),
  });
  const sLoginData = await sLoginRes.json();
  assert(sLoginRes.status === 200, "Student login returns 200");
  assert(sLoginData.user?.role === "Student", "User role is Student");
  student2Token = sLoginData.token;

  // 11. Student forbidden from creating course
  console.log("\nTest 11: Student forbidden from creating course");
  const sCreateRes = await fetch(`${BASE_URL}/api/course`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${student2Token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Illegal Course",
      duration: 10,
      topics: ["Hack"],
      price: 0,
      maxStudents: 10,
    }),
  });
  assert(
    sCreateRes.status === 403,
    "Student attempting to create course rejected with 403 Forbidden",
  );

  // 12. Student displays courses (excluding Cancel status)
  console.log("\nTest 12: Student course list excludes Cancel status");
  const sCoursesRes = await fetch(`${BASE_URL}/api/course`, {
    headers: { Authorization: `Bearer ${student2Token}` },
  });
  const sCoursesData = await sCoursesRes.json();
  assert(sCoursesRes.status === 200, "Student fetches courses returns 200");
  const hasCancel = sCoursesData.courseList.some((c) => c.status === "Cancel");
  assert(!hasCancel, "No courses with Cancel status are shown to student");

  const openCourse = sCoursesData.courseList.find((c) => c.status === "Open");
  const closeCourse = sCoursesData.courseList.find((c) => c.status === "Close");
  if (openCourse) openCourseId = openCourse._id;
  if (closeCourse) closeCourseId = closeCourse._id;

  // 13. Student filters courses by course name or teacher name
  console.log("\nTest 13: Student filters courses");
  const filterRes = await fetch(
    `${BASE_URL}/api/course?search=teacher2`,
    {
      headers: { Authorization: `Bearer ${student2Token}` },
    },
  );
  const filterData = await filterRes.json();
  assert(filterRes.status === 200, "Filter returns 200");
  assert(
    filterData.courseList.every(
      (c) =>
        c.teacherName.toLowerCase().includes("teacher2") ||
        c.name.toLowerCase().includes("teacher2"),
    ),
    "Filter correctly matches query",
  );

  // 14. Student enrolls in an Open course
  console.log("\nTest 14: Student enrolls in Open course");
  const enrollRes = await fetch(
    `${BASE_URL}/api/course/${openCourseId}/enroll`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${student2Token}` },
    },
  );
  assert(enrollRes.status === 200, "Student successfully enrolls in Open course");

  // 15. Student duplicate enrollment must be REJECTED
  console.log("\nTest 15: Duplicate enrollment rejected");
  const dupEnrollRes = await fetch(
    `${BASE_URL}/api/course/${openCourseId}/enroll`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${student2Token}` },
    },
  );
  assert(
    dupEnrollRes.status === 400,
    "Duplicate enrollment rejected with 400 Bad Request",
  );

  // 16. Student cannot enroll in a Closed course
  if (closeCourseId) {
    console.log("\nTest 16: Enrollment in Close course rejected");
    const closeEnrollRes = await fetch(
      `${BASE_URL}/api/course/${closeCourseId}/enroll`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${student2Token}` },
      },
    );
    assert(
      closeEnrollRes.status === 400,
      "Enrollment in Close course rejected with 400 Bad Request",
    );
  }

  // 17. Student views enrolled courses
  console.log("\nTest 17: Student views enrolled courses");
  const myEnrolledRes = await fetch(`${BASE_URL}/api/course?enrolled=true`, {
    headers: { Authorization: `Bearer ${student2Token}` },
  });
  const myEnrolledData = await myEnrolledRes.json();
  assert(myEnrolledRes.status === 200, "Get enrolled courses returns 200");
  const isEnrolledInList = myEnrolledData.courseList.some(
    (c) => c._id === openCourseId,
  );
  assert(isEnrolledInList, "Enrolled course appears in student's enrolled list");

  // 18. Logout
  console.log("\nTest 18: Logout");
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
  });
  assert(logoutRes.status === 200, "Logout returns 200");

  console.log(`\n========================================`);
  console.log(`Test Results: ${passedTests} / ${totalTests} Passed`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log("ALL TESTS PASSED SUCCESSFULLY! 🎉");
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
