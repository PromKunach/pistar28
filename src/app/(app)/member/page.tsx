"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/lib/userProfile";
import { InertialScrollArea } from "@/components/ui/inertial-scroll";
import { AvatarSelectorItem } from "@/components/member/AvatarSelectorItem";
import { MEMBER_CARD_PANEL_BLEED_CLASS } from "@/components/member/cardDimensions";
import { MemberInspectCard } from "@/components/member/MemberInspectCard";
import type { MemberProfile } from "@/components/member/types";
import {
  normalizeBio,
  normalizeCustomization,
  type ProfileCustomization,
} from "@/lib/profileCustomization";

import { SquigglyText } from "@/components/ui/squiggly-text";

type Profile = MemberProfile & {
  complete_name_th: string;
  customization: ProfileCustomization;
};

const PFP_COUNT = 32;
const SKELETON_COUNT = 6;

function getPfpUrl(index: number) {
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return data.publicUrl;
}

function MemberListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3.5 rounded-full border border-slate-200 px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="h-14 w-14 shrink-0 rounded-full bg-slate-200 sm:h-16 sm:w-16" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex min-h-full animate-pulse flex-col items-center justify-center px-6 py-12">
      <div className="h-[22rem] w-[15.5rem] rounded-[1.75rem] bg-slate-200 sm:h-[32rem] sm:w-[22.5rem] lg:h-[34rem] lg:w-[24rem]" />
    </div>
  );
}

function MemberDetailPanel({
  profiles,
  selectedId,
  authStudentId,
  authEmail,
}: {
  profiles: Profile[];
  selectedId: string;
  authStudentId: string | null;
  authEmail: string | null;
}) {
  const selectedProfile =
    profiles.find((p) => String(p.id) === selectedId) ?? profiles[0];

  if (!selectedProfile) return null;

  const isOwnProfile =
    Boolean(authStudentId) && selectedProfile.pbri_id === authStudentId;
  const profileWithEmail =
    isOwnProfile && authEmail
      ? { ...selectedProfile, email: authEmail }
      : selectedProfile;

  return (
    <div className="flex w-full flex-col items-center justify-center px-4 py-4 sm:px-6 sm:py-8 lg:min-h-full lg:py-12">
      <MemberInspectCard
        resetKey={selectedProfile.id}
        profile={profileWithEmail}
        customization={selectedProfile.customization}
        ariaLabel={`การ์ดของ ${selectedProfile.full_name_th} — ลากเพื่อหมุน คลิกเพื่อพลิก`}
      />
    </div>
  );
}

const MIN_SCALE = 0.72;
const MAX_SCALE = 1;
const MAX_DIST = 160;

const IDLE_FRAMES_BEFORE_SLEEP = 12;

function useCenterScale(
  containerRef: React.RefObject<HTMLDivElement | null>,
  itemRefs: React.RefObject<Map<string, HTMLButtonElement>>,
  axis: "x" | "y",
  viewportRef?: React.RefObject<HTMLElement | null>,
  itemCount = 0
) {
  useEffect(() => {
    const maybeViewport = viewportRef?.current ?? containerRef.current;
    if (!maybeViewport) return;
    const viewport: HTMLElement = maybeViewport;

    const applied = new Map<HTMLElement, number>();
    let rafId = 0;
    let idleFrames = 0;

    function paint() {
      const rect = viewport.getBoundingClientRect();
      const center = axis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
      const items = Array.from(itemRefs.current.values());

      const centers = items.map((el) => {
        const r = el.getBoundingClientRect();
        return axis === "x" ? r.left + r.width / 2 : r.top + r.height / 2;
      });

      let changed = false;
      items.forEach((el, i) => {
        const dist = Math.min(Math.abs(centers[i] - center), MAX_DIST);
        const t = 1 - dist / MAX_DIST;
        const previous = applied.get(el);
        if (previous !== undefined && Math.abs(previous - t) < 0.004) return;

        applied.set(el, t);
        changed = true;
        el.style.transform = `scale(${MIN_SCALE + t * (MAX_SCALE - MIN_SCALE)})`;
        el.style.opacity = `${0.55 + 0.45 * t}`;
        el.style.zIndex = String(Math.round(t * 100));
      });

      return changed;
    }

    function loop() {
      idleFrames = paint() ? 0 : idleFrames + 1;
      if (idleFrames > IDLE_FRAMES_BEFORE_SLEEP) {
        rafId = 0;
        return;
      }
      rafId = requestAnimationFrame(loop);
    }

    function wake() {
      idleFrames = 0;
      if (!rafId) rafId = requestAnimationFrame(loop);
    }

    wake();
    viewport.addEventListener("scroll", wake, { passive: true });
    const ro = new ResizeObserver(wake);
    ro.observe(viewport);

    return () => {
      viewport.removeEventListener("scroll", wake);
      ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [axis, containerRef, itemRefs, viewportRef, itemCount]);
}

function scrollToCenter(viewport: HTMLElement, item: HTMLElement, axis: "x" | "y") {
  const vRect = viewport.getBoundingClientRect();
  const iRect = item.getBoundingClientRect();

  if (axis === "y") {
    const delta = iRect.top + iRect.height / 2 - (vRect.top + vRect.height / 2);
    viewport.scrollTo({ top: viewport.scrollTop + delta, behavior: "smooth" });
  } else {
    const delta = iRect.left + iRect.width / 2 - (vRect.left + vRect.width / 2);
    viewport.scrollTo({ left: viewport.scrollLeft + delta, behavior: "smooth" });
  }
}

function AvatarCarousel({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [edgePadding, setEdgePadding] = useState(0);

  useCenterScale(containerRef, itemRefs, "x", undefined, profiles.length);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function updatePadding() {
      const first = itemRefs.current.values().next().value as HTMLButtonElement | undefined;
      if (!first || !container) return;
      const itemWidth = first.getBoundingClientRect().width;
      setEdgePadding(Math.max(0, container.clientWidth / 2 - itemWidth / 2));
    }
    updatePadding();

    const ro = new ResizeObserver(updatePadding);
    ro.observe(container);
    return () => ro.disconnect();
  }, [profiles.length]);

  useEffect(() => {
    if (!selectedId || !containerRef.current) return;
    const item = itemRefs.current.get(selectedId);
    if (item) scrollToCenter(containerRef.current, item, "x");
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto py-3"
      style={{ paddingLeft: edgePadding, paddingRight: edgePadding }}
    >
      {profiles.map((profile) => (
        <AvatarSelectorItem
          key={profile.id}
          profile={profile}
          customization={profile.customization}
          isSelected={String(profile.id) === selectedId}
          onClick={() => onSelect(String(profile.id))}
          buttonRef={(el) => {
            if (el) itemRefs.current.set(profile.id, el);
            else itemRefs.current.delete(profile.id);
          }}
        />
      ))}
    </div>
  );
}

function MemberList({
  profiles,
  selectedId,
  onSelect,
}: {
  profiles: Profile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const viewportRef = useRef<HTMLElement | null>(null);
  const [edgePadding, setEdgePadding] = useState(0);

  useEffect(() => {
    const viewport = containerRef.current?.parentElement ?? null;
    viewportRef.current = viewport;
    if (!viewport) return;

    const firstItem = itemRefs.current.values().next().value as HTMLButtonElement | undefined;
    const itemHeight = firstItem?.getBoundingClientRect().height ?? 88;

    function updatePadding() {
      if (!viewport) return;
      setEdgePadding(Math.max(0, viewport.clientHeight / 2 - itemHeight / 2));
    }
    updatePadding();

    const ro = new ResizeObserver(updatePadding);
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [profiles.length]);

  useCenterScale(containerRef, itemRefs, "y", viewportRef, profiles.length);

  useEffect(() => {
    if (!selectedId || !viewportRef.current) return;
    const item = itemRefs.current.get(selectedId);
    if (item) scrollToCenter(viewportRef.current, item, "y");
  }, [selectedId]);

  return (
    <div
      ref={containerRef}
      className="space-y-2"
      style={{ paddingBottom: edgePadding }}
    >
      <div className="flex h-[20rem] w-full items-center justify-center">
        <h1 className="text-center text-5xl font-medium leading-tight text-neutral-900 md:text-5xl lg:text-6xl dark:text-neutral-100 font-noto">
          <p>สมาชิกทั้งหมดของ</p>
          <SquigglyText
            stepDuration={100}
            scale={[6, 9]}
            className="text-amber-500 font-bold"
          >
            PISTAR
          </SquigglyText>{" "}
          <SquigglyText
            stepDuration={100}
            scale={[6, 9]}
            className="text-blue-500 font-bold"
          >
            28
          </SquigglyText>
        </h1>
      </div>
      {profiles.map((profile) => {
        const isSelected = String(profile.id) === selectedId;

        return (
          <button
            key={profile.id}
            ref={(el) => {
              if (el) itemRefs.current.set(profile.id, el);
              else itemRefs.current.delete(profile.id);
            }}
            type="button"
            onClick={() => onSelect(String(profile.id))}
            style={{ transformOrigin: "center" }}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-full border-2 px-4 py-3.5 text-left shadow-md transition-all duration-200 ease-out sm:gap-4 sm:px-5 sm:py-4",
              isSelected
                ? "border-slate-400 bg-slate-100 shadow-lg"
                : "border-transparent bg-white hover:bg-slate-50"
            )}
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-slate-200 sm:h-16 sm:w-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.url}
                alt={profile.full_name_th}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-base text-slate-900 sm:text-lg">
                {profile.full_name_th}
              </p>
              <p className="truncate text-sm text-slate-500">{profile.nickname_th}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function MemberPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
          <section className="order-1 w-full lg:order-2 lg:w-[45%] xl:w-[40%]">
            <DetailSkeleton />
          </section>
          <section className="order-2 flex w-full flex-col border-t border-slate-200 lg:order-1 lg:w-[55%] xl:w-[60%] lg:border-t-0 lg:border-r">
            <div className="border-b border-slate-100 p-4">
              <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <MemberListSkeleton />
            </div>
          </section>
        </div>
      }
    >
      <MemberPageContent />
    </Suspense>
  );
}

function MemberPageContent() {
  const searchParams = useSearchParams();
  const memberParam = searchParams.get("member");
  const { user } = useCurrentUser();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, complete_name_th, pbri_id, nickname_th, section, full_name_th, card_color, card_text_color, card_stickers, selector_stickers, privacy_settings, bio"
        )
        .order("id", { ascending: true });

      if (error) {
        console.error(error);
        setError("ไม่สามารถโหลดข้อมูลสมาชิกได้");
      } else {
        const withImages = (data ?? []).map((row, i) => ({
          id: String(row.id),
          complete_name_th: row.complete_name_th ?? "",
          full_name_th: row.full_name_th ?? "",
          nickname_th: row.nickname_th ?? "",
          pbri_id: String(row.pbri_id ?? ""),
          section: row.section ?? "",
          url: getPfpUrl(i),
          bio: normalizeBio(row.bio),
          customization: normalizeCustomization(row),
        }));
        setProfiles(withImages);
        if (withImages.length > 0) {
          const fromParam =
            memberParam && withImages.some((p) => String(p.id) === memberParam)
              ? memberParam
              : null;
          setSelectedId(fromParam ?? String(withImages[0].id));
        }
      }
      setLoading(false);
    }

    fetchProfiles();
  }, [memberParam]);

  useEffect(() => {
    if (!memberParam || profiles.length === 0) return;
    if (profiles.some((p) => String(p.id) === memberParam)) {
      setSelectedId(memberParam);
    }
  }, [memberParam, profiles]);

  useEffect(() => {
    profiles.forEach((profile) => {
      const img = new window.Image();
      img.src = profile.url;
    });
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter(
      (p) =>
        p.full_name_th?.toLowerCase().includes(q) ||
        p.nickname_th?.toLowerCase().includes(q) ||
        p.section?.toLowerCase().includes(q)
    );
  }, [profiles, query]);

  if (loading) {
    return (
      <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
        <section className="order-1 w-full lg:order-2 lg:w-[45%] xl:w-[40%]">
          <DetailSkeleton />
        </section>
        <section className="order-2 flex w-full flex-col border-t border-slate-200 lg:order-1 lg:w-[55%] xl:w-[60%] lg:border-t-0 lg:border-r">
          <div className="border-b border-slate-100 p-4">
            <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
          </div>
          <div className="flex-1 overflow-hidden p-4">
            <MemberListSkeleton />
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return <p className="p-6 text-red-600">{error}</p>;
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      <section className="order-2 flex min-h-0 flex-1 w-full flex-col border-t border-slate-200 lg:order-1 lg:w-[55%] xl:w-[60%] lg:flex-none lg:border-t-0 lg:border-r">
        <div className="shrink-0 border-b border-slate-100 p-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อ / ชื่อเล่น / ฝ่าย"
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="shrink-0 border-b border-slate-100 py-3 lg:hidden">
          {filteredProfiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">ไม่พบสมาชิกที่ค้นหา</p>
          ) : (
            <AvatarCarousel
              profiles={filteredProfiles}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

        <InertialScrollArea className="smooth-scrollbar hidden min-h-0 flex-1 p-4 pt-3 no-scrollbar lg:block">
          {filteredProfiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">ไม่พบสมาชิกที่ค้นหา</p>
          ) : (
            <MemberList
              profiles={filteredProfiles}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </InertialScrollArea>
      </section>

      <section className="order-1 flex min-h-0 flex-1 flex-col lg:order-2 lg:flex-none lg:w-[45%] xl:w-[40%]">
        <div
          className={`flex min-h-0 flex-1 items-center justify-center overflow-visible ${MEMBER_CARD_PANEL_BLEED_CLASS}`}
        >
          {selectedId ? (
            <MemberDetailPanel
              profiles={profiles}
              selectedId={selectedId}
              authStudentId={user?.studentId ?? null}
              authEmail={user?.email ?? null}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
              เลือกสมาชิกเพื่อดูรายละเอียด
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
