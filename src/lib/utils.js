// src/lib/utils.js

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import corsHeaders, { getCorsHeaders } from "./cors";
import { verifyJWT } from "./auth";
import {
  X_HEADER_USER_ID,
  X_HEADER_USER_NAME,
  X_HEADER_USER_EMAIL,
  X_HEADER_USER_ROLE,
} from "./constant";

export function printExceptionLog(logMessage, error) {
  console.log(`==>${logMessage} Exception:`, error);
}

export function errorResponse(message, status = 400, req = null) {
  const headers = req ? getCorsHeaders(req) : corsHeaders;
  return NextResponse.json(
    {
      message: message,
    },
    {
      status: status,
      headers: headers,
    },
  );
}

export function successResponse(jsonData, status = 200, req = null) {
  const headers = req ? getCorsHeaders(req) : corsHeaders;
  return NextResponse.json(jsonData, {
    status: status,
    headers: headers,
  });
}

export function optionsResponse(req = null) {
  const headers = req ? getCorsHeaders(req) : corsHeaders;
  return new NextResponse(null, {
    status: 204,
    headers: headers,
  });
}

export function idQuery(id) {
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === String(id)) {
      return { $or: [{ _id: new ObjectId(id) }, { _id: id }] };
    }
  } catch {
    // fallback
  }
  return { _id: id };
}

export function getUser(req) {
  // First attempt from JWT
  const user = verifyJWT(req);
  if (user) return user;

  // Fallback to proxy-injected headers if present
  if (req && req.headers) {
    const id = req.headers.get(X_HEADER_USER_ID);
    if (id) {
      return {
        id,
        email: req.headers.get(X_HEADER_USER_EMAIL),
        username: req.headers.get(X_HEADER_USER_NAME),
        role: req.headers.get(X_HEADER_USER_ROLE),
      };
    }
  }
  return null;
}
