// src/app/api/auth/login/route.js

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
    const identifier = (data.email || data.username || "").trim();
    const password = data.password;

    if (!identifier || !password) {
      return errorResponse("Missing email/username or password", 400, req);
    }

    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    // Search by email or username (case-insensitive)
    const user = await db.collection("user").findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: `^${identifier}$`, $options: "i" } },
      ],
    });

    if (!user) {
      return errorResponse("Invalid email or password", 401, req);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse("Invalid email or password", 401, req);
    }

    const userPayload = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      role: user.role || "Student",
    };

    const token = generateToken(userPayload);

    const response = NextResponse.json(
      {
        message: "Login successful",
        user: userPayload,
        token: token,
      },
      {
        status: 200,
        headers: getCorsHeaders(req),
      },
    );

    // Set HTTP-only cookie
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    printExceptionLog("POST /api/auth/login", error);
    return errorResponse("Internal server error during login", 500, req);
  }
}