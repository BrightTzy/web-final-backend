// src/app/api/auth/register/route.js

import { getClientPromise } from "@/lib/mongodb";
import { errorResponse, optionsResponse, successResponse, printExceptionLog } from "@/lib/utils";
import { generateToken } from "@/lib/auth";
import { getCorsHeaders } from "@/lib/cors";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

export function OPTIONS(req) {
  return optionsResponse(req);
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { username, email, password, role } = data;

    if (!username || !email || !password) {
      return errorResponse("Username, email, and password are required", 400, req);
    }

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 400, req);
    }

    const assignedRole = role === "Teacher" ? "Teacher" : "Student";
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim();

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    // Check if user already exists
    const existing = await db.collection("user").findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    });

    if (existing) {
      return errorResponse("User with this email or username already exists", 400, req);
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

    const userPayload = {
      id: insertResult.insertedId.toString(),
      email: normalizedEmail,
      username: normalizedUsername,
      role: assignedRole,
    };

    const token = generateToken(userPayload);

    const response = NextResponse.json(
      {
        message: "Registration successful",
        user: userPayload,
        token: token,
      },
      {
        status: 201,
        headers: getCorsHeaders(req),
      },
    );

    // Set HTTP-only cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    printExceptionLog("POST /api/auth/register", error);
    return errorResponse("Internal server error during registration", 500, req);
  }
}
