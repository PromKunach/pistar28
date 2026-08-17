"use client";

import Image from "next/image";

import type { MemberRosterEntry } from "@/lib/memberRoster";
import { cn } from "@/lib/utils";

export function MemberBlacklistPicker({
  members,
  excludedIds,
  onToggle,
}: {
  members: MemberRosterEntry[];
  excludedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  const eligible = members.length - excludedIds.size;

  return (
    <div>
      <p className="mb-3 text-sm text-slate-600">
        เข้าร่วม {eligible} / {members.length} คน · แตะเพื่อยกเว้น
      </p>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {members.map((member) => {
          const excluded = excludedIds.has(member.id);
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => onToggle(member.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors",
                excluded
                  ? "border-red-200 bg-red-50 opacity-60"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              )}
            >
              <Image
                src={member.url}
                alt={member.nickname_th}
                width={48}
                height={48}
                className="h-12 w-12 rounded-full object-cover"
              />
              <span className="line-clamp-2 text-[10px] font-medium text-slate-700">
                {member.nickname_th}
              </span>
              {excluded ? (
                <span className="text-[9px] font-medium text-red-600">ยกเว้น</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
