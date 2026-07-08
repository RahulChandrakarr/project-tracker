"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { deleteNotionConnection } from "@/lib/integrations/notion";

export type NotionActionState = { ok: boolean; message?: string };

/** Disconnects the signed-in user's Notion account. */
export async function disconnectNotion(): Promise<NotionActionState> {
  const me = await getCurrentUser();
  try {
    await deleteNotionConnection(me.id);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed." };
  }
  revalidatePath("/calendar");
  return { ok: true };
}
