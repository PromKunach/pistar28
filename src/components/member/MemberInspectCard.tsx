"use client";

import { InspectCard } from "@/components/ui/inspect-card";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { MemberCardBack } from "./MemberCardBack";
import { MemberCardFront } from "./MemberCardFront";
import type { MemberProfile } from "./types";

export function MemberInspectCard({
  profile,
  customization,
  showEmail = false,
  resetKey,
  ariaLabel,
}: {
  profile: MemberProfile;
  customization: ProfileCustomization;
  showEmail?: boolean;
  resetKey?: string | number | null;
  ariaLabel?: string;
}) {
  return (
    <InspectCard
      resetKey={resetKey}
      ariaLabel={ariaLabel ?? `การ์ดของ ${profile.full_name_th} — ลากเพื่อหมุน คลิกเพื่อพลิก`}
      front={<MemberCardFront profile={profile} customization={customization} />}
      back={
        <MemberCardBack
          profile={profile}
          customization={customization}
          showEmail={showEmail}
        />
      }
    />
  );
}
