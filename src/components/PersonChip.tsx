import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "./Status";
import { cn } from "@/lib/utils";

export function PersonChip({
  name,
  hint,
  className,
}: {
  name: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="size-9">
        <AvatarFallback className="bg-secondary text-xs">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}
