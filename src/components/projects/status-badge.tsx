import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type ProjectStatus } from "@/types/project";

const VARIANT: Record<ProjectStatus, "default" | "secondary" | "outline" | "muted"> = {
  planning: "outline",
  in_progress: "default",
  blocked: "secondary",
  review: "muted",
  done: "secondary",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
