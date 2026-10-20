// src/app/api/course/route.js

import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
  getUser,
} from "@/lib/utils";

export function OPTIONS(req) {
  return optionsResponse(req);
}

export async function GET(request) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const enrolledOnly = searchParams.get("enrolled") === "true";

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    let query = {};

    if (user.role === "Teacher") {
      // Teachers can view only their own courses
      query.teacherId = String(user.id);
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }
    } else {
      // Student view
      if (enrolledOnly) {
        // Display courses in which the student is enrolled
        query["enrolledStudents.studentId"] = String(user.id);
      } else {
        // Display all courses except courses with Cancel status
        query.status = { $ne: "Cancel" };

        // Filter courses by part of the course name or Teacher name
        if (search) {
          query.$or = [
            { name: { $regex: search, $options: "i" } },
            { teacherName: { $regex: search, $options: "i" } },
          ];
        }
      }
    }

    const courseList = await db
      .collection("course")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return successResponse({ courseList }, 200, request);
  } catch (error) {
    printExceptionLog("GET /api/course", error);
    return errorResponse("Failed to fetch courses", 500, request);
  }
}

export async function POST(request) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  // Only authenticated Teachers can create courses
  if (user.role !== "Teacher") {
    return errorResponse("Only Teachers can create courses", 403, request);
  }

  try {
    const data = await request.json();
    const { name, duration, topics, price, maxStudents, status } = data;

    if (!name || name.trim() === "") {
      return errorResponse("Course name is required", 400, request);
    }

    const parsedDuration = Number(duration);
    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return errorResponse("Duration must be a positive number of days", 400, request);
    }

    let parsedTopics = [];
    if (Array.isArray(topics)) {
      parsedTopics = topics.map((t) => String(t).trim()).filter(Boolean);
    } else if (typeof topics === "string") {
      parsedTopics = topics.split(",").map((t) => t.trim()).filter(Boolean);
    }
    if (parsedTopics.length === 0) {
      return errorResponse("At least one topic is required", 400, request);
    }

    const parsedPrice = Number(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return errorResponse("Price must be a valid non-negative number", 400, request);
    }

    const parsedMaxStudents = Number(maxStudents);
    if (isNaN(parsedMaxStudents) || parsedMaxStudents <= 0) {
      return errorResponse("Max Student must be a positive number", 400, request);
    }

    const validStatuses = ["Open", "Close", "Cancel"];
    const courseStatus = validStatuses.includes(status) ? status : "Open";

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const newCourse = {
      name: name.trim(),
      duration: parsedDuration,
      topics: parsedTopics,
      price: parsedPrice,
      maxStudents: parsedMaxStudents,
      status: courseStatus,
      teacherId: String(user.id),
      teacherName: user.username,
      teacherEmail: user.email,
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await db.collection("course").insertOne(newCourse);

    return successResponse(
      {
        id: insertResult.insertedId,
        message: "Course created successfully",
        course: { _id: insertResult.insertedId, ...newCourse },
      },
      201,
      request,
    );
  } catch (error) {
    printExceptionLog("POST /api/course", error);
    return errorResponse("Failed to create course", 500, request);
  }
}