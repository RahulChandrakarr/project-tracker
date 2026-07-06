/**
 * Hand-written Database types matching the SQL migrations.
 * Regenerate with `supabase gen types typescript --linked > src/lib/supabase/types.ts`
 * once you've linked a project — this file will be overwritten then.
 *
 * The shape (Views/Functions/Enums/CompositeTypes, plus Relationships per
 * table) mirrors what `supabase gen types` outputs. Skipping any of them
 * collapses insert/update inference to `never`.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "admin" | "member";

export type ProjectStatus =
  | "planning"
  | "in_progress"
  | "blocked"
  | "review"
  | "done";

export type ProjectPriority = "low" | "medium" | "high";

export type ProjectMemberRole = "admin" | "member";

export type TaskStatus = "todo" | "in_progress" | "done";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half_day"
  | "paid_leave"
  | "sick_leave"
  | "work_from_home"
  | "holiday";

/** Optional priority level on a task. Null when not set. */
export type TaskPriority = "low" | "medium" | "high";

export type DocumentKind = "link" | "file";

export type NotificationType =
  | "task_assigned"
  | "task_completed"
  | "project_completed"
  | "user_pending";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          title: string | null;
          phone: string | null;
          location: string | null;
          bio: string | null;
          role: AppRole;
          approved: boolean;
          notion_embed_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          title?: string | null;
          phone?: string | null;
          location?: string | null;
          bio?: string | null;
          role?: AppRole;
          approved?: boolean;
          notion_embed_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          title?: string | null;
          phone?: string | null;
          location?: string | null;
          bio?: string | null;
          role?: AppRole;
          approved?: boolean;
          notion_embed_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_categories: {
        Row: {
          id: string;
          name: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          client: string;
          status: ProjectStatus;
          priority: ProjectPriority;
          progress: number;
          deadline: string | null;
          notes: string | null;
          category_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          client: string;
          status?: ProjectStatus;
          priority?: ProjectPriority;
          progress?: number;
          deadline?: string | null;
          notes?: string | null;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          client?: string;
          status?: ProjectStatus;
          priority?: ProjectPriority;
          progress?: number;
          deadline?: string | null;
          notes?: string | null;
          category_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          project_id: string;
          user_id: string;
          role: ProjectMemberRole;
          added_at: string;
        };
        Insert: {
          project_id: string;
          user_id: string;
          role?: ProjectMemberRole;
          added_at?: string;
        };
        Update: {
          role?: ProjectMemberRole;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          parent_id: string | null;
          title: string;
          description: string | null;
          assignee_id: string | null;
          status: TaskStatus;
          priority: TaskPriority | null;
          due_date: string | null;
          completed_at: string | null;
          position: number;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          assignee_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority | null;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          parent_id?: string | null;
          description?: string | null;
          assignee_id?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority | null;
          due_date?: string | null;
          completed_at?: string | null;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          project_id: string;
          task_id: string | null;
          title: string | null;
          body: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          task_id?: string | null;
          title?: string | null;
          body: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string | null;
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_documents: {
        Row: {
          id: string;
          project_id: string;
          task_id: string | null;
          kind: DocumentKind;
          name: string;
          url: string;
          storage_path: string | null;
          size_bytes: number | null;
          mime_type: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          task_id?: string | null;
          kind: DocumentKind;
          name: string;
          url: string;
          storage_path?: string | null;
          size_bytes?: number | null;
          mime_type?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          url?: string;
        };
        Relationships: [];
      };
      notebooks: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          theme: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title?: string;
          theme?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          theme?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notebook_pages: {
        Row: {
          id: string;
          notebook_id: string;
          position: number;
          title: string | null;
          paper_style: string;
          content: Json;
          drawing: Json;
          show_guides: boolean;
          rounded: boolean;
          shadow: boolean;
          bookmarked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          position?: number;
          title?: string | null;
          paper_style?: string;
          content?: Json;
          drawing?: Json;
          show_guides?: boolean;
          rounded?: boolean;
          shadow?: boolean;
          bookmarked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          position?: number;
          title?: string | null;
          paper_style?: string;
          content?: Json;
          drawing?: Json;
          show_guides?: boolean;
          rounded?: boolean;
          shadow?: boolean;
          bookmarked?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_work_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          log_date?: string;
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_task_entries: {
        Row: {
          id: string;
          user_id: string;
          entry_date: string;
          title: string;
          status: TaskStatus;
          project_id: string | null;
          notes: string;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          entry_date: string;
          title: string;
          status?: TaskStatus;
          project_id?: string | null;
          notes?: string;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          entry_date?: string;
          title?: string;
          status?: TaskStatus;
          project_id?: string | null;
          notes?: string;
          position?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_attendance: {
        Row: {
          id: string;
          user_id: string;
          attendance_date: string;
          status: AttendanceStatus;
          note: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          attendance_date: string;
          status: AttendanceStatus;
          note?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          attendance_date?: string;
          status?: AttendanceStatus;
          note?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string | null;
          type: NotificationType;
          title: string;
          body: string | null;
          project_id: string | null;
          task_id: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id?: string | null;
          type: NotificationType;
          title: string;
          body?: string | null;
          project_id?: string | null;
          task_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      is_app_admin: { Args: { uid: string }; Returns: boolean };
      is_project_member: {
        Args: { pid: string; uid: string };
        Returns: boolean;
      };
      is_project_admin: {
        Args: { pid: string; uid: string };
        Returns: boolean;
      };
      can_view_user_calendar: {
        Args: { viewer: string; target: string };
        Returns: boolean;
      };
      reorder_tasks: { Args: { p_ids: string[] }; Returns: undefined };
      create_notification: {
        Args: {
          p_user: string;
          p_type: NotificationType;
          p_title: string;
          p_body: string | null;
          p_project: string | null;
          p_task: string | null;
          p_actor: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: AppRole;
      project_status: ProjectStatus;
      project_priority: ProjectPriority;
      project_member_role: ProjectMemberRole;
      task_status: TaskStatus;
      attendance_status: AttendanceStatus;
      document_kind: DocumentKind;
      notification_type: NotificationType;
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
