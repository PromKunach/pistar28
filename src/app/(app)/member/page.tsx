"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { InertialScrollArea } from "@/components/ui/inertial-scroll";
import { InspectCard } from "@/components/ui/inspect-card";

import { SquigglyText } from "@/components/ui/squiggly-text";
type Profile = {
  id: string;
  complete_name_th: string;
  pbri_id: string;
  nickname_th: string;
  section: string;
  full_name_th: string;
  url: string;
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
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
          <div className="h-12 w-12 shrink-0 rounded-full bg-slate-200" />
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

/**
 * Swaps between two stacked layers so a new photo fades in over the old one
 * without keeping every profile image mounted.
 */
function CrossfadeImage({ src, alt }: { src: string; alt: string }) {
  const [layers, setLayers] = useState(() => [{ src, key: 0 }]);
  const keyRef = useRef(0);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1].src === src) return prev;
      keyRef.current += 1;
      return [...prev.slice(-1), { src, key: keyRef.current }];
    });
  }, [src]);

  return (
    <>
      {layers.map((layer, i) => {
        const isTop = i === layers.length - 1;
        return (
          <FadeInImage
            key={layer.key}
            src={layer.src}
            alt={isTop ? alt : ""}
            instant={layers.length === 1}
          />
        );
      })}
    </>
  );
}

function FadeInImage({
  src,
  alt,
  instant,
}: {
  src: string;
  alt: string;
  instant: boolean;
}) {
  const [visible, setVisible] = useState(instant);

  useEffect(() => {
    if (instant) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

function CardFront({ profile }: { profile: Profile }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-slate-900 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10">
      <CrossfadeImage src={profile.url} alt={profile.full_name_th} />

      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/5 to-transparent" />
      <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/20" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-4">
        <Image
          src="/logo_img_white.png"
          alt="PISTAR 28"
          width={56}
          height={56}
          draggable={false}
          className="h-8 w-auto object-contain sm:h-12"
        />
        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold tracking-normal text-white/90 sm:px-2.5 sm:py-1 sm:text-xs">
          #{profile.id}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5">
        <p className="text-base font-semibold leading-snug text-white sm:text-xl">
          {profile.full_name_th}
        </p>
        <p className="mt-0.5 text-xs text-white/65 sm:text-sm">({profile.nickname_th})</p>
        <Link
          href={`/member/section?section=${encodeURIComponent(profile.section ?? "")}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 inline-flex rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[10px] text-white/85 transition-colors hover:border-white/50 hover:bg-white/20 sm:mt-3 sm:px-3 sm:py-1 sm:text-xs"
        >
          {profile.section}
        </Link>
      </div>
    </div>
  );
}

function CardBack({ profile }: { profile: Profile }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[1.75rem] bg-slate-950 shadow-[0_25px_50px_-12px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/10">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgb(148 163 184) 1px, transparent 0)",
          backgroundSize: "14px 14px",
        }}
      />
      <div className="absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-white/15" />

      <div className="relative p-3.5 sm:p-5">
        <div className="flex items-center gap-2.5 border-b border-white/10 pb-3 sm:gap-3 sm:pb-4">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-white/25 sm:h-11 sm:w-11">
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
            <p className="truncate text-xs font-semibold text-white sm:text-sm">
              {profile.full_name_th}
            </p>
            <p className="truncate text-xs text-white/55">({profile.nickname_th})</p>
            <p className="truncate text-xs text-white/55">({profile.pbri_id})</p>

          </div>
        </div>
      </div>
    </div>
  );
}

function MemberDetailPanel({
  profiles,
  selectedId,
}: {
  profiles: Profile[];
  selectedId: string;
}) {
  const selectedProfile =
    profiles.find((p) => String(p.id) === selectedId) ?? profiles[0];

  if (!selectedProfile) return null;

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-12">
      <InspectCard
        resetKey={selectedProfile.id}
        front={<CardFront profile={selectedProfile} />}
        back={<CardBack profile={selectedProfile} />}
        ariaLabel={`การ์ดของ ${selectedProfile.full_name_th} — ลากเพื่อหมุน คลิกเพื่อพลิก`}
      />
    </div>
  );
}

const MIN_SCALE = 0.72;
const MAX_SCALE = 1;
const MAX_DIST = 160; // px from center at which item hits MIN_SCALE

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

      // Read every rect first, then write — interleaving them forces a reflow per item.
      const centers = items.map((el) => {
        const r = el.getBoundingClientRect();
        return axis === "x" ? r.left + r.width / 2 : r.top + r.height / 2;
      });

      let changed = false;
      items.forEach((el, i) => {
        const dist = Math.min(Math.abs(centers[i] - center), MAX_DIST);
        const t = 1 - dist / MAX_DIST; // 1 at center, 0 at edge
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
      className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto py-2"
      style={{ paddingLeft: edgePadding, paddingRight: edgePadding }}
    >
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
            className="flex shrink-0 snap-center flex-col items-center gap-1"
            style={{ transformOrigin: "center" }}
            aria-label={profile.full_name_th}
          >
            <div
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition-colors sm:h-16 sm:w-16",
                isSelected
                  ? "border-slate-900 ring-2 ring-slate-200"
                  : "border-slate-200 hover:border-slate-400"
              )}
            >
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
      })}
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
    const itemHeight = firstItem?.getBoundingClientRect().height ?? 76;

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
      style={{  paddingBottom: edgePadding }}
    >
       <div className="flex h-[20rem] w-full items-center justify-center">
      <h1 className="text-center text-5xl font-medium leading-tight  text-neutral-900 md:text-5xl lg:text-6xl dark:text-neutral-100 font-noto ">
        <p>สมาชิกทั้งหมดของ</p>
        <SquigglyText 
          stepDuration={100}
          scale={[6, 9]}
          className="text-amber-500 font-bold"
        >
          PISTAR 
        </SquigglyText> <SquigglyText
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
              "transition-transform duration-200 ease-out flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left shadow-md ",
              isSelected
                ? "border-neutral-200 bg-slate-50 shadow-xl ring-1 ring-slate-500"
                : "border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-slate-200">
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
              <p className="truncate font-medium text-[1.5rem] text-slate-900">{profile.full_name_th}</p>
              <p className="truncate text-md text-slate-500">{profile.nickname_th}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function MemberPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, complete_name_th, pbri_id, nickname_th, section, full_name_th")
        .order("id", { ascending: true });

      if (error) {
        console.error(error);
        setError("ไม่สามารถโหลดข้อมูลสมาชิกได้");
      } else {
        const withImages = (data ?? []).map((row, i) => ({
          ...row,
          url: getPfpUrl(i),
        }));
        setProfiles(withImages);
        if (withImages.length > 0) {
          setSelectedId(String(withImages[0].id));
        }
      }
      setLoading(false);
    }

    fetchProfiles();
  }, []);

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
        <section className="order-1 w-full lg:order-2 lg:w-[65%] xl:w-[40%]">
          <DetailSkeleton />
        </section>
        <section className="order-2 flex w-full flex-col border-t border-slate-200 lg:order-1 lg:w-[35%] xl:w-[60%] lg:border-t-0 lg:border-r">
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
      {/* Left (desktop) / Bottom (mobile): search + member list */}
      <section className="order-2 flex min-h-0 w-full flex-col border-t border-slate-200 lg:order-1 lg:w-[35%] xl:w-[60%] lg:border-t-0 lg:border-r">
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

        {/* Mobile: horizontal-scrolling circle avatar selector with distance-based scaling */}
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

        {/* Desktop: full vertical list with distance-based scaling */}
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

      {/* Right (desktop) / Top (mobile): selected member detail */}
      <InertialScrollArea className="order-1 smooth-scrollbar min-h-0 w-full lg:order-2 lg:w-[65%] xl:w-[40%]">
        {selectedId ? (
          <MemberDetailPanel profiles={profiles} selectedId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
            เลือกสมาชิกเพื่อดูรายละเอียด
          </div>
        )}
      </InertialScrollArea>
    </div>
  );
}