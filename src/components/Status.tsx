import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[40vh] flex-col items-center justify-center gap-3 text-muted-foreground",
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-card/60 px-5 py-8">
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}

export function ErrorState({
  title = "Something stalled",
  body,
}: {
  title?: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-card px-5 py-6 text-sm">
      <h3 className="font-medium text-destructive">{title}</h3>
      <p className="mt-1 text-muted-foreground">{body}</p>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
