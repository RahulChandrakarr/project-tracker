import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  exchangeNotionCode,
  notionRedirectUri,
  storeNotionConnection,
} from "@/lib/integrations/notion";

const STATE_COOKIE = "notion_oauth_state";

function back(origin: string, status: string) {
  const res = NextResponse.redirect(new URL(`/calendar?notion=${status}`, origin));
  res.cookies.delete(STATE_COOKIE);
  return res;
}

/**
 * Notion redirects here after consent. Verifies the CSRF state, exchanges the
 * code for an access token, stores it for the signed-in user, and returns to
 * the calendar.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return back(origin, "denied");

  const expected = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expected || state !== expected) {
    return back(origin, "error");
  }

  let userId: string;
  try {
    userId = (await getCurrentUser()).id;
  } catch {
    return NextResponse.redirect(new URL("/login", origin));
  }

  try {
    const token = await exchangeNotionCode({
      code,
      redirectUri: notionRedirectUri(origin),
    });
    await storeNotionConnection(userId, token);
  } catch {
    return back(origin, "error");
  }

  return back(origin, "connected");
}
