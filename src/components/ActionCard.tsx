import { FolderOpen, Plus, Lock } from "lucide-react";

type ActionCardProps = {
  title: string;
  description: string;
  cta: string;
  ctaAsInput?: boolean;
  variant: "dropzone" | "rows" | "lock";
};

export default function ActionCard({
  title,
  description,
  cta,
  ctaAsInput = false,
  variant,
}: ActionCardProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-dashed border-slate-200 bg-white p-5">
      {/* Visual area */}
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60">
        {variant === "dropzone" && (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <FolderOpen className="h-9 w-9" />
            <span className="text-xs font-medium text-slate-400">
              Drop a folder, or a zip
            </span>
          </div>
        )}
        {variant === "rows" && (
          <div className="w-full space-y-3 px-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-orange-300" />
                <div className="h-2 flex-1 rounded-full bg-orange-100" />
                <div className="h-2 w-10 rounded-full bg-slate-100" />
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white">
                  <Plus className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>
        )}
        {variant === "lock" && (
          <div className="flex h-24 w-32 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex gap-1 border-b border-slate-100 px-2 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
              <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <Lock className="h-6 w-6 text-orange-500" />
            </div>
          </div>
        )}
      </div>

      {/* Copy */}
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">
        {description}
      </p>

      {/* CTA */}
      {ctaAsInput ? (
        <input
          type="text"
          placeholder={cta}
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
        />
      ) : (
        <button className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-fit sm:px-4">
          {cta}
        </button>
      )}
    </div>
  );
}
