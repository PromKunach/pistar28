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
      className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-sm text-slate-500">{description}</p>
      </div>
    </Link>
  );
}
