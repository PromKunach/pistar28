import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function ToolPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      <Link
        href="/tools"
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" />
        เครื่องมือทั้งหมด
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      ) : null}
    </header>
  );
}
