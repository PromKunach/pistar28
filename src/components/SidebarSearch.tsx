"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

const PFP_COUNT = 32;

type SearchProfile = {
  id: string;
  full_name_th: string;
  nickname_th: string;
  section: string;
  pbri_id: string;
  complete_name_th: string;
  url: string;
};

function getPfpUrl(index: number) {
  const filename = `pfp_${(index % PFP_COUNT) + 1}.JPG`;
  const { data } = supabase.storage.from("images").getPublicUrl(`images/pfp/${filename}`);
  return data.publicUrl;
}

function profileMatches(profile: SearchProfile, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    profile.full_name_th,
    profile.nickname_th,
    profile.section,
    profile.pbri_id,
    profile.complete_name_th,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

type SidebarSearchProps = {
  desktopCollapsed: boolean;
  labelClass: string;
  onCloseMobile?: () => void;
};

export function SidebarSearch({
  desktopCollapsed,
  labelClass,
  onCloseMobile,
}: SidebarSearchProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [profiles, setProfiles] = useState<SearchProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadProfiles = useCallback(async () => {
    if (profiles.length > 0) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name_th, nickname_th, section, pbri_id, complete_name_th")
      .order("id", { ascending: true });

    if (!error && data) {
      setProfiles(
        data.map((row, i) => ({
          id: String(row.id),
          full_name_th: row.full_name_th ?? "",
          nickname_th: row.nickname_th ?? "",
          section: row.section ?? "",
          pbri_id: String(row.pbri_id ?? ""),
          complete_name_th: row.complete_name_th ?? "",
          url: getPfpUrl(i),
        }))
      );
    }
    setLoading(false);
  }, [profiles.length]);

  const openSearch = useCallback(() => {
    setOpen(true);
    void loadProfiles();
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [loadProfiles]);

  const closeSearch = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return profiles.slice(0, 8);
    return profiles.filter((p) => profileMatches(p, q)).slice(0, 12);
  }, [profiles, query]);

  const selectProfile = useCallback(
    (id: string) => {
      router.push(`/member?member=${encodeURIComponent(id)}`);
      closeSearch();
      onCloseMobile?.();
    },
    [router, closeSearch, onCloseMobile]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) {
          closeSearch();
        } else {
          openSearch();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openSearch, closeSearch]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [query, open]);

  const onPaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeSearch();
      return;
    }
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) selectProfile(target.id);
    }
  };

  return (
    <>
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={openSearch}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 hover:bg-slate-100",
            desktopCollapsed ? "lg:justify-center" : ""
          )}
          aria-label="ค้นหาสมาชิก"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className={cn("flex-1 text-left", labelClass)}>ค้นหา...</span>
          <kbd
            className={cn(
              "rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400",
              labelClass
            )}
          >
            Ctrl K
          </kbd>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] bg-black/25 p-4 sm:p-8"
          onClick={closeSearch}
          role="presentation"
        >
          <div
            className="mx-auto mt-[10vh] w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onPaletteKeyDown}
          >
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ค้นหาชื่อ / ชื่อเล่น / ฝ่าย / รหัส"
                className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
                aria-label="ค้นหาสมาชิก"
              />
              <kbd className="hidden rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline">
                Esc
              </kbd>
            </div>

            <div className="max-h-[min(24rem,60vh)] overflow-y-auto p-2">
              {loading ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">กำลังโหลด...</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-slate-500">
                  {query.trim() ? "ไม่พบสมาชิกที่ค้นหา" : "ไม่มีข้อมูลสมาชิก"}
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {filtered.map((profile, index) => (
                    <li key={profile.id}>
                      <button
                        type="button"
                        onClick={() => selectProfile(profile.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          index === activeIndex
                            ? "bg-slate-100 text-slate-900"
                            : "text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                          <Image
                            src={profile.url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{profile.full_name_th}</p>
                          <p className="truncate text-xs text-slate-500">
                            {profile.nickname_th}
                            {profile.section ? ` · ${profile.section}` : ""}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!query.trim() && profiles.length > 0 ? (
              <p className="border-t border-slate-100 px-4 py-2 text-center text-[11px] text-slate-400">
                พิมพ์เพื่อค้นหา · ↑↓ เลือก · Enter เปิดการ์ด
              </p>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
