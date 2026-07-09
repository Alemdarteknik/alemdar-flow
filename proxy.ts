import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/systems/all", request.url));
  }

  if (pathname === "/") {
    return NextResponse.redirect(new URL("/systems/all", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/systems/:path*", "/dashboard/:path*"],
};
