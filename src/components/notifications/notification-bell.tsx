"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  CheckCheck,
  CircleCheck,
  ClipboardCheck,
  FolderCheck,
  UserPlus,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Popover } from "@/components/ui/popover";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { NotificationType, Tables } from "@/lib/supabase/types";

type Notification = Tables<"notifications">;

const SOUND_KEY = "notif-sound";

/** Icon per notification kind, so the list scans at a glance. */
const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  task_assigned: ClipboardCheck,
  task_completed: CircleCheck,
  project_completed: FolderCheck,
  user_pending: UserPlus,
};

/** Where a notification takes you when clicked. */
function hrefFor(n: Notification): string | null {
  if (n.project_id) return `/projects/${n.project_id}`;
  if (n.type === "user_pending") return "/members";
  return null;
}

/** Short "5m / 3h / 2d" style relative time. */
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Plays a short two-tone chime via the Web Audio API. Synthesised so no audio
 * asset has to ship; drop a file in /public and swap this out for a custom one.
 */
function playChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [
      { f: 880, t: 0 },
      { f: 1320, t: 0.14 },
    ].forEach(({ f, t }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, now + t);
      gain.gain.exponentialRampToValueAtTime(0.18, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.32);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Audio not available (no user gesture yet / unsupported) — ignore.
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [permission, setPermission] =
    React.useState<NotificationPermission>("default");
  const [soundOn, setSoundOn] = React.useState(true);

  // Mirror the latest values into refs so the realtime subscription (set up
  // once) can read them without re-subscribing every time they change.
  const permissionRef = React.useRef(permission);
  const soundRef = React.useRef(soundOn);
  React.useEffect(() => {
    permissionRef.current = permission;
  }, [permission]);
  React.useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const unread = items.filter((n) => !n.read_at).length;

  // Restore the sound preference + current browser permission on mount. These
  // read browser-only APIs, so they can't be initial state (server-rendered).
  React.useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    setSoundOn(window.localStorage.getItem(SOUND_KEY) !== "off");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const refresh = React.useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    if (data) setItems(data as Notification[]);
  }, [supabase]);

  // Initial load + live stream of new notifications for this user.
  React.useEffect(() => {
    // Async load; setState lands after the await, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) =>
            prev.some((n) => n.id === row.id) ? prev : [row, ...prev].slice(0, 30),
          );
          if (soundRef.current) playChime();
          if (
            permissionRef.current === "granted" &&
            typeof Notification !== "undefined"
          ) {
            try {
              new Notification(row.title, {
                body: row.body ?? undefined,
                tag: row.id,
              });
            } catch {
              // Construction can throw on some platforms — non-fatal.
            }
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, userId, refresh]);

  async function markAllRead() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null);
  }

  async function openItem(n: Notification, close: () => void) {
    if (!n.read_at) {
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read_at: now } : x)),
      );
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("id", n.id);
    }
    const href = hrefFor(n);
    close();
    if (href) router.push(href);
  }

  function requestPermission() {
    if (typeof Notification === "undefined") return;
    Notification.requestPermission().then(setPermission);
  }

  function toggleSound() {
    setSoundOn((on) => {
      const next = !on;
      window.localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      if (next) playChime();
      return next;
    });
  }

  return (
    <Popover
      align="end"
      triggerLabel="Notifications"
      triggerClassName="relative grid size-8 shrink-0 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-secondary)] text-[var(--color-foreground)] transition-opacity hover:opacity-80"
      className="w-80 max-w-[calc(100vw-1rem)] p-0"
      trigger={
        <>
          {unread > 0 ? (
            <BellRing className="size-4" />
          ) : (
            <Bell className="size-4" />
          )}
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-semibold leading-4 text-[var(--color-destructive-foreground)]">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </>
      }
    >
      {({ close }) => (
        <div className="flex max-h-[26rem] flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={toggleSound}
                aria-label={soundOn ? "Mute alert sound" : "Unmute alert sound"}
                title={soundOn ? "Sound on" : "Sound off"}
                className="grid size-7 place-items-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
              >
                {soundOn ? (
                  <Volume2 className="size-4" />
                ) : (
                  <VolumeX className="size-4" />
                )}
              </button>
              {unread > 0 ? (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          {permission !== "granted" ? (
            <button
              type="button"
              onClick={requestPermission}
              className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-secondary)]/50 px-3 py-2 text-left text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <Bell className="size-3.5 shrink-0" />
              {permission === "denied"
                ? "Browser alerts are blocked. Enable them in site settings."
                : "Turn on browser pop-ups and sound for new notifications."}
            </button>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-[var(--color-muted-foreground)]">
                You&apos;re all caught up.
              </p>
            ) : (
              <ul>
                {items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => openItem(n, close)}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-accent)]",
                          !n.read_at && "bg-[var(--color-secondary)]/40",
                        )}
                      >
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[var(--color-secondary)] text-[var(--color-foreground)] [&_svg]:size-4">
                          <Icon />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">
                              {n.title}
                            </span>
                            {!n.read_at ? (
                              <span className="size-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                            ) : null}
                          </span>
                          {n.body ? (
                            <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                              {n.body}
                            </span>
                          ) : null}
                          <span className="mt-0.5 block text-[11px] text-[var(--color-muted-foreground)]">
                            {timeAgo(n.created_at)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </Popover>
  );
}
