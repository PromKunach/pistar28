"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CircleDollarSign, Palette, Utensils, Megaphone, LaptopMinimal, Crown, BookOpenText, MapPinned, PartyPopper, MicVocal, Users, X, ChevronUp } from "lucide-react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { LayeredOrbitingCircles } from "@/components/ui/orbiting-circles";
import { Highlighter } from "@/components/ui/highlighter";

type Profile = {
  id: string;
  complete_name_th: string;
  full_name_th: string;
  nickname_th: string;
  section: string;
  url: string;
};

type RoleLabel =
  | "หัวหน้าฝ่าย"
  | "หัวหน้าฝ่าย(ตัวจริง)"
  | "สมาชิก"
  | "เลขานุการ"
  | "ประธาน"
  | "รองประธาน";

const PFP_COUNT = 32;

function getPfpUrl(index: number) {
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return data.publicUrl;
}

function getMoneyUrl(name: "twenty" | "hundred" | "thousand") {
  const { data } = supabase.storage.from("images").getPublicUrl(`images/other/${name}.png`);
  return data.publicUrl;
}

const IT_AI_BRANDS = [
  { id: "ai-claude", label: "Claude", company: "Anthropic", url: "/images/ai/claude.svg" },
  { id: "ai-gemini", label: "Gemini", company: "Google", url: "/images/ai/gemini.svg" },
  { id: "ai-cursor", label: "Cursor", company: "Anysphere", url: "/images/ai/cursor.svg" },
] as const;

function brandToProfile(brand: { id: string; label: string; url: string }): Profile {
  const meta = IT_AI_BRANDS.find((b) => b.id === brand.id);
  const company = meta?.company ?? brand.label;

  return {
    id: brand.id,
    complete_name_th: company,
    full_name_th: company,
    nickname_th: brand.label,
    section: "IT",
    url: brand.url,
  };
}

function profileInSection(profile: Profile, sectionId: string, sectionLabel: string) {
  const value = profile.section?.trim() ?? "";
  return (
    value === sectionId ||
    value === sectionLabel ||
    value.toLowerCase() === sectionId.toLowerCase() ||
    value.toLowerCase() === sectionLabel.toLowerCase()
  );
}

const SECTION_HEADS: Record<string, string> = {
  Management: "นายนพณัฐ คงขำ",
  Academic: "นายปภังกร สมบูรณ์สินชัย",
  Place: "นางสาวประภาภรณ์ สุขสุวรรณ",
  Entertainment: "นายนิพพิชฌจ์ โลหวัฒนกิจ",
  Activity: "นายปรัตถกร จันทรไพร",
  Art: "นายศุภวิชญ์ นวมภักดี",
  Welfare: "นายยศพนธ์ เกตุแก้ว",
  PR: "นายภูวดล กุลปรางค์ทอง",
  IT: "นายณัชพงศ์ ฉ่ำมณี",
  Treasurer: "นางสาวภทรนฤน คงเพ็ชรศักดิ์",
};

const MANAGEMENT_ORBIT_MEMBERS = [
  "นายรวีเกตุการณ์ เกตุการณ์",
  "นายชยพล มากศิริ",
  "นายปวริศร อรรคอุดม",
];

const MANAGEMENT_ROLES: Record<string, RoleLabel> = {
  "นายนพณัฐ คงขำ": "ประธาน",
  "นายรวีเกตุการณ์ เกตุการณ์": "รองประธาน",
  "นายชยพล มากศิริ": "เลขานุการ",
  "นายปวริศร อรรคอุดม": "เลขานุการ",
};

function normalizeName(name: string) {
  return name
    .replace(/^(นาย|นางสาว|นาง|ด\.ช\.|ด\.ญ\.)\s*/u, "")
    .replace(/\s+/g, "")
    .trim();
}

function findProfileByName(profiles: Profile[], targetName: string) {
  const target = normalizeName(targetName);
  return profiles.find((p) => {
    const names = [p.full_name_th, p.complete_name_th].filter(Boolean);
    return names.some((n) => {
      const normalized = normalizeName(n);
      return normalized === target || normalized.includes(target) || target.includes(normalized);
    });
  });
}

function getRoleLabel(profile: Profile, sectionId: string, headId?: string): RoleLabel {
  if (sectionId === "Management") {
    for (const [name, role] of Object.entries(MANAGEMENT_ROLES)) {
      if (normalizeName(profile.full_name_th) === normalizeName(name) ||
          normalizeName(profile.complete_name_th) === normalizeName(name)) {
        return role;
      }
    }
  }
  if (headId && String(profile.id) === String(headId)) return "หัวหน้าฝ่าย";
  return "สมาชิก";
}

const SECTION_DESCRIPTIONS: Record<string, string> = {
  Management: "ดูแลภาพรวมการทำงานของสภานักศึกษา วางแผน ตัดสินใจ และประสานงานทุกฝ่าย",
  Academic: "ดูแลกิจกรรมด้านวิชาการ ติวสอบ และส่งเสริมการเรียนรู้ของนักศึกษา",
  Place: "จัดเตรียมสถานที่ อุปกรณ์ และดูแลความเรียบร้อยของงานทุกกิจกรรม",
  Entertainment: "สร้างความสนุกสนาน ดูแลเกมและกิจกรรมสันทนาการในงานต่าง ๆ",
  Activity: "วางแผนและดำเนินกิจกรรมของนักศึกษาให้ราบรื่นตลอดปีการศึกษา",
  Art: "ออกแบบงานศิลป์ ฉาก ป้าย และตกแต่งบรรยากาศของทุกกิจกรรม",
  Welfare: "ดูแลอาหาร เครื่องดื่ม และสวัสดิการของนักศึกษาและทีมงาน",
  PR: "ประชาสัมพันธ์ข่าวสาร ถ่ายภาพ และดูแลสื่อออนไลน์ของสภานักศึกษา",
  IT: "ดูแลระบบ เว็บไซต์ อุปกรณ์เทคโนโลยี และงานสื่อดิจิทัล",
  Treasurer: "ดูแลรายรับรายจ่าย งบประมาณ และบัญชีของสภานักศึกษา",
};

const ROLE_STYLES: Record<RoleLabel, string> = {
  ประธาน: "bg-amber-100 text-amber-700",
  รองประธาน: "bg-orange-100 text-orange-700",
  เลขานุการ: "bg-violet-100 text-violet-700",
  หัวหน้าฝ่าย: "bg-sky-100 text-sky-700",
  "หัวหน้าฝ่าย(ตัวจริง)": "bg-indigo-100 text-indigo-700",
  สมาชิก: "bg-slate-100 text-slate-600",
};

function SectionPanelContent({
  section,
  head,
  members,
  roleOf,
}: {
  section: Section;
  head?: Profile;
  members: Profile[];
  roleOf: (profile: Profile) => RoleLabel;
}) {
  const Icon = section.icon;
  const people = head ? [head, ...members.filter((m) => m.id !== head.id)] : members;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-5 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">ฝ่าย</p>
            <h2 className="truncate text-lg font-semibold leading-tight text-slate-900">
              {section.label}
            </h2>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          {SECTION_DESCRIPTIONS[section.id]}
        </p>

        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          <Users className="h-3.5 w-3.5" />
          {people.length} คน
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-3 py-3">
        {people.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-slate-400">ยังไม่มีสมาชิกในฝ่ายนี้</p>
        ) : (
          <ul className="space-y-1">
            {people.map((person) => {
              const role = roleOf(person);
              return (
                <li
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50"
                >
                  <div className="relative h-11 w-11 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={person.url}
                      alt={person.full_name_th}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full rounded-full object-cover ring-1 ring-slate-200"
                    />
                    {head && person.id === head.id && (
                      <Crown className="absolute -right-1 -top-1.5 h-4 w-4 rotate-12 fill-yellow-400 text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {person.full_name_th}
                    </p>
                    <p className="truncate text-xs text-slate-500">{person.nickname_th}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      ROLE_STYLES[role]
                    )}
                  >
                    {role}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const SECTION_HIGHLIGHT_COLORS: Record<string, string> = {
  Management: "#fde68a80",
  Academic: "#bfdbfe80",
  Place: "#bbf7d080",
  Entertainment: "#fbcfe880",
  Activity: "#fed7aa80",
  Art: "#e9d5ff80",
  Welfare: "#fecdd380",
  PR: "#a5f3fc80",
  IT: "#c7d2fe80",
  Treasurer: "#d9f99d80",
};

const SECTION_TRANSITION: Variants = {
  initial: { opacity: 0, filter: "blur(6px)" },
  animate: {
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    filter: "blur(4px)",
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  },
};

function PersonPopupCard({
  profile,
  role,
  position,
  popupRef,
  animateIn,
  sectionId,
}: {
  profile: Profile;
  role: RoleLabel;
  position: { x: number; y: number };
  popupRef: React.RefObject<HTMLDivElement | null>;
  animateIn: boolean;
  sectionId: string;
}) {
  const highlightColor = SECTION_HIGHLIGHT_COLORS[sectionId] ?? "#fde68a";

  return (
    <motion.div
      ref={popupRef}
      initial={animateIn ? { opacity: 0, y: 12, scale: 0.9 } : false}
      animate={{ opacity: 1, y: 0, scale: 1, left: position.x, top: position.y }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 28,
        mass: 0.8,
      }}
      className="fixed z-[9999] w-60 -translate-x-1/2 -translate-y-[calc(100%+14px)] rounded-xl bg-white px-4 py-3.5 text-center shadow-[0_16px_40px_-12px_rgba(15,23,42,0.35)] lg:w-44 lg:px-3 lg:py-2.5 lg:-translate-y-[calc(100%+10px)] xl:w-60 xl:px-4 xl:py-3.5 xl:-translate-y-[calc(100%+14px)]"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-xs font-medium text-slate-400 lg:text-[10px] xl:text-xs">{role}</p>
      <p className="mt-2 text-2xl font-bold leading-tight text-slate-900 lg:mt-1.5 lg:text-lg xl:mt-2 xl:text-2xl" style={{ opacity: 0.85 }}>
        <Highlighter
          key={profile.id}
          color={highlightColor}
          action="highlight"
          padding={4}
          animationDuration={700}
          iterations={5}
        >
          {profile.nickname_th}
        </Highlighter>
   
      </p>
      <p className="mt-2 text-sm leading-snug text-slate-600 lg:mt-1.5 lg:text-xs xl:mt-2 xl:text-sm">{profile.full_name_th}</p>
    </motion.div>
  );
}
type Section = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const SECTIONS: Section[] = [
  { id: "Management", label: "บริหาร", icon: Crown },
  { id: "Academic", label: "วิชาการ", icon: BookOpenText },
  { id: "Place", label: "สถานที่และอุปกรณ์", icon: MapPinned },
  { id: "Entertainment", label: "สันทนาการ", icon: MicVocal },
  { id: "Activity", label: "กิจกรรม", icon: PartyPopper },
  { id: "Art", label: "ศิลป์", icon: Palette },
  { id: "Welfare", label: "สวัสดิการ", icon: Utensils },
  { id: "PR", label: "ประชาสัมพันธ์", icon: Megaphone },
  { id: "IT", label: "เทคโนโลยีสารสนเทศ", icon: LaptopMinimal },
  { id: "Treasurer", label: "เหรัญญิก", icon: CircleDollarSign },
];

function resolveSectionId(value: string | null | undefined): string {
  if (!value?.trim()) return SECTIONS[0].id;
  const raw = value.trim();
  const byId = SECTIONS.find((s) => s.id.toLowerCase() === raw.toLowerCase());
  if (byId) return byId.id;
  const byLabel = SECTIONS.find(
    (s) =>
      s.label === raw ||
      s.label.includes(raw) ||
      raw.includes(s.label) ||
      s.label.toLowerCase() === raw.toLowerCase()
  );
  if (byLabel) return byLabel.id;
  return SECTIONS[0].id;
}

function DockButton({
  icon: Icon,
  label,
  isSelected,
  onClick,
  axis,
}: {
  icon: LucideIcon;
  label: string;
  isSelected: boolean;
  onClick: () => void;
  axis: "x" | "y";
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isSelected) {
      setShow(false);
      return;
    }
    setShow(false);
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, [isSelected]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={cn(
          "shadow-md flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out",
          isSelected
            ? "scale-110 border-slate-900 bg-black text-white shadow-lg"
            : axis === "y"
            ? "scale-100 border-slate-200 bg-white text-slate-500 hover:translate-x-1 hover:border-slate-400 hover:text-slate-900"
            : "scale-100 border-slate-200 bg-white text-slate-500 hover:-translate-y-1 hover:border-slate-400 hover:text-slate-900"
        )}
      >
        <Icon className="h-5 w-5" />
      </button>

      {isSelected && (
        <div
          className={cn(
            "pointer-events-none absolute z-10 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-md ring-1 ring-black-300 transition-all duration-300 ease-out lg:inline hidden",
            axis === "y"
              ? "left-full top-1/2 ml-3 -translate-y-1/2"
              : "bottom-full left-1/2 mb-3 -translate-x-1/2",
            show
              ? "opacity-100 " + (axis === "y" ? "translate-x-5" : "translate-y-0")
              : "opacity-0 " + (axis === "y" ? "-translate-x-1" : "translate-y-1")
          )}
        >
          <div className="bg-black w-10 h-[1px] absolute top-[50%] left-[-42px] hidden lg:inline"></div>
          {label}
        </div>
      )}
    </div>
  );
}

function SectionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedId, setSelectedId] = useState(() =>
    resolveSectionId(searchParams.get("section"))
  );
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [activePopup, setActivePopup] = useState<{
    id: string;
    profile: Profile;
    role: RoleLabel;
  } | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const activeAnchorRef = useRef<HTMLElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const popupWasOpenRef = useRef(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const selected = SECTIONS.find((s) => s.id === selectedId) ?? SECTIONS[0];

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    if (fromUrl) setSelectedId(resolveSectionId(fromUrl));
  }, [searchParams]);

  function selectSection(id: string) {
    setSelectedId(id);
    router.replace(`/member/section?section=${encodeURIComponent(id)}`, {
      scroll: false,
    });
  }

  useEffect(() => {
    setActivePopupId(null);
    setActivePopup(null);
    activeAnchorRef.current = null;
    popupWasOpenRef.current = false;
    setMobilePanelOpen(false);
  }, [selectedId]);

  useEffect(() => {
    if (!activePopup || !activeAnchorRef.current) return;

    const updatePosition = () => {
      const el = activeAnchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPopupPosition({
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    };

    updatePosition();
    let rafId = requestAnimationFrame(function loop() {
      updatePosition();
      rafId = requestAnimationFrame(loop);
    });

    return () => cancelAnimationFrame(rafId);
  }, [activePopup]);

  function openPersonPopup(
    id: string,
    profile: Profile,
    role: RoleLabel,
    anchor: HTMLElement
  ) {
    if (activePopup?.id === id) {
      setActivePopup(null);
      setActivePopupId(null);
      activeAnchorRef.current = null;
      popupWasOpenRef.current = false;
      return;
    }

    activeAnchorRef.current = anchor;
    setActivePopup({ id, profile, role });
    setActivePopupId(id);
  }

  function closePersonPopup() {
    setActivePopup(null);
    setActivePopupId(null);
    activeAnchorRef.current = null;
    popupWasOpenRef.current = false;
  }

  useEffect(() => {
    if (!activePopup) return;

    popupWasOpenRef.current = true;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (activeAnchorRef.current?.contains(target)) return;
      if (popupRef.current?.contains(target)) return;
      closePersonPopup();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activePopup]);

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("id, complete_name_th, nickname_th, section, full_name_th")
        .order("id", { ascending: true });

      if (fetchError) {
        console.error(fetchError);
        setError("ไม่สามารถโหลดข้อมูลสมาชิกได้");
      } else {
        const withImages = (data ?? []).map((row, i) => ({
          ...row,
          url: getPfpUrl(i),
        }));
        setProfiles(withImages);
      }
      setLoading(false);
    }

    fetchProfiles();
  }, []);

  const sectionMembers = useMemo(
    () => profiles.filter((p) => profileInSection(p, selected.id, selected.label)),
    [profiles, selected.id, selected.label]
  );

  const sectionHead = useMemo(
    () => findProfileByName(profiles, SECTION_HEADS[selected.id] ?? ""),
    [profiles, selected.id]
  );

  const orbitMembers = useMemo(() => {
    if (selected.id === "Management") {
      return MANAGEMENT_ORBIT_MEMBERS.map((name) => findProfileByName(profiles, name)).filter(
        (profile): profile is Profile => Boolean(profile)
      );
    }

    return sectionHead
      ? sectionMembers.filter((p) => p.id !== sectionHead.id)
      : sectionMembers;
  }, [profiles, selected.id, sectionHead, sectionMembers]);

  type OrbitItem =
    | { kind: "profile"; id: string; profile: Profile }
    | { kind: "money"; id: string; url: string }
    | { kind: "brand"; id: string; url: string; label: string };

  const orbitItems = useMemo<OrbitItem[]>(() => {
    if (selected.id === "Treasurer" && orbitMembers.length === 0) {
      return ([
        { kind: "money", id: "money-twenty", name: "twenty" },
        { kind: "money", id: "money-hundred", name: "hundred" },
        { kind: "money", id: "money-thousand", name: "thousand" },
      ] as const).map((item) => ({
        kind: "money" as const,
        id: item.id,
        url: getMoneyUrl(item.name),
      }));
    }

    const profileItems: OrbitItem[] = orbitMembers.map((profile) => ({
      kind: "profile" as const,
      id: String(profile.id),
      profile,
    }));

    if (selected.id === "IT") {
      const brandItems: OrbitItem[] = IT_AI_BRANDS.map((brand) => ({
        kind: "brand" as const,
        id: brand.id,
        url: brand.url,
        label: brand.label,
      }));
      return [...profileItems, ...brandItems];
    }

    return profileItems;
  }, [selected.id, orbitMembers]);

  const maxPerLayer = useMemo(() => {
    const count = orbitItems.length;
    if (count <= 2) return Math.max(1, count);
    if (count === 3) return 2;
    return Math.ceil(count / 2);
  }, [orbitItems.length]);

  const showEmptyOrbit = !sectionHead && orbitItems.length === 0;

  useEffect(() => {
    orbitMembers.forEach((profile) => {
      const img = new window.Image();
      img.src = profile.url;
    });
    if (selected.id === "IT") {
      IT_AI_BRANDS.forEach((brand) => {
        const img = new window.Image();
        img.src = brand.url;
      });
    }
    if (sectionHead) {
      const img = new window.Image();
      img.src = sectionHead.url;
    }
  }, [orbitMembers, sectionHead, selected.id]);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden lg:flex-row">
      {/* Desktop: vertical dock, ~20% */}
      <aside className="hidden shrink-0 flex-col items-center justify-center gap-4  py-8 lg:flex lg:w-[7%]">
          <div className="ml-8 shrink-0 flex-col items-center shadow-md justify-center gap-4 p-[18px] w-20 rounded-full   py-8 lg:flex  border-neutral-200 ring-1 ring-slate-300">
          
          {SECTIONS.map((s) => (
          <DockButton
            key={s.id}
            icon={s.icon}
            label={s.label}
            axis="y"
            isSelected={s.id === selectedId}
            onClick={() => selectSection(s.id)}
          />
        ))}
          </div>
        
      </aside>

      {/* Right side: content + mobile label + mobile dock, ~80% on desktop */}
      <div className="flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">

          <div className="relative flex h-full min-h-[420px] w-full flex-col items-center justify-center overflow-hidden">
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-24 w-24 animate-pulse rounded-full bg-slate-200" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
              </div>
            ) : (
              <>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={selected.id}
                    variants={SECTION_TRANSITION}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute inset-0"
                  >
                    <LayeredOrbitingCircles
                      items={orbitItems}
                      getItemKey={(item) => item.id}
                      baseRadius={130}
                      radiusStep={110}
                      baseIconSize={
                        orbitItems.some((item) => item.kind === "money") ? 96 : 68
                      }
                      maxPerLayer={maxPerLayer}
                      renderItem={(item) =>
                        item.kind === "money" ? (
                          <div className="flex h-full w-full items-center justify-center overflow-visible">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.url}
                              alt=""
                              decoding="async"
                              className="h-[145%] w-[145%] max-w-none object-contain"
                            />
                          </div>
                        ) : item.kind === "brand" ? (
                          <button
                            type="button"
                            className="relative h-full w-full cursor-pointer overflow-visible rounded-full"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPersonPopup(
                                item.id,
                                brandToProfile(item),
                                "หัวหน้าฝ่าย(ตัวจริง)",
                                e.currentTarget
                              );
                            }}
                          >
                            <div
                              className={cn(
                                "flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white p-2 ring-1 ring-slate-200 transition-shadow",
                                activePopupId === item.id && "ring-2 ring-slate-900 shadow-lg"
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt=""
                                decoding="async"
                                className="h-full w-full object-contain"
                              />
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="relative h-full w-full cursor-pointer overflow-visible rounded-full"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPersonPopup(
                                item.id,
                                item.profile,
                                getRoleLabel(item.profile, selected.id, sectionHead?.id),
                                e.currentTarget
                              );
                            }}
                          >
                            <div
                              className={cn(
                                "h-full w-full overflow-hidden rounded-full bg-white ring-1 ring-slate-200 transition-shadow",
                                activePopupId === item.id && "ring-2 ring-slate-900 shadow-lg"
                              )}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.profile.url}
                                alt=""
                                decoding="async"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </button>
                        )
                      }
                    />
                    <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                      {sectionHead ? (
                        <button
                          type="button"
                          className="relative flex h-20 w-20 cursor-pointer items-center justify-center rounded-full bg-white shadow-md"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            openPersonPopup(
                              `head-${sectionHead.id}`,
                              sectionHead,
                              getRoleLabel(sectionHead, selected.id, sectionHead.id),
                              e.currentTarget
                            );
                          }}
                        >
                          <div
                            className={cn(
                              "relative h-full w-full rounded-full transition-shadow",
                              activePopupId === `head-${sectionHead.id}` &&
                                "shadow-lg ring-2 ring-slate-900"
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sectionHead.url}
                              alt=""
                              decoding="async"
                              className="h-full w-full rounded-full object-cover"
                            />
                            <Crown className="absolute -right-1 -top-2 h-6 w-6 rotate-12 fill-yellow-400 text-yellow-400 drop-shadow" />
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-white shadow-md">
                          <selected.icon className="h-8 w-8 text-slate-700" />
                          <span className="max-w-[5.5rem] truncate text-center text-[10px] font-medium text-slate-600">
                            {selected.label.replace("ฝ่าย", "")}
                          </span>
                        </div>
                      )}
                    </div>
                    {showEmptyOrbit && (
                      <p className="absolute bottom-8 left-1/2 -translate-x-1/2 text-sm text-slate-500">
                        ยังไม่มีสมาชิกในฝ่ายนี้
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
                {typeof document !== "undefined" &&
                  createPortal(
                    <AnimatePresence>
                      {activePopup && (
                        <PersonPopupCard
                          key="person-popup-card"
                          profile={activePopup.profile}
                          role={activePopup.role}
                          position={popupPosition}
                          popupRef={popupRef}
                          animateIn={!popupWasOpenRef.current}
                          sectionId={selected.id}
                        />
                      )}
                    </AnimatePresence>,
                    document.body
                  )}
              </>
            )}
          </div>
        </div>
        </div>

        {/* Mobile: open the section detail sheet */}
        <div className="shrink-0 px-4 pt-8 lg:hidden">
          <button
            type="button"
            onClick={() => setMobilePanelOpen(true)}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <selected.icon className="h-4 w-4" />
              </span>
              <span className="text-left">
                <span className="block text-[11px] text-slate-400">ฝ่าย</span>
                <span className="block text-sm font-semibold text-slate-900">
                  {selected.label}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
              รายละเอียด
              <ChevronUp className="h-4 w-4" />
            </span>
          </button>
        </div>

        {/* Mobile: horizontal dock under the content — selected label shows above its button */}
        <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-slate-200 px-4 pb-4 pt-6 lg:hidden">
          {SECTIONS.map((s) => (
            <DockButton
              key={s.id}
              icon={s.icon}
              label={s.label}
              axis="x"
              isSelected={s.id === selectedId}
              onClick={() => selectSection(s.id)}
            />
          ))}
        </div>
      </div>

      {/* Desktop: section detail sidebar, slides in on select */}
      <aside className="hidden w-[340px] shrink-0 overflow-hidden border-l border-slate-200 bg-white lg:flex lg:flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selected.id}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SectionPanelContent
              section={selected}
              head={sectionHead}
              members={orbitMembers}
              roleOf={(profile) => getRoleLabel(profile, selected.id, sectionHead?.id)}
            />
          </motion.div>
        </AnimatePresence>
      </aside>

      {/* Mobile: section detail bottom sheet */}
      <AnimatePresence>
        {mobilePanelOpen && (
          <div className="lg:hidden">
            <motion.button
              type="button"
              aria-label="ปิดรายละเอียดฝ่าย"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobilePanelOpen(false)}
              className="fixed inset-0 z-[60] bg-slate-900/30 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32, mass: 0.9 }}
              className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[78dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.35)] md:max-h-[52dvh] md:max-w-md"
            >
              <div className="flex shrink-0 items-center justify-between px-4 pt-3">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-200" />
                <button
                  type="button"
                  aria-label="ปิด"
                  onClick={() => setMobilePanelOpen(false)}
                  className="absolute right-4 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <SectionPanelContent
                section={selected}
                head={sectionHead}
                members={orbitMembers}
                roleOf={(profile) => getRoleLabel(profile, selected.id, sectionHead?.id)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionPageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-neutral-500">
      Loading section…
    </div>
  );
}

export default function SectionPage() {
  return (
    <Suspense fallback={<SectionPageFallback />}>
      <SectionPageContent />
    </Suspense>
  );
}
