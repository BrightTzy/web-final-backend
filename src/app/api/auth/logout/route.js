// src/app/api/auth/logout/route.js

import { getCorsHeaders } from "@/lib/cors";
import { optionsResponse } from "@/lib/utils";
import { NextResponse } from "next/server";

export function OPTIONS(req) {
  return optionsResponse(req);
}

function handleLogout(req) {
  const response = NextResponse.json(
    {
      message: "Logout successful",
    },
    {
      status: 200,
      headers: getCorsHeaders(req),
    },
  );

  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "development" ? "lax" : "none",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function GET(req) {
  return handleLogout(req);
}

export async function POST(req) {
  return handleLogout(req);
}