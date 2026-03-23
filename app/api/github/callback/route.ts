import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?message=missing_code`);
  }

  const supabase = await createClient();
  const { data: authData, error: authError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (authError || !authData.user) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(authError?.message ?? "auth_failed")}`
    );
  }

  const user = authData.user;

  // Exchange GitHub code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    }
  );
  const tokenData = await tokenResponse.json();
  const githubToken = tokenData.access_token;

  if (!githubToken) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=github_token_exchange_failed`
    );
  }

  // Upsert GitHub token
  const admin = await getSupabaseAdmin();
  await admin
    .from("github_tokens")
    .upsert(
      { user_id: user.id, access_token: githubToken },
      { onConflict: "user_id" }
    );

  return NextResponse.redirect(`${origin}${next}`);
}
