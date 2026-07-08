import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const NOTION_AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token";

export type NotionOAuthConfig = {
  clientId: string;
  clientSecret: string;
  /** Fixed redirect URI override, or null to derive from the request origin. */
  redirectUri: string | null;
};

/** Returns the configured OAuth app, or null when env vars are missing. */
export function getNotionOAuthConfig(): NotionOAuthConfig | null {
  const clientId = process.env.NOTION_OAUTH_CLIENT_ID;
  const clientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    redirectUri: process.env.NOTION_OAUTH_REDIRECT_URI || null,
  };
}

export function isNotionOAuthConfigured(): boolean {
  return getNotionOAuthConfig() !== null;
}

/** The callback URL registered with Notion: env override, else origin-based. */
export function notionRedirectUri(origin: string): string {
  const config = getNotionOAuthConfig();
  return config?.redirectUri || `${origin}/api/notion/callback`;
}

export function buildNotionAuthorizeUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    owner: "user",
    redirect_uri: redirectUri,
    state,
  });
  return `${NOTION_AUTHORIZE_URL}?${params.toString()}`;
}

type NotionTokenResponse = {
  access_token: string;
  bot_id?: string;
  workspace_id?: string;
  workspace_name?: string | null;
  workspace_icon?: string | null;
};

/** Exchanges an authorization code for an access token (throws on failure). */
export async function exchangeNotionCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}): Promise<NotionTokenResponse> {
  const config = getNotionOAuthConfig();
  if (!config) throw new Error("Notion OAuth is not configured.");

  const basic = Buffer.from(
    `${config.clientId}:${config.clientSecret}`,
  ).toString("base64");

  const res = await fetch(NOTION_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Notion token exchange failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as NotionTokenResponse;
}

/** Persists (or replaces) a user's Notion connection. Service-role only. */
export async function storeNotionConnection(
  userId: string,
  token: NotionTokenResponse,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("notion_oauth").upsert(
    {
      user_id: userId,
      access_token: token.access_token,
      bot_id: token.bot_id ?? null,
      workspace_id: token.workspace_id ?? null,
      workspace_name: token.workspace_name ?? null,
      workspace_icon: token.workspace_icon ?? null,
      connected_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function deleteNotionConnection(userId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("notion_oauth")
    .delete()
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export type NotionConnectionStatus = {
  configured: boolean;
  connected: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  connectedAt: string | null;
};

/** Connection status for a user WITHOUT exposing the access token. */
export async function getNotionConnectionStatus(
  userId: string,
): Promise<NotionConnectionStatus> {
  const configured = isNotionOAuthConfigured();
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("notion_oauth")
    .select("workspace_name, workspace_icon, connected_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  return {
    configured,
    connected: Boolean(data),
    workspaceName: data?.workspace_name ?? null,
    workspaceIcon: data?.workspace_icon ?? null,
    connectedAt: data?.connected_at ?? null,
  };
}
