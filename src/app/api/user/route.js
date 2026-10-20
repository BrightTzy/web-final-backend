// src/app/api/user/route.js

import { getClientPromise } from "@/lib/mongodb";
import {
  errorResponse,
  optionsResponse,
  printExceptionLog,
  successResponse,
  getUser,
} from "@/lib/utils";
import bcrypt from "bcrypt";

export function OPTIONS(req) {
  return optionsResponse(req);
}

export async function GET(request) {
  const user = getUser(request);
  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  try {
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const userList = await db
      .collection("user")
      .find({}, { projection: { password: 0 } })
      .toArray();

    return successResponse({ userList }, 200, request);
  } catch (error) {
    printExceptionLog("GET /api/user", error);
    return errorResponse("Failed to fetch users", 500, request);
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { username, email, password, role } = data;

    if (!email || !password || !username) {
      return errorResponse("Username, email and password are required", 400, request);
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400, request);
    }

    const assignedRole = role === "Teacher" ? "Teacher" : "Student";

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    // Check existing
    const existing = await db.collection("user").findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existing) {
      return errorResponse("User with this email or username already exists", 400, request);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole,
      createdAt: new Date(),
    };

    const insertResult = await db.collection("user").insertOne(newUser);

    return successResponse(
      {
        id: insertResult.insertedId,
        message: "User created successfully",
        user: {
          id: insertResult.insertedId,
          username: normalizedUsername,
          email: normalizedEmail,
          role: assignedRole,
        },
      },
      201,
      request,
    );
  } catch (error) {
    printExceptionLog("POST /api/user", error);
    return errorResponse("Failed to create user", 500, request);
  }
}