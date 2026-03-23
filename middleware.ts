import { updateSession } from "@/lib/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Update session for all routes except static assets
  const staticPaths = ["/_next", "/favicon.ico"];
  const isStaticPath = staticPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // Also skip image extensions
  const imageExtensions = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"];
  const isImage = imageExtensions.some((ext) =>
    request.nextUrl.pathname.endsWith(ext)
  );

  if (isStaticPath || isImage) {
    return NextResponse.next();
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
  ],
};
