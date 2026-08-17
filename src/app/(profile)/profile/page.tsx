"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/userProfile";
import {
  DEFAULT_CUSTOMIZATION,
  fetchProfileByAuthEmail,
  normalizeBio,
  saveProfileCustomization,
  type ProfileCustomization,
  clampCardStickers,
} from "@/lib/profileCustomization";
import {
  deleteAllCardStickers,
  deleteCardSticker,
  uploadCardSticker,
  validateStickerUpload,
} from "@/lib/cardStickerUpload";
import { useProfileSection } from "@/components/profile/ProfileSectionContext";
import { CustomizePanel } from "@/components/profile/CustomizePanel";
import { PrivacyPanel } from "@/components/profile/PrivacyPanel";
import { AccountPanel } from "@/components/profile/AccountPanel";
import { ProfileCardPreview } from "@/components/profile/ProfileCardPreview";
import type { MemberProfile } from "@/components/member/types";
import { cn } from "@/lib/utils";

const PROFILE_CACHE_KEY = "pistar_profile_cache";

type ProfileCache = {
  email: string;
  profile: MemberProfile;
  customization: ProfileCustomization;
};

function readProfileCache(email: string): ProfileCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileCache;
    if (parsed.email === email && parsed.profile && parsed.customization) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeProfileCache(cache: ProfileCache) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

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
  const [draftBio, setDraftBio] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeFace, setActiveFace] = useState<"front" | "back">("front");

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login?redirect=/profile");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user?.email) return;

    const cached = readProfileCache(user.email);
    if (cached) {
      setProfile(cached.profile);
      setEmail(cached.email);
      setDraft(cached.customization);
      setDraftBio(cached.profile.bio ?? "");
      setLoading(false);
    }

    let cancelled = false;

    async function load() {
      if (!cached) {
        setLoading(true);
      }
      setLoadError(null);

      const result = await fetchProfileByAuthEmail(user!.email);

      if (cancelled) return;

      if (!result) {
        if (!cached) {
          setLoadError("ไม่พบข้อมูลโปรไฟล์");
        }
        setLoading(false);
        return;
      }

      setProfile(result.profile);
      setEmail(result.email);
      setDraft(result.customization);
      setDraftBio(result.profile.bio);
      writeProfileCache({
        email: result.email,
        profile: result.profile,
        customization: result.customization,
      });
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [ready, user?.email]);

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
      selector_stickers: [],
    };

    const { error } = await saveProfileCustomization(profile.id, normalized, draftBio);

    setSaving(false);

    if (error) {
      setSaveMessage("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
      return;
    }

    const savedBio = normalizeBio(draftBio);
    setDraftBio(savedBio);
    const updatedProfile = { ...profile, bio: savedBio };
    setProfile(updatedProfile);
    setDraft(normalized);
    writeProfileCache({
      email,
      profile: updatedProfile,
      customization: normalized,
    });
    setSaveMessage("บันทึกแล้ว");
    setTimeout(() => setSaveMessage(null), 3000);
  }, [draft, draftBio, profile, email]);

  const handleReset = useCallback(async () => {
    await deleteAllCardStickers(draft);
    setDraft({ ...DEFAULT_CUSTOMIZATION });
    setDraftBio("");
  }, [draft]);

  async function handleUploadSticker(face: "front" | "back", file: File) {
    if (!profile) return;
    const err = validateStickerUpload(draft, file);
    if (err) {
      setSaveMessage(err);
      return;
    }
    setUploading(true);
    try {
      const sticker = await uploadCardSticker(profile.id, file);
      setDraft((prev) => ({
        ...prev,
        card_stickers: {
          ...prev.card_stickers,
          [face]: [...prev.card_stickers[face], sticker],
        },
      }));
    } catch (error) {
      console.error("Sticker upload failed:", error);
      setSaveMessage("อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setUploading(false);
    }
  }

  function handleMoveSticker(face: "front" | "back", id: string, x: number, y: number) {
    setDraft((prev) => ({
      ...prev,
      card_stickers: {
        ...prev.card_stickers,
        [face]: prev.card_stickers[face].map((s) =>
          s.id === id ? { ...s, x, y } : s
        ),
      },
    }));
  }

  function handleScaleSticker(face: "front" | "back", id: string, scale: number) {
    setDraft((prev) => ({
      ...prev,
      card_stickers: {
        ...prev.card_stickers,
        [face]: prev.card_stickers[face].map((s) =>
          s.id === id ? { ...s, scale } : s
        ),
      },
    }));
  }

  function handleRotateSticker(face: "front" | "back", id: string, rotation: number) {
    setDraft((prev) => ({
      ...prev,
      card_stickers: {
        ...prev.card_stickers,
        [face]: prev.card_stickers[face].map((s) =>
          s.id === id ? { ...s, rotation } : s
        ),
      },
    }));
  }

  async function handleRemoveSticker(face: "front" | "back", id: string) {
    const sticker = draft.card_stickers[face].find((s) => s.id === id);
    if (sticker) {
      const { error } = await deleteCardSticker(sticker.storage_path);
      if (error) {
        setSaveMessage("ลบไม่สำเร็จ กรุณาลองอีกครั้ง");
        return;
      }
    }
    setDraft((prev) => ({
      ...prev,
      card_stickers: {
        ...prev.card_stickers,
        [face]: prev.card_stickers[face].filter((s) => s.id !== id),
      },
    }));
  }

  if (!ready || (loading && !profile)) {
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

  const profileWithEmail = { ...profile, email, bio: draftBio };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <section
        className={cn(
          "flex shrink-0 items-center justify-center overflow-visible border-b border-slate-100 bg-slate-50/50 p-4 lg:w-[45%] lg:border-b-0 lg:border-r",
          section !== "customize" && "py-6"
        )}
      >
        <ProfileCardPreview
          profile={profileWithEmail}
          customization={draft}
          editMode={section === "customize"}
          activeFace={activeFace}
          onActiveFaceChange={setActiveFace}
          onMoveSticker={handleMoveSticker}
          onScaleSticker={handleScaleSticker}
          onRotateSticker={handleRotateSticker}
          onRemoveSticker={handleRemoveSticker}
          compact={section !== "customize"}
        />
      </section>

      <section className="min-h-0 flex-1 lg:w-[55%]">
        {section === "customize" && (
          <CustomizePanel
            draft={draft}
            bio={draftBio}
            onBioChange={setDraftBio}
            onChange={setDraft}
            onSave={() => void handleSave()}
            onReset={() => void handleReset()}
            onUploadSticker={(file) => handleUploadSticker(activeFace, file)}
            uploading={uploading}
            saving={saving}
            saveMessage={saveMessage}
          />
        )}
        {section === "privacy" && <PrivacyPanel email={email} />}
        {section === "account" && (
          <AccountPanel profile={profileWithEmail} email={email} />
        )}
      </section>
    </div>
  );
}
