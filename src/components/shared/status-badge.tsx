import type { SubmissionStatus } from "@/lib/types";
import { STATUS_BADGE_CLASSES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge variant="secondary" className={STATUS_BADGE_CLASSES[status]}>
      {status}
    </Badge>
  );
}
