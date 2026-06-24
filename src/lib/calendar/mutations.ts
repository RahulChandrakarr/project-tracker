"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isValidDateKey } from "@/lib/calendar/dates";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UpsertLogInput = z.object({
  date: z.string().refine(isValidDateKey, "Invalid date"),
  body: z.string(),
});

export type WorkLogFormState = {
  ok: boolean;
  message?: string;
};

export async function upsertDailyLog(
  date: string,
  body: string,
): Promise<WorkLogFormState> {
  const parsed = UpsertLogInput.safeParse({ date, body });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in." };

  const trimmed = parsed.data.body.trim();
  if (trimmed.length === 0) {
    const { error } = await supabase
      .from("daily_work_logs")
      .delete()
      .eq("user_id", user.id)
      .eq("log_date", parsed.data.date);
    if (error) return { ok: false, message: error.message };
  } else {
    const { error } = await supabase.from("daily_work_logs").upsert(
      {
        user_id: user.id,
        log_date: parsed.data.date,
        body: parsed.data.body,
      },
      { onConflict: "user_id,log_date" },
    );
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/calendar");
  return { ok: true };
}
