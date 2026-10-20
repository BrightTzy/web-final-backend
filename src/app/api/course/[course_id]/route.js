// src/app/api/course/[course_id]/route.js

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

export async function GET(request, { params }) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  try {
    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const course = await db.collection("course").findOne(idQuery(course_id));
    if (!course) {
      return errorResponse("Course not found", 404, request);
    }

    if (user.role === "Teacher") {
      // Teachers can view only their own courses
      if (String(course.teacherId) !== String(user.id)) {
        return errorResponse("Access denied: You can only view your own courses", 403, request);
      }
      // Course details displays enrolled students
      return successResponse({ course }, 200, request);
    } else {
      // Student view: Cancelled courses are not accessible to students
      if (course.status === "Cancel") {
        return errorResponse("Course not found or unavailable", 404, request);
      }
      return successResponse({ course }, 200, request);
    }
  } catch (error) {
    printExceptionLog("GET /api/course/[course_id]", error);
    return errorResponse("Failed to fetch course details", 500, request);
  }
}

export async function PUT(request, { params }) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  // Only Teachers can update courses
  if (user.role !== "Teacher") {
    return errorResponse("Only Teachers can update courses", 403, request);
  }

  try {
    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const course = await db.collection("course").findOne(idQuery(course_id));
    if (!course) {
      return errorResponse("Course not found", 404, request);
    }

    // Teachers can update only their own courses
    if (String(course.teacherId) !== String(user.id)) {
      return errorResponse("Access denied: You can only update your own courses", 403, request);
    }

    const data = await request.json();
    const updates = { updatedAt: new Date() };

    if (data.name !== undefined) {
      if (!data.name.trim()) {
        return errorResponse("Course name cannot be empty", 400, request);
      }
      updates.name = data.name.trim();
    }

    if (data.duration !== undefined) {
      const dur = Number(data.duration);
      if (isNaN(dur) || dur <= 0) {
        return errorResponse("Duration must be a positive number of days", 400, request);
      }
      updates.duration = dur;
    }

    if (data.topics !== undefined) {
      let parsedTopics = [];
      if (Array.isArray(data.topics)) {
        parsedTopics = data.topics.map((t) => String(t).trim()).filter(Boolean);
      } else if (typeof data.topics === "string") {
        parsedTopics = data.topics.split(",").map((t) => t.trim()).filter(Boolean);
      }
      if (parsedTopics.length === 0) {
        return errorResponse("At least one topic is required", 400, request);
      }
      updates.topics = parsedTopics;
    }

    if (data.price !== undefined) {
      const pr = Number(data.price);
      if (isNaN(pr) || pr < 0) {
        return errorResponse("Price must be a valid non-negative number", 400, request);
      }
      updates.price = pr;
    }

    if (data.maxStudents !== undefined) {
      const maxSt = Number(data.maxStudents);
      const enrolledCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
      if (isNaN(maxSt) || maxSt <= 0) {
        return errorResponse("Max Student must be a positive number", 400, request);
      }
      if (maxSt < enrolledCount) {
        return errorResponse(
          `Max Student cannot be less than currently enrolled students (${enrolledCount})`,
          400,
          request,
        );
      }
      updates.maxStudents = maxSt;
    }

    if (data.status !== undefined) {
      const validStatuses = ["Open", "Close", "Cancel"];
      if (!validStatuses.includes(data.status)) {
        return errorResponse("Status must be Open, Close, or Cancel", 400, request);
      }
      updates.status = data.status;
    }

    await db.collection("course").updateOne(idQuery(course_id), { $set: updates });

    const updatedCourse = await db.collection("course").findOne(idQuery(course_id));

    return successResponse(
      {
        message: "Course updated successfully",
        course: updatedCourse,
      },
      200,
      request,
    );
  } catch (error) {
    printExceptionLog("PUT /api/course/[course_id]", error);
    return errorResponse("Failed to update course", 500, request);
  }
}

export async function DELETE(request, { params }) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  // Only Teachers can delete courses
  if (user.role !== "Teacher") {
    return errorResponse("Only Teachers can delete courses", 403, request);
  }

  try {
    const { course_id } = await params;
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const course = await db.collection("course").findOne(idQuery(course_id));
    if (!course) {
      return errorResponse("Course not found", 404, request);
    }

    // Teachers can delete only their own courses
    if (String(course.teacherId) !== String(user.id)) {
      return errorResponse("Access denied: You can only delete your own courses", 403, request);
    }

    // Delete the Teacher's own course only when no Student has enrolled
    const enrolledCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
    if (enrolledCount > 0) {
      return errorResponse(
        `Cannot delete course: ${enrolledCount} student(s) have already enrolled`,
        400,
        request,
      );
    }

    await db.collection("course").deleteOne(idQuery(course_id));

    return successResponse(
      {
        message: "Course deleted successfully",
      },
      200,
      request,
    );
  } catch (error) {
    printExceptionLog("DELETE /api/course/[course_id]", error);
    return errorResponse("Failed to delete course", 500, request);
  }
}