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

const SetAttendanceInput = z.object({
  userId: z.string().uuid(),
  date: z.string().refine(isValidDateKey, "Invalid date"),
  status: z.enum([
    "present",
    "absent",
    "half_day",
    "paid_leave",
    "sick_leave",
    "work_from_home",
    "holiday",
  ]),
  note: z.string().max(500).default(""),
});

export type SetAttendanceState = {
  ok: boolean;
  message?: string;
};

/**
 * Sets attendance for a user on a day. A user may set their own; app admins
 * may set anyone's. RLS enforces the same rule as a backstop.
 */
export async function setAttendance(
  userId: string,
  date: string,
  status: string,
  note = "",
): Promise<SetAttendanceState> {
  const parsed = SetAttendanceInput.safeParse({ userId, date, status, note });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  if (parsed.data.userId !== user.id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "admin") {
      return { ok: false, message: "Only admins can set others' attendance." };
    }
  }

  const { error } = await supabase.from("daily_attendance").upsert(
    {
      user_id: parsed.data.userId,
      attendance_date: parsed.data.date,
      status: parsed.data.status,
      note: parsed.data.note,
    },
    { onConflict: "user_id,attendance_date" },
  );
  if (error) return { ok: false, message: error.message };

  revalidatePath("/calendar");
  return { ok: true };
}
