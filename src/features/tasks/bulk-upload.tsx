"use client";

import { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  Loader2Icon,
  CopyIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  UploadIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { TaskFormValuesSchema } from "@/lib/types";
import type { TaskFormValues } from "@/lib/types";
import { useBulkCreateTasks } from "./hooks";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

// Sample template
const TEMPLATE: Partial<TaskFormValues>[] = [
  {
    task_type: "social_media_posting",
    title: "Post about our new product",
    description: "Share a post on Instagram about our latest product launch.",
    details: "Include hashtags #NewProduct #LaunchDay. Tag @ourbrand.",
    amount: 20,
    reward: 5,
    allow_multiple_submissions: true,
    campaign_id: "paste-a-valid-uuid-here",
  },
];

interface ParsedTask {
  index: number;
  values: TaskFormValues | null;
  errors: string[];
  raw: unknown;
}

interface BulkUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function BulkUpload({ open, onOpenChange, onSuccess }: BulkUploadProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<ParsedTask[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const bulkCreate = useBulkCreateTasks();

  // Parse JSON input
  function handleParse() {
    setParseError(null);
    setParsed(null);

    let rawData: unknown;
    try {
      rawData = JSON.parse(jsonInput);
    } catch {
      setParseError("Invalid JSON. Please check your input.");
      return;
    }

    if (!Array.isArray(rawData)) {
      setParseError("Input must be a JSON array of tasks.");
      return;
    }

    if (rawData.length === 0) {
      setParseError("Array is empty. Add at least one task.");
      return;
    }

    // Validate each item individually for per-row errors
    const results: ParsedTask[] = rawData.map((item: unknown, index: number) => {
      const obj = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};

      // Add defaults for missing optional fields
      const enriched = {
        ...obj,
        campaign_id: obj.campaign_id || uuidv4(),
        phases: obj.phases ?? [],
        drip_feed: obj.drip_feed ?? { drip_enabled: false },
      };

      const result = TaskFormValuesSchema.safeParse(enriched);
      if (result.success) {
        return {
          index,
          values: result.data,
          errors: [],
          raw: item,
        };
      }
      return {
        index,
        values: null,
        errors: result.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`
        ),
        raw: item,
      };
    });

    setParsed(results);
  }

  // Remove a row
  function handleRemoveRow(index: number) {
    if (!parsed) return;
    const updated = parsed.filter((p) => p.index !== index);
    setParsed(updated.length > 0 ? updated : null);
  }

  // Computed
  const validTasks = useMemo(
    () => (parsed ?? []).filter((p) => p.values !== null),
    [parsed]
  );
  const invalidCount = (parsed ?? []).filter((p) => p.values === null).length;

  // Copy template
  function handleCopyTemplate() {
    navigator.clipboard.writeText(JSON.stringify(TEMPLATE, null, 2));
  }

  // Submit
  async function handleCreate() {
    const values = validTasks
      .map((p) => p.values)
      .filter((v): v is TaskFormValues => v !== null);

    if (values.length === 0) return;

    await bulkCreate.mutateAsync(values);
    // Reset
    setJsonInput("");
    setParsed(null);
    setParseError(null);
    onOpenChange(false);
    onSuccess?.();
  }

  // Reset when dialog closes
  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setJsonInput("");
      setParsed(null);
      setParseError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Import Tasks</DialogTitle>
          <DialogDescription>
            Paste a JSON array of tasks to create multiple tasks at once.
          </DialogDescription>
        </DialogHeader>

        {!parsed ? (
          /* Input step */
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <Label htmlFor="json-input">JSON Input</Label>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCopyTemplate}
              >
                <CopyIcon className="size-3" />
                Copy Template
              </Button>
            </div>
            <Textarea
              id="json-input"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={`[\n  {\n    "task_type": "social_media_posting",\n    "title": "...",\n    "description": "...",\n    "details": "...",\n    "amount": 20,\n    "reward": 5,\n    "allow_multiple_submissions": false\n  }\n]`}
              className="flex-1 min-h-[200px] font-mono text-xs"
            />
            {parseError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircleIcon className="size-4 shrink-0" />
                {parseError}
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleParse}
                disabled={!jsonInput.trim()}
              >
                <UploadIcon className="size-4" />
                Parse & Validate
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Preview step */
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Summary */}
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "gap-1",
                  validTasks.length > 0 && "border-emerald-300 text-emerald-700"
                )}
              >
                <CheckCircle2Icon className="size-3" />
                {validTasks.length} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircleIcon className="size-3" />
                  {invalidCount} invalid
                </Badge>
              )}
            </div>

            {/* Table preview */}
            <ScrollArea className="flex-1 min-h-0 rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((item) => (
                    <TableRow
                      key={item.index}
                      className={cn(
                        item.values === null && "bg-destructive/5"
                      )}
                    >
                      <TableCell className="text-xs text-muted-foreground">
                        {item.index + 1}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm font-medium">
                        {item.values?.title ??
                          (typeof item.raw === "object" && item.raw !== null && "title" in item.raw
                            ? String((item.raw as Record<string, unknown>).title)
                            : "\u2014")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.values?.task_type ??
                          (typeof item.raw === "object" && item.raw !== null && "task_type" in item.raw
                            ? String((item.raw as Record<string, unknown>).task_type)
                            : "\u2014")}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.values?.amount ?? "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {item.values ? `$${item.values.reward.toFixed(2)}` : "\u2014"}
                      </TableCell>
                      <TableCell>
                        {item.values ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-300 bg-emerald-50 text-emerald-700 text-[10px]"
                          >
                            Valid
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge variant="destructive" className="text-[10px]">
                              Invalid
                            </Badge>
                            {item.errors.map((err, i) => (
                              <p key={i} className="text-[10px] text-destructive">
                                {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveRow(item.index)}
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setParsed(null)}
              >
                Back
              </Button>
              <Button
                onClick={handleCreate}
                disabled={validTasks.length === 0 || bulkCreate.isPending}
              >
                {bulkCreate.isPending && (
                  <Loader2Icon className="size-4 animate-spin" />
                )}
                Create {validTasks.length} Task{validTasks.length !== 1 ? "s" : ""}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
