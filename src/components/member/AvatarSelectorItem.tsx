"use client";

import { cn } from "@/lib/utils";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { SelectorStickerRing } from "./SelectorStickerRing";
import type { MemberProfile } from "./types";

export function AvatarSelectorItem({
  profile,
  customization,
  isSelected,
  onClick,
  buttonRef,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  isSelected: boolean;
  onClick: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 snap-center items-center rounded-full border-2 p-1.5 transition-colors sm:p-2",
        isSelected
          ? "border-slate-500 bg-slate-200 shadow-md"
          : "border-transparent bg-white hover:bg-slate-50"
      )}
      style={{ transformOrigin: "center" }}
      aria-label={profile.full_name_th}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full sm:h-16 sm:w-16">
        <SelectorStickerRing stickers={customization.selector_stickers} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={profile.url}
          alt={profile.full_name_th}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    </button>
  );
}
