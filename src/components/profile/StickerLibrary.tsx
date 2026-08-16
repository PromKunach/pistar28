"use client";

import { STICKER_CATALOG } from "@/lib/stickerCatalog";
import { cn } from "@/lib/utils";

export function StickerLibrary({
  activeStickerId,
  onSelect,
}: {
  activeStickerId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-900">สติกเกอร์</p>
      <p className="text-xs text-slate-500">เลือกสติกเกอร์แล้วคลิกบนการ์ดเพื่อวาง (สูงสุด 5 ต่อด้าน)</p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {STICKER_CATALOG.map((sticker) => {
          const isActive = activeStickerId === sticker.id;
          return (
            <button
              key={sticker.id}
              type="button"
              title={sticker.label}
              onClick={() => onSelect(sticker.id)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border bg-white p-2 transition-colors hover:bg-slate-50",
                isActive
                  ? "border-slate-900 ring-2 ring-slate-900 ring-offset-2"
                  : "border-slate-200"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.src}
                alt={sticker.label}
                draggable={false}
                className="h-full w-full object-contain"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
