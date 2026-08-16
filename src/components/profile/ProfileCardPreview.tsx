"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { MemberInspectCard } from "@/components/member/MemberInspectCard";
import { MemberCardBack } from "@/components/member/MemberCardBack";
import { MemberCardFront } from "@/components/member/MemberCardFront";
import { CardStickerLayer } from "@/components/member/CardStickerLayer";
import type { MemberProfile } from "@/components/member/types";
import type { CardSticker, ProfileCustomization } from "@/lib/profileCustomization";
import { cn } from "@/lib/utils";

export function ProfileCardPreview({
  profile,
  customization,
  editMode = false,
  activeStickerId,
  activeFace,
  onActiveFaceChange,
  onPlaceSticker,
  onRemoveSticker,
  showEmail = false,
  compact = false,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  editMode?: boolean;
  activeStickerId?: string | null;
  activeFace?: "front" | "back";
  onActiveFaceChange?: (face: "front" | "back") => void;
  onPlaceSticker?: (face: "front" | "back", x: number, y: number) => void;
  onRemoveSticker?: (face: "front" | "back", index: number) => void;
  showEmail?: boolean;
  compact?: boolean;
}) {
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const face = activeFace ?? internalFace;
  const setFace = onActiveFaceChange ?? setInternalFace;

  function handleCardClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!editMode) return;

    const target = event.target as HTMLElement;
    if (target.closest("[data-sticker]")) return;

    if (!activeStickerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    onPlaceSticker?.(face, x, y);
    setSelectedIndex(null);
  }

  function handleStickerClick(index: number, event: React.MouseEvent) {
    if (!editMode) return;
    event.stopPropagation();
    setSelectedIndex(index);
  }

  const stickers =
    face === "front"
      ? customization.card_stickers.front
      : customization.card_stickers.back;

  const displayCustomization: ProfileCustomization =
    editMode
      ? {
          ...customization,
          card_stickers: {
            front: face === "front" ? [] : customization.card_stickers.front,
            back: face === "back" ? [] : customization.card_stickers.back,
          },
        }
      : customization;

  if (!editMode) {
    return (
      <div className={cn("flex flex-col items-center", compact && "scale-90")}>
        <MemberInspectCard
          resetKey={profile.id}
          profile={profile}
          customization={customization}
          showEmail={showEmail}
          ariaLabel={`ตัวอย่างการ์ดของ ${profile.full_name_th}`}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {(["front", "back"] as const).map((side) => (
          <button
            key={side}
            type="button"
            onClick={() => {
              setFace(side);
              setSelectedIndex(null);
            }}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              face === side
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {side === "front" ? "ด้านหน้า" : "ด้านหลัง"}
          </button>
        ))}
      </div>

      <div
        className="relative h-[22rem] w-[15.5rem] cursor-crosshair sm:h-[28rem] sm:w-[20rem]"
        onClick={handleCardClick}
      >
        {face === "front" ? (
          <MemberCardFront profile={profile} customization={displayCustomization} editable />
        ) : (
          <MemberCardBack
            profile={profile}
            customization={displayCustomization}
            showEmail={showEmail}
          />
        )}

        {editMode && (
          <div className="pointer-events-none absolute inset-0">
            {stickers.map((sticker, index) => (
              <EditableSticker
                key={`${sticker.id}-${index}-${sticker.x}-${sticker.y}`}
                sticker={sticker}
                selected={selectedIndex === index}
                onClick={(e) => handleStickerClick(index, e)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedIndex !== null && editMode && (
        <button
          type="button"
          onClick={() => {
            onRemoveSticker?.(face, selectedIndex);
            setSelectedIndex(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          ลบสติกเกอร์
        </button>
      )}

      <p className="text-center text-xs text-slate-500">
        {activeStickerId
          ? "คลิกบนการ์ดเพื่อวางสติกเกอร์"
          : "เลือกสติกเกอร์จากคลังด้านล่าง"}
      </p>
    </div>
  );
}

function EditableSticker({
  sticker,
  selected,
  onClick,
}: {
  sticker: CardSticker;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      data-sticker
      className="pointer-events-auto absolute z-30"
      style={{
        left: `${sticker.x * 100}%`,
        top: `${sticker.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg) scale(${sticker.scale})`,
      }}
      onClick={onClick}
    >
      <CardStickerLayer stickers={[sticker]} editable />
      {selected && (
        <span className="absolute -inset-2 rounded-full border-2 border-dashed border-slate-900" />
      )}
    </div>
  );
}
