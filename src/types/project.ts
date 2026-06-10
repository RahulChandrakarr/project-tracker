/**
 * Label maps for the project enums. The enum types themselves live in
 * `@/lib/supabase/types` because they come from the database schema.
 */
import type {
  AppRole,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/supabase/types";

export type {
  AppRole,
  ProjectMemberRole,
  ProjectPriority,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
};

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  blocked: "Blocked",
  review: "Review",
  done: "Done",
};

export const PRIORITY_LABEL: Record<ProjectPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  member: "Member",
};

export const PROJECT_MEMBER_ROLE_LABEL: Record<ProjectMemberRole, string> = {
  admin: "Project admin",
  member: "Member",
};

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const TASK_PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high"];
