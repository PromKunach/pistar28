"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import Image from "next/image";
import { Marquee } from "@/components/ui/marquee";

type Profile = {
  filename: string;
  url: string;
  id: string;
  full_name_th: string;
  nickname_th: string;
};

export default function ProfileSearchMarquee({
  profiles,
  visible = true,
}: {
  profiles: Profile[];
  visible?: boolean;
}) {
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();

  const filtered = profiles.filter(
    (p) =>
      p.full_name_th?.toLowerCase().startsWith(q) ||
      p.nickname_th?.toLowerCase().startsWith(q)
  );

  const avatar = (p: Profile) => (
    <div key={p.id} className="card mx-2 flex w-24 shrink-0 flex-col items-center gap-1">
      <div className="h-24 w-24 overflow-hidden rounded-[64px]">
        <Image
          src={p.url}
          alt={p.full_name_th}
          width={96}
          height={96}
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );

  return (
    <div className={visible ? undefined : "hidden"} aria-hidden={!visible}>
      <div className="mx-auto mt-8 mb-12 flex max-w-2xl items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ลองพิมพ์ชื่อ/ชื่อเล่นของคนที่คุณกำลังมองหา"
          className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
        />
      </div>

      {query === "" ? (
        <Marquee className="[--duration:60s]" >{filtered.map(avatar)}</Marquee>
      ) : (
        <div className="flex flex-wrap  justify-center gap-2 min-w-[100%] overflow-auto no-scrollbar">
          {filtered.map(avatar)}
        </div>
      )}
    </div>
  );
}
