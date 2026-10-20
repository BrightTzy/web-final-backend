const allowedOrigin =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5173"
    : "http://localhost:5173");

export function getCorsHeaders(req) {
  const origin = req?.headers?.get?.("origin") || allowedOrigin;
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, x-user-id, x-user-username, x-user-email, x-user-role",
    "Access-Control-Max-Age": "86400",
  };
}

let corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-user-id, x-user-username, x-user-email, x-user-role",
  "Access-Control-Max-Age": "86400",
};

export default corsHeaders;
