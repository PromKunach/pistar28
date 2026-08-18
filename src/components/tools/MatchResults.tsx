"use client";

import Image from "next/image";

import type { MemberRosterEntry } from "@/lib/memberRoster";

function MemberChip({ member }: { member: MemberRosterEntry }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2 py-1 text-xs">
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

export function MatchResults({
  groups,
  membersById,
  mode,
}: {
  groups: string[][];
  membersById: Map<string, MemberRosterEntry>;
  mode: "pair" | "group";
}) {
  return (
    <div className="space-y-4">
      {groups.map((group, index) => (
        <div key={index} className="rounded-xl border border-border bg-muted p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {mode === "pair" ? `คู่ที่ ${index + 1}` : `กลุ่ม ${index + 1}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {group.map((id) => {
              const member = membersById.get(id);
              if (!member) return null;
              return <MemberChip key={id} member={member} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
