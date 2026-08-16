"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardColorPicker } from "./CardColorPicker";
import { StickerLibrary } from "./StickerLibrary";
import { SelectorStickerRing } from "@/components/member/SelectorStickerRing";
import type { MemberProfile } from "@/components/member/types";
import {
  clampSelectorStickers,
  type ProfileCustomization,
  type SelectorSticker,
} from "@/lib/profileCustomization";
import { SELECTOR_SLOTS, getStickerSrc } from "@/lib/stickerCatalog";
import { cn } from "@/lib/utils";

export function CustomizePanel({
  profile,
  draft,
  onChange,
  onSave,
  onReset,
  saving,
  saveMessage,
  activeStickerId,
  onActiveStickerIdChange,
}: {
  profile: MemberProfile;
  draft: ProfileCustomization;
  onChange: (next: ProfileCustomization) => void;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
  saveMessage: string | null;
  activeStickerId: string | null;
  onActiveStickerIdChange: (id: string | null) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<SelectorSticker["slot"] | null>(null);

  function updateDraft(partial: Partial<ProfileCustomization>) {
    onChange({ ...draft, ...partial });
  }

  function handleAssignSelectorSticker(stickerId: string) {
    if (!activeSlot) return;

    const withoutSlot = draft.selector_stickers.filter((s) => s.slot !== activeSlot);
    const next = clampSelectorStickers([
      ...withoutSlot,
      { id: stickerId, slot: activeSlot },
    ]);

    onChange({ ...draft, selector_stickers: next });
    setActiveSlot(null);
  }

  function handleStickerLibrarySelect(id: string) {
    if (activeSlot) {
      handleAssignSelectorSticker(id);
      return;
    }
    onActiveStickerIdChange(activeStickerId === id ? null : id);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ปรับแต่งการ์ด</h2>
        <p className="mt-1 text-sm text-slate-500">
          เปลี่ยนสี สติกเกอร์บนการ์ด และสติกเกอร์รอบอวตาร
        </p>
      </div>

      <CardColorPicker
        textColor={draft.card_text_color}
        cardColor={draft.card_color}
        onTextColorChange={(card_text_color) => updateDraft({ card_text_color })}
        onCardColorChange={(card_color) => updateDraft({ card_color })}
      />

      <StickerLibrary
        activeStickerId={activeSlot ? null : activeStickerId}
        onSelect={handleStickerLibrarySelect}
      />

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-900">สติกเกอร์รอบอวตาร</p>
        <p className="text-xs text-slate-500">
          เลือกตำแหน่งแล้วเลือกสติกเกอร์ (สูงสุด 3 ตำแหน่ง)
        </p>

        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200">
            <SelectorStickerRing stickers={draft.selector_stickers} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.url}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {SELECTOR_SLOTS.map((slot) => {
              const assigned = draft.selector_stickers.find((s) => s.slot === slot.id);
              const src = assigned ? getStickerSrc(assigned.id) : null;
              const isActive = activeSlot === slot.id;

              return (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setActiveSlot((current) => (current === slot.id ? null : slot.id));
                    onActiveStickerIdChange(null);
                  }}
                  className={cn(
                    "flex h-10 min-w-[3rem] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors",
                    isActive
                      ? "border-slate-900 bg-slate-100 text-slate-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}
                >
                  {src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={src} alt="" className="h-6 w-6 object-contain" />
                  ) : (
                    slot.label
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {activeSlot && (
          <p className="text-xs text-amber-700">
            เลือกสติกเกอร์จากคลังเพื่อวางที่ตำแหน่ง{" "}
            {SELECTOR_SLOTS.find((s) => s.id === activeSlot)?.label}
          </p>
        )}
      </div>

      {saveMessage && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            saveMessage.includes("สำเร็จ") || saveMessage.includes("บันทึกแล้ว")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {saveMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (confirm("รีเซ็ตการตั้งค่าการ์ดทั้งหมด?")) {
              onReset();
              onActiveStickerIdChange(null);
              setActiveSlot(null);
            }
          }}
          disabled={saving}
        >
          รีเซ็ต
        </Button>
      </div>
    </div>
  );
}
