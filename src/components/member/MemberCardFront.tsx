"use client";

import Link from "next/link";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { CardStickerLayer } from "./CardStickerLayer";
import { CrossfadeImage } from "./CrossfadeImage";
import type { MemberProfile } from "./types";

export function MemberCardFront({
  profile,
  customization,
  editable = false,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  editable?: boolean;
  activeFace?: "front" | "back";
  onPlaceSticker?: (x: number, y: number) => void;
}) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] p-3.5 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.55)] ring-1 ring-black/20 sm:p-5"
      style={{
        backgroundColor: customization.card_color,
        color: customization.card_text_color,
      }}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl ring-1 ring-current/10">
        <CrossfadeImage src={profile.url} alt={profile.full_name_th} />
        <CardStickerLayer
          stickers={customization.card_stickers.front}
          editable={editable}
        />
        <span className="absolute bottom-2 right-2 z-10 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-white/90 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2.5 sm:py-1 sm:text-xs">
          #{profile.id}
        </span>
      </div>

      <div className="mt-3 shrink-0 sm:mt-4">
        <p className="text-base font-semibold leading-snug sm:text-xl">{profile.full_name_th}</p>
        <p className="mt-0.5 text-xs opacity-55 sm:text-sm">({profile.nickname_th})</p>
        <Link
          href={`/member/section?section=${encodeURIComponent(profile.section ?? "")}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex rounded-full border border-current/15 bg-current/5 px-2.5 py-0.5 text-[10px] opacity-75 transition-colors hover:border-current/30 hover:bg-current/10 sm:mt-2.5 sm:px-3 sm:py-1 sm:text-xs"
        >
          {profile.section}
        </Link>
      </div>

      <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-current/10" />
    </div>
  );
}
