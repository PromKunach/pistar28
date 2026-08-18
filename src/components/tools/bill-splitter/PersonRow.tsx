"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { BillPerson } from "@/lib/billSplitter";
import { getPersonDisplayName } from "@/lib/billSplitter";

export function PersonRow({
  person,
  index,
  onNameChange,
  onRemove,
  canRemove,
}: {
  person: BillPerson;
  index: number;
  onNameChange: (name: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">
        {getPersonDisplayName(person, index)}
      </span>
      <div className="flex-1">
        <Input
          value={person.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="ชื่อ (ไม่บังคับ)"
          className="h-8"
        />
      </div>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
          aria-label="ลบคน"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
