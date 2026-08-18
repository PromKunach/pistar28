"use client";

import { useEffect, useState } from "react";
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
  const [priceInput, setPriceInput] = useState(
    dish.price === 0 ? "" : String(dish.price)
  );

  useEffect(() => {
    setPriceInput(dish.price === 0 ? "" : String(dish.price));
  }, [dish.id]);

  const handlePriceChange = (raw: string) => {
    setPriceInput(raw);
    if (raw === "" || raw === ".") {
      onChange({ ...dish, price: 0 });
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange({ ...dish, price: parsed });
    }
  };

  const toggleEater = (personId: string) => {
    const has = dish.eaterIds.includes(personId);
    const eaterIds = has
      ? dish.eaterIds.filter((id) => id !== personId)
      : [...dish.eaterIds, personId];
    onChange({ ...dish, eaterIds });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={dish.name}
            onChange={(e) => onChange({ ...dish, name: e.target.value })}
            placeholder="ชื่อเมนู"
            className="h-8"
          />
        </div>
        <Input
          type="number"
          min={0}
          step="0.01"
          value={priceInput}
          onChange={(e) => handlePriceChange(e.target.value)}
          placeholder="ราคา"
          className="h-8 w-24"
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-red-600"
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
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground hover:bg-muted"
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
