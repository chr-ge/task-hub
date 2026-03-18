import type { TaskType } from "@/lib/types";
import {
  TASK_TYPE_LABELS,
  TASK_TYPE_SHORT_LABELS,
  TASK_TYPE_BADGE_CLASSES,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function TaskTypeBadge({
  type,
  short = true,
}: {
  type: TaskType;
  short?: boolean;
}) {
  const label = short ? TASK_TYPE_SHORT_LABELS[type] : TASK_TYPE_LABELS[type];
  return (
    <Badge
      variant="outline"
      className={`border-transparent ${TASK_TYPE_BADGE_CLASSES[type]}`}
    >
      {label}
    </Badge>
  );
}
