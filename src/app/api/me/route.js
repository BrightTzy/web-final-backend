// src/app/api/me/route.js

import { errorResponse, optionsResponse, successResponse } from "@/lib/utils";
import { getUser } from "@/lib/utils";

export function OPTIONS(req) {
  return optionsResponse(req);
}

export function GET(request) {
  const user = getUser(request);

  if (!user) {
    return errorResponse("Unauthorized Request", 401, request);
  }

  return successResponse({ user }, 200, request);
}
