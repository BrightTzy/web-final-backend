// src/app/api/course/[course_id]/enroll/route.js

import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
  idQuery,
  getUser,
} from "@/lib/utils";

export function OPTIONS(req) {
  return optionsResponse(req);
}

export async function POST(request, { params }) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  // Only Students can enroll in courses
  if (user.role !== "Student") {
    return errorResponse("Only Students are authorized to enroll in courses", 403, request);
  }

  try {
    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const course = await db.collection("course").findOne(idQuery(course_id));
    if (!course) {
      return errorResponse("Course not found", 404, request);
    }

    // Rule: Enroll in a course only when its status is Open
    if (course.status !== "Open") {
      return errorResponse(
        `Enrollment not allowed: Course is currently '${course.status}'. Only Open courses accept enrollment.`,
        400,
        request,
      );
    }

    const enrolledList = Array.isArray(course.enrolledStudents) ? course.enrolledStudents : [];

    // Rule: A Student cannot enroll in the same course more than once
    const alreadyEnrolled = enrolledList.some(
      (s) => String(s.studentId) === String(user.id),
    );
    if (alreadyEnrolled) {
      return errorResponse("You are already enrolled in this course", 400, request);
    }

    // Rule: Enroll only when seats are still available according to Max Student
    if (enrolledList.length >= course.maxStudents) {
      return errorResponse(
        `Cannot enroll: Course has reached maximum capacity (${course.maxStudents} students)`,
        400,
        request,
      );
    }

    const studentRecord = {
      studentId: String(user.id),
      username: user.username,
      email: user.email,
      enrolledAt: new Date(),
    };

    // Atomic update preventing race condition
    const updateResult = await db.collection("course").updateOne(
      {
        ...idQuery(course_id),
        status: "Open",
        "enrolledStudents.studentId": { $ne: String(user.id) },
        $expr: {
          $lt: [{ $size: { $ifNull: ["$enrolledStudents", []] } }, "$maxStudents"],
        },
      },
      {
        $push: { enrolledStudents: studentRecord },
        $set: { updatedAt: new Date() },
      },
    );

    if (updateResult.modifiedCount === 0) {
      // Re-check reason for concurrency or condition mismatch
      const freshCourse = await db.collection("course").findOne(idQuery(course_id));
      if (freshCourse.status !== "Open") {
        return errorResponse("Course is no longer open for enrollment", 400, request);
      }
      if ((freshCourse.enrolledStudents?.length || 0) >= freshCourse.maxStudents) {
        return errorResponse("Course has filled up. No seats available", 400, request);
      }
      if (
        freshCourse.enrolledStudents?.some(
          (s) => String(s.studentId) === String(user.id),
        )
      ) {
        return errorResponse("You are already enrolled in this course", 400, request);
      }
      return errorResponse("Enrollment failed", 400, request);
    }

    const updatedCourse = await db.collection("course").findOne(idQuery(course_id));

    return successResponse(
      {
        message: "Successfully enrolled in the course",
        course: updatedCourse,
      },
      200,
      request,
    );
  } catch (error) {
    printExceptionLog("POST /api/course/[course_id]/enroll", error);
    return errorResponse("Failed to enroll in course", 500, request);
  }
}
