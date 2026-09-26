import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PREFIXES = ["/login", "/api/login", "/s", "/api/health", "/api/photo", "/offline", "/api/cron"];
// Everything a rep may touch; every other route is manager/admin only.
const REP_PREFIXES = ["/rep", "/api/me", "/api/my", "/api/lock", "/api/push", "/api/requests"];

const under = (p: string, prefixes: string[]) =>
  prefixes.some((x) => p === x || p.startsWith(x + "/"));

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (under(pathname, PUBLIC_PREFIXES)) return NextResponse.next();

  const session = await verifySessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  const isApi = pathname.startsWith("/api/");

  if (!session) {
    if (isApi) return NextResponse.json({ error: "locked" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session.role === "rep" && pathname !== "/" && !under(pathname, REP_PREFIXES)) {
    if (isApi) return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const url = req.nextUrl.clone();
    url.pathname = "/rep";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|icon-.*|manifest.webmanifest|sw.js|robots.txt|\\.well-known).*)",
  ],
};
