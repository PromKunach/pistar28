"use client";

import { useRef } from "react";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import type { CardStickerEditProps } from "./cardStickerTypes";
import { CardStickerEditor } from "./CardStickerEditor";
import { CardStickerLayer } from "./CardStickerLayer";
import type { MemberProfile } from "./types";

export function MemberCardBack({
  profile,
  customization,
  stickerEdit,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  stickerEdit?: CardStickerEditProps;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const bio = profile.bio?.trim() ?? "";

  return (
    <div
      ref={cardRef}
      className="relative flex h-full w-full flex-col overflow-visible rounded-[1.75rem] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/10"
      style={{
        backgroundColor: customization.card_color,
        color: customization.card_text_color,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />

      <div className="relative flex min-h-0 flex-1 flex-col p-3.5 sm:p-5">
        <div className="flex items-center gap-2.5 border-b border-current/10 pb-3 sm:gap-3 sm:pb-4">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-current/25 sm:h-11 sm:w-11">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.url}
              alt=""
              decoding="async"
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
          <p className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {profile.nickname_th}
          </p>
        </div>

        {bio ? (
          <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed opacity-80 sm:mt-4 sm:text-sm">
            {bio}
          </p>
        ) : null}
      </div>

      {stickerEdit ? (
        <CardStickerEditor containerRef={cardRef} {...stickerEdit} />
      ) : (
        <CardStickerLayer stickers={customization.card_stickers.back} />
      )}
    </div>
  );
}
