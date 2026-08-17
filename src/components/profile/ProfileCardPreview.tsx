"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { MemberInspectCard } from "@/components/member/MemberInspectCard";
import { MemberCardBack } from "@/components/member/MemberCardBack";
import { MemberCardFront } from "@/components/member/MemberCardFront";
import { MEMBER_CARD_DIMENSION_CLASS } from "@/components/member/cardDimensions";
import type { MemberProfile } from "@/components/member/types";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { cn } from "@/lib/utils";

export function ProfileCardPreview({
  profile,
  customization,
  editMode = false,
  activeFace,
  onActiveFaceChange,
  onMoveSticker,
  onScaleSticker,
  onRotateSticker,
  onRemoveSticker,
  compact = false,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  editMode?: boolean;
  activeFace?: "front" | "back";
  onActiveFaceChange?: (face: "front" | "back") => void;
  onMoveSticker?: (face: "front" | "back", id: string, x: number, y: number) => void;
  onScaleSticker?: (face: "front" | "back", id: string, scale: number) => void;
  onRotateSticker?: (face: "front" | "back", id: string, rotation: number) => void;
  onRemoveSticker?: (face: "front" | "back", id: string) => Promise<void>;
  compact?: boolean;
}) {
  const [internalFace, setInternalFace] = useState<"front" | "back">("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const face = activeFace ?? internalFace;
  const setFace = onActiveFaceChange ?? setInternalFace;

  const stickers =
    face === "front"
      ? customization.card_stickers.front
      : customization.card_stickers.back;

  const stickerEdit = {
    stickers,
    selectedId,
    onSelect: setSelectedId,
    onMove: (id: string, x: number, y: number) => onMoveSticker?.(face, id, x, y),
    onScale: (id: string, scale: number) => onScaleSticker?.(face, id, scale),
    onRotate: (id: string, rotation: number) => onRotateSticker?.(face, id, rotation),
  };

  if (!editMode) {
    return (
      <div className={cn("flex flex-col items-center", compact && "scale-90")}>
        <MemberInspectCard
          resetKey={profile.id}
          profile={profile}
          customization={customization}
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
              setSelectedId(null);
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
        className={cn("relative overflow-visible select-none", MEMBER_CARD_DIMENSION_CLASS)}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("[data-sticker]")) {
            setSelectedId(null);
          }
        }}
      >
        {face === "front" ? (
          <MemberCardFront
            profile={profile}
            customization={customization}
            stickerEdit={stickerEdit}
          />
        ) : (
          <MemberCardBack
            profile={profile}
            customization={customization}
            stickerEdit={stickerEdit}
          />
        )}
      </div>

      {selectedId !== null && (
        <button
          type="button"
          onClick={() => {
            void onRemoveSticker?.(face, selectedId);
            setSelectedId(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          ลบสติกเกอร์
        </button>
      )}

      <p className="text-center text-xs text-slate-500">
        ลากเพื่อย้าย · จุดมุมเพื่อปรับขนาด · จุดบนเพื่อหมุน · กดลบเพื่อนำออก
      </p>
    </div>
  );
}
