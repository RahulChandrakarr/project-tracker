"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidDateKey } from "@/lib/calendar/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const EntryInput = z.object({
  title: z.string().trim().min(1).max(500),
  status: z.enum(["todo", "in_progress", "done"]).default("todo"),
  projectId: z.string().uuid().nullable().default(null),
  notes: z.string().max(50_000).default(""),
});

const SaveEntriesInput = z.object({
  date: z.string().refine(isValidDateKey, "Invalid date"),
  entries: z.array(EntryInput).max(100),
});

export type DayTaskEntryInput = z.input<typeof EntryInput>;

export type SaveDayTasksState = {
  ok: boolean;
  message?: string;
};

/**
 * Full-replace save for a day's manually logged task entries. Deletes the
 * day's existing rows for the signed-in user and re-inserts the provided
 * set in order. Empty-title rows are dropped client-side before calling.
 */
export async function saveDayTaskEntries(
  date: string,
  entries: DayTaskEntryInput[],
): Promise<SaveDayTasksState> {
  const parsed = SaveEntriesInput.safeParse({ date, entries });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const { error: deleteError } = await supabase
    .from("daily_task_entries")
    .delete()
    .eq("user_id", user.id)
    .eq("entry_date", parsed.data.date);
  if (deleteError) return { ok: false, message: deleteError.message };

  if (parsed.data.entries.length > 0) {
    const rows = parsed.data.entries.map((entry, index) => ({
      user_id: user.id,
      entry_date: parsed.data.date,
      title: entry.title,
      status: entry.status,
      project_id: entry.projectId,
      notes: entry.notes,
      position: index,
    }));
    const { error: insertError } = await supabase
      .from("daily_task_entries")
      .insert(rows);
    if (insertError) return { ok: false, message: insertError.message };
  }

  revalidatePath("/calendar");
  return { ok: true };
}
