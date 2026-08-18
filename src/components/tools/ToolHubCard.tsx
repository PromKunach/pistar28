import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function ToolHubCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}
