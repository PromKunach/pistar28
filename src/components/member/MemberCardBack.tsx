"use client";

import type { ProfileCustomization } from "@/lib/profileCustomization";
import { CardStickerLayer } from "./CardStickerLayer";
import type { MemberProfile } from "./types";

export function MemberCardBack({
  profile,
  customization,
  showEmail = false,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  showEmail?: boolean;
}) {
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[1.75rem] shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/10"
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
      <CardStickerLayer stickers={customization.card_stickers.back} />
      <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-current/15" />

      <div className="relative p-3.5 sm:p-5">
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
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold sm:text-sm">{profile.full_name_th}</p>
            <p className="truncate text-xs opacity-55">({profile.nickname_th})</p>
            <p className="truncate text-xs opacity-55">({profile.pbri_id})</p>
            {showEmail && profile.email ? (
              <p className="truncate text-xs opacity-55">{profile.email}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
