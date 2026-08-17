"use client";

import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { BillDish, BillPerson } from "@/lib/billSplitter";
import { getPersonDisplayName } from "@/lib/billSplitter";
import { cn } from "@/lib/utils";

export function DishRow({
  dish,
  people,
  onChange,
  onRemove,
}: {
  dish: BillDish;
  people: BillPerson[];
  onChange: (next: BillDish) => void;
  onRemove: () => void;
}) {
  const toggleEater = (personId: string) => {
    const has = dish.eaterIds.includes(personId);
    const eaterIds = has
      ? dish.eaterIds.filter((id) => id !== personId)
      : [...dish.eaterIds, personId];
    onChange({ ...dish, eaterIds });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex gap-2">
        <Input
          value={dish.name}
          onChange={(e) => onChange({ ...dish, name: e.target.value })}
          placeholder="ชื่อเมนู"
          className="h-8 flex-1"
        />
        <Input
          type="number"
          min={0}
          step="0.01"
          value={dish.price || ""}
          onChange={(e) =>
            onChange({ ...dish, price: Number(e.target.value) || 0 })
          }
          placeholder="ราคา"
          className="h-8 w-24"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
          aria-label="ลบเมนู"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {people.map((person, index) => {
          const selected = dish.eaterIds.includes(person.id);
          return (
            <button
              key={person.id}
              type="button"
              onClick={() => toggleEater(person.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                selected
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
              )}
            >
              {getPersonDisplayName(person, index)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
