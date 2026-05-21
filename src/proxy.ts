import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get("authorization");
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [user, pwd] = atob(authValue).split(":");

    // Use environment variables for basic auth, default to admin/admin for local dev
    const validUser = process.env.ADMIN_USER || "admin";
    const validPassword = process.env.ADMIN_PASSWORD || "admin";

    if (user === validUser && pwd === validPassword) {
      return NextResponse.next();
    }
  }
  url.pathname = "/api/auth"; // fallback not used directly

  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Secure Area"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
