import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/chat")) &&
    !token
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (
    (pathname.startsWith("/login") || pathname.startsWith("/register")) &&
    token
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*", "/login", "/register"],
};
