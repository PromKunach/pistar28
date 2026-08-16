"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/userProfile";
import {
  DEFAULT_CUSTOMIZATION,
  fetchProfileByAuthEmail,
  saveProfileCustomization,
  type ProfileCustomization,
} from "@/lib/profileCustomization";
import { useProfileSection } from "@/components/profile/ProfileSectionContext";
import { CustomizePanel } from "@/components/profile/CustomizePanel";
import { PrivacyPanel } from "@/components/profile/PrivacyPanel";
import { AccountPanel } from "@/components/profile/AccountPanel";
import { ProfileCardPreview } from "@/components/profile/ProfileCardPreview";
import type { MemberProfile } from "@/components/member/types";
import { cn } from "@/lib/utils";
import {
  clampCardStickers,
  clampSelectorStickers,
} from "@/lib/profileCustomization";

function ProfileSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-6 lg:flex-row">
      <div className="h-80 animate-pulse rounded-xl bg-slate-100 lg:w-[45%]" />
      <div className="flex-1 space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, ready } = useCurrentUser();
  const { section } = useProfileSection();

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<ProfileCustomization>(DEFAULT_CUSTOMIZATION);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<"front" | "back">("front");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?redirect=/profile");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user?.email) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);

      const result = await fetchProfileByAuthEmail(user!.email);

      if (cancelled) return;

      if (!result) {
        setLoadError("ไม่พบข้อมูลโปรไฟล์");
        setLoading(false);
        return;
      }

      setProfile(result.profile);
      setEmail(result.email);
      setDraft(result.customization);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [ready, user]);

  const handleSave = useCallback(async () => {
    if (!profile) return;

    setSaving(true);
    setSaveMessage(null);

    const normalized: ProfileCustomization = {
      ...draft,
      card_stickers: {
        front: clampCardStickers(draft.card_stickers.front, "front"),
        back: clampCardStickers(draft.card_stickers.back, "back"),
      },
      selector_stickers: clampSelectorStickers(draft.selector_stickers),
    };

    const { error } = await saveProfileCustomization(profile.id, normalized);

    setSaving(false);

    if (error) {
      setSaveMessage("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }

    setDraft(normalized);
    setSaveMessage("บันทึกแล้ว");
    setTimeout(() => setSaveMessage(null), 3000);
  }, [draft, profile]);

  const handleReset = useCallback(() => {
    setDraft({ ...DEFAULT_CUSTOMIZATION });
  }, []);

  function handlePlaceSticker(face: "front" | "back", x: number, y: number) {
    if (!activeStickerId) return;
    const current = draft.card_stickers[face];
    if (current.length >= 5) return;

    setDraft({
      ...draft,
      card_stickers: {
        ...draft.card_stickers,
        [face]: clampCardStickers(
          [...current, { id: activeStickerId, x, y, scale: 1, rotation: 0 }],
          face
        ),
      },
    });
  }

  function handleRemoveSticker(face: "front" | "back", index: number) {
    const next = [...draft.card_stickers[face]];
    next.splice(index, 1);
    setDraft({
      ...draft,
      card_stickers: {
        ...draft.card_stickers,
        [face]: next,
      },
    });
  }

  if (!ready || loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return null;
  }

  if (loadError || !profile) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <p className="text-sm text-red-600">{loadError ?? "ไม่พบข้อมูลโปรไฟล์"}</p>
      </div>
    );
  }

  const showEmail = draft.privacy_settings.show_email;
  const profileWithEmail = { ...profile, email };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section
        className={cn(
          "flex shrink-0 items-center justify-center border-b border-slate-100 bg-slate-50/50 p-4 lg:w-[45%] lg:border-b-0 lg:border-r",
          section !== "customize" && "py-6"
        )}
      >
        <ProfileCardPreview
          profile={profileWithEmail}
          customization={draft}
          editMode={section === "customize"}
          activeStickerId={activeStickerId}
          activeFace={activeFace}
          onActiveFaceChange={setActiveFace}
          onPlaceSticker={handlePlaceSticker}
          onRemoveSticker={handleRemoveSticker}
          showEmail={showEmail}
          compact={section !== "customize"}
        />
      </section>

      <section className="min-h-0 flex-1 lg:w-[55%]">
        {section === "customize" && (
          <CustomizePanel
            profile={profileWithEmail}
            draft={draft}
            onChange={setDraft}
            onSave={() => void handleSave()}
            onReset={handleReset}
            saving={saving}
            saveMessage={saveMessage}
            activeStickerId={activeStickerId}
            onActiveStickerIdChange={setActiveStickerId}
          />
        )}
        {section === "privacy" && (
          <PrivacyPanel
            draft={draft}
            onPrivacyChange={(show_email) =>
              setDraft({
                ...draft,
                privacy_settings: { show_email },
              })
            }
            email={email}
            onSave={() => void handleSave()}
            saving={saving}
            saveMessage={saveMessage}
          />
        )}
        {section === "account" && (
          <AccountPanel profile={profileWithEmail} email={email} showEmail={showEmail} />
        )}
      </section>
    </div>
  );
}
