"use client";

import Image from "next/image";

import type { MemberRosterEntry } from "@/lib/memberRoster";
import type { PairFrequencyEntry } from "@/lib/matchMaker";

function MemberChip({ member }: { member: MemberRosterEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
      <Image
        src={member.url}
        alt=""
        width={20}
        height={20}
        className="h-5 w-5 rounded-full object-cover"
      />
      {member.nickname_th}
    </span>
  );
}

export function PairExperimentResults({
  entries,
  membersById,
  rounds,
}: {
  entries: PairFrequencyEntry[];
  membersById: Map<string, MemberRosterEntry>;
  rounds: number;
}) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500">ไม่มีคู่ที่จับได้จากการทดลอง</p>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const memberA = membersById.get(entry.memberA);
        const memberB = membersById.get(entry.memberB);
        if (!memberA || !memberB) return null;

        return (
          <div
            key={`${entry.memberA}|${entry.memberB}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <MemberChip member={memberA} />
              <span className="text-xs text-slate-400">+</span>
              <MemberChip member={memberB} />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {entry.count}/{rounds} ครั้ง
            </p>
          </div>
        );
      })}
    </div>
  );
}
