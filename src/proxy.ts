import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Gate: any request under a protected prefix must carry a valid session,
 * or it's redirected to /login. This only checks "is anyone logged in" —
 * role and per-dealer scoping (a DEALER session can only ever touch its
 * own Dealer.id) are enforced inside each page/route handler via
 * src/lib/access-control.ts, since that needs a database lookup
 * (dealerCode -> Dealer.id) this proxy doesn't have.
 */
export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    "/apply/:path*",
    "/dealer/:path*",
    "/manufacturer/:path*",
    "/api/applications/:path*",
    "/api/submissions/:path*",
  ],
};
