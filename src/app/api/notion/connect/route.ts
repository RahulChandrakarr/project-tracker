import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  buildNotionAuthorizeUrl,
  getNotionOAuthConfig,
  notionRedirectUri,
} from "@/lib/integrations/notion";

const STATE_COOKIE = "notion_oauth_state";

/**
 * Starts the Notion OAuth flow: sets a CSRF state cookie and redirects the
 * signed-in user to Notion's consent screen.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  const config = getNotionOAuthConfig();
  if (!config) {
    return NextResponse.redirect(
      new URL("/calendar?notion=unconfigured", origin),
    );
  }

  try {
    await getCurrentUser();
  } catch {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const state = crypto.randomUUID();
  const authorizeUrl = buildNotionAuthorizeUrl({
    clientId: config.clientId,
    redirectUri: notionRedirectUri(origin),
    state,
  });

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
