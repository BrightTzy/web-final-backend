// src/app/api/user/[user_id]/route.js

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
    const { user_id } = await params;
    const client = await getClientPromise();
    const db = client.db(process.env.DB_NAME || "web_final_course_db");

    const foundUser = await db
      .collection("user")
      .findOne(idQuery(user_id), { projection: { password: 0 } });

    if (!foundUser) {
      return errorResponse("User not found", 404, request);
    }

    return successResponse({ user: foundUser }, 200, request);
  } catch (error) {
    printExceptionLog("GET /api/user/[user_id]", error);
    return errorResponse("Failed to fetch user", 500, request);
  }
}
