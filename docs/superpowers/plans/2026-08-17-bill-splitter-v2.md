# Bill Splitter v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simple bill splitter with an itemized flow — people, dishes with per-eater assignment, proportional VAT, and per-person result cards.

**Architecture:** Pure calculation in `src/lib/billSplitter.ts` with Vitest tests. UI split into small components under `components/tools/bill-splitter/`. Page holds React state; **คำนวณ** button calls `calculateItemizedBill()`.

**Tech Stack:** Next.js 16.3 App Router, React 19, Vitest, Tailwind 4, existing `Input`/`Label`/`Button` UI components

## Global Constraints

- Thai UI copy for all labels and errors
- VAT label: **VAT (%)** — default **7**
- Dish price split **equally** among assigned eaters
- VAT applied to **food subtotal**, allocated **proportionally** by each person's food share
- Round modes: `none` | `up` | `down` | `nearest` — applied to **each person's final total**
- Optional person names → display `คนที่ {n}` when empty
- Calculate via **คำนวณ** button only (no live auto-recalc)
- Client-side state only; no Supabase
- Replace simple `calculateBillSplit` entirely (remove `tipPercent`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/billSplitter.ts` | Replace | Types + `calculateItemizedBill` + `applyRoundMode` |
| `src/lib/billSplitter.test.ts` | Replace | Itemized bill tests |
| `src/components/tools/bill-splitter/PersonRow.tsx` | Create | Person name input + remove |
| `src/components/tools/bill-splitter/DishRow.tsx` | Create | Dish name/price + eater checkboxes |
| `src/components/tools/bill-splitter/BillResultSection.tsx` | Create | Per-person results + summary |
| `src/app/(app)/tools/bill-splitter/page.tsx` | Replace | Full itemized UI |
| `src/app/(app)/tools/page.tsx` | Modify | Hub card description |

---

### Task 1: Itemized bill calculation lib

**Files:**
- Modify: `src/lib/billSplitter.ts`
- Modify: `src/lib/billSplitter.test.ts`

**Interfaces:**
- Produces:
  - `export type RoundMode = 'none' | 'up' | 'down' | 'nearest'`
  - `export type BillPerson = { id: string; name: string }`
  - `export type BillDish = { id: string; name: string; price: number; eaterIds: string[] }`
  - `export type PersonBillResult = { personId: string; displayName: string; foodShare: number; vatShare: number; total: number }`
  - `export type ItemizedBillResult = { foodSubtotal: number; vatTotal: number; grandTotal: number; people: PersonBillResult[] }`
  - `export type ItemizedBillInput = { people: BillPerson[]; dishes: BillDish[]; vatPercent: number; roundMode: RoundMode }`
  - `export function getPersonDisplayName(person: BillPerson, index: number): string`
  - `export function applyRoundMode(amount: number, roundMode: RoundMode): number`
  - `export function validateItemizedBillInput(input: ItemizedBillInput): string | null`
  - `export function calculateItemizedBill(input: ItemizedBillInput): ItemizedBillResult | null`

- [ ] **Step 1: Write failing tests**

Replace `src/lib/billSplitter.test.ts` with:

```typescript
import { describe, expect, it } from "vitest";
import {
  calculateItemizedBill,
  getPersonDisplayName,
  validateItemizedBillInput,
  type BillDish,
  type BillPerson,
} from "./billSplitter";

const people: BillPerson[] = [
  { id: "p1", name: "เอ" },
  { id: "p2", name: "บี" },
  { id: "p3", name: "" },
];

describe("getPersonDisplayName", () => {
  it("uses name when set", () => {
    expect(getPersonDisplayName({ id: "p1", name: "เอ" }, 0)).toBe("เอ");
  });

  it("falls back to คนที่ n", () => {
    expect(getPersonDisplayName({ id: "p3", name: "" }, 2)).toBe("คนที่ 3");
  });
});

describe("calculateItemizedBill", () => {
  it("splits shared dish equally and applies proportional VAT", () => {
    const dishes: BillDish[] = [
      { id: "d1", name: "พิซซ่า", price: 300, eaterIds: ["p1", "p2"] },
      { id: "d2", name: "ส้มตำ", price: 120, eaterIds: ["p2"] },
    ];

    const result = calculateItemizedBill({
      people,
      dishes,
      vatPercent: 7,
      roundMode: "none",
    });

    expect(result).not.toBeNull();
    // food: p1=150, p2=150+120=270, p3=0
    // foodSubtotal=420, vat=29.4
    const p1 = result!.people.find((p) => p.personId === "p1")!;
    const p2 = result!.people.find((p) => p.personId === "p2")!;
    expect(p1.foodShare).toBe(150);
    expect(p2.foodShare).toBe(270);
    expect(p1.vatShare).toBeCloseTo(10.5, 2);
    expect(p2.vatShare).toBeCloseTo(18.9, 2);
    expect(p1.total).toBeCloseTo(160.5, 2);
    expect(result!.foodSubtotal).toBe(420);
    expect(result!.vatTotal).toBeCloseTo(29.4, 2);
    expect(result!.grandTotal).toBeCloseTo(449.4, 2);
  });

  it("rounds up per person total", () => {
    const dishes: BillDish[] = [
      { id: "d1", name: "ข้าว", price: 100, eaterIds: ["p1", "p2"] },
    ];
    const result = calculateItemizedBill({
      people: people.slice(0, 2),
      dishes,
      vatPercent: 7,
      roundMode: "up",
    });
    const p1 = result!.people.find((p) => p.personId === "p1")!;
    expect(p1.total).toBe(Math.ceil(50 + 3.5));
  });
});

describe("validateItemizedBillInput", () => {
  it("requires at least one eater per dish", () => {
    const msg = validateItemizedBillInput({
      people: [{ id: "p1", name: "เอ" }],
      dishes: [{ id: "d1", name: "ข้าว", price: 100, eaterIds: [] }],
      vatPercent: 7,
      roundMode: "none",
    });
    expect(msg).toBe("เลือกผู้รับผิดชอบแต่ละเมนู");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/lib/billSplitter.test.ts`  
Expected: FAIL — `calculateItemizedBill` not exported

- [ ] **Step 3: Implement billSplitter.ts**

Replace `src/lib/billSplitter.ts` with:

```typescript
export type RoundMode = "none" | "up" | "down" | "nearest";

export type BillPerson = { id: string; name: string };
export type BillDish = { id: string; name: string; price: number; eaterIds: string[] };

export type PersonBillResult = {
  personId: string;
  displayName: string;
  foodShare: number;
  vatShare: number;
  total: number;
};

export type ItemizedBillResult = {
  foodSubtotal: number;
  vatTotal: number;
  grandTotal: number;
  people: PersonBillResult[];
};

export type ItemizedBillInput = {
  people: BillPerson[];
  dishes: BillDish[];
  vatPercent: number;
  roundMode: RoundMode;
};

export function getPersonDisplayName(person: BillPerson, index: number): string {
  const trimmed = person.name.trim();
  return trimmed.length > 0 ? trimmed : `คนที่ ${index + 1}`;
}

export function applyRoundMode(amount: number, roundMode: RoundMode): number {
  switch (roundMode) {
    case "up":
      return Math.ceil(amount);
    case "down":
      return Math.floor(amount);
    case "nearest":
      return Math.round(amount);
    default:
      return Math.round(amount * 100) / 100;
  }
}

export function validateItemizedBillInput(input: ItemizedBillInput): string | null {
  if (input.people.length < 1) return "เพิ่มคนอย่างน้อย 1 คน";
  if (input.dishes.length < 1) return "เพิ่มเมนูอย่างน้อย 1 รายการ";
  if (!Number.isFinite(input.vatPercent) || input.vatPercent < 0 || input.vatPercent > 100) {
    return "VAT ต้องอยู่ระหว่าง 0–100";
  }
  for (const dish of input.dishes) {
    if (!Number.isFinite(dish.price) || dish.price <= 0) {
      return "กรุณากรอกราคาเมนูให้ถูกต้อง";
    }
    if (dish.eaterIds.length < 1) return "เลือกผู้รับผิดชอบแต่ละเมนู";
  }
  return null;
}

export function calculateItemizedBill(input: ItemizedBillInput): ItemizedBillResult | null {
  const validationError = validateItemizedBillInput(input);
  if (validationError) return null;

  const foodByPerson = new Map<string, number>();
  for (const person of input.people) {
    foodByPerson.set(person.id, 0);
  }

  let foodSubtotal = 0;
  for (const dish of input.dishes) {
    foodSubtotal += dish.price;
    const share = dish.price / dish.eaterIds.length;
    for (const eaterId of dish.eaterIds) {
      foodByPerson.set(eaterId, (foodByPerson.get(eaterId) ?? 0) + share);
    }
  }

  const vatTotal = foodSubtotal * (input.vatPercent / 100);

  const people: PersonBillResult[] = input.people.map((person, index) => {
    const foodShare = foodByPerson.get(person.id) ?? 0;
    const vatShare =
      foodSubtotal > 0 ? (foodShare / foodSubtotal) * vatTotal : 0;
    const rawTotal = foodShare + vatShare;
    return {
      personId: person.id,
      displayName: getPersonDisplayName(person, index),
      foodShare: Math.round(foodShare * 100) / 100,
      vatShare: Math.round(vatShare * 100) / 100,
      total: applyRoundMode(rawTotal, input.roundMode),
    };
  });

  const grandTotal = people.reduce((sum, person) => sum + person.total, 0);

  return {
    foodSubtotal: Math.round(foodSubtotal * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    people,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- --run src/lib/billSplitter.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/billSplitter.ts src/lib/billSplitter.test.ts
git commit -m "feat(bill-splitter): add itemized bill calculation with VAT"
```

---

### Task 2: Bill splitter UI components

**Files:**
- Create: `src/components/tools/bill-splitter/PersonRow.tsx`
- Create: `src/components/tools/bill-splitter/DishRow.tsx`
- Create: `src/components/tools/bill-splitter/BillResultSection.tsx`

**Interfaces:**
- Produces:
  - `PersonRow({ person, index, onNameChange, onRemove, canRemove })`
  - `DishRow({ dish, people, onChange, onRemove })`
  - `BillResultSection({ result }: { result: ItemizedBillResult })`

- [ ] **Step 1: Create PersonRow.tsx**

```tsx
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
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
      <span className="w-16 shrink-0 text-xs text-slate-500">
        {getPersonDisplayName(person, index)}
      </span>
      <Input
        value={person.name}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="ชื่อ (ไม่บังคับ)"
        className="h-8 flex-1"
      />
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600"
          aria-label="ลบคน"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Create DishRow.tsx**

```tsx
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
```

- [ ] **Step 3: Create BillResultSection.tsx**

```tsx
"use client";

import type { ItemizedBillResult } from "@/lib/billSplitter";

export function BillResultSection({ result }: { result: ItemizedBillResult }) {
  return (
    <div className="mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-slate-900">ผลลัพธ์</h2>
      <div className="space-y-2">
        {result.people.map((person) => (
          <div
            key={person.personId}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="font-semibold text-slate-900">{person.displayName}</p>
            <div className="mt-2 space-y-1 text-sm text-slate-600">
              <p>อาหาร: {person.foodShare.toLocaleString("th-TH")} บาท</p>
              <p>VAT: {person.vatShare.toLocaleString("th-TH")} บาท</p>
              <p className="text-base font-semibold text-slate-900">
                รวม: {person.total.toLocaleString("th-TH")} บาท
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>รวมอาหาร: {result.foodSubtotal.toLocaleString("th-TH")} บาท</p>
        <p>VAT รวม: {result.vatTotal.toLocaleString("th-TH")} บาท</p>
        <p className="mt-1 font-semibold text-slate-900">
          ยอดรวมทั้งหมด: {result.grandTotal.toLocaleString("th-TH")} บาท
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/tools/bill-splitter/
git commit -m "feat(bill-splitter): add person, dish, and result components"
```

---

### Task 3: Bill splitter page

**Files:**
- Replace: `src/app/(app)/tools/bill-splitter/page.tsx`
- Modify: `src/app/(app)/tools/page.tsx` (hub description)

**Interfaces:**
- Consumes: all Task 1 + Task 2 exports

- [ ] **Step 1: Replace bill-splitter/page.tsx**

Key state:
```typescript
const [people, setPeople] = useState<BillPerson[]>([
  { id: crypto.randomUUID(), name: "" },
  { id: crypto.randomUUID(), name: "" },
]);
const [dishes, setDishes] = useState<BillDish[]>([]);
const [vatPercent, setVatPercent] = useState("7");
const [roundMode, setRoundMode] = useState<RoundMode>("none");
const [result, setResult] = useState<ItemizedBillResult | null>(null);
const [error, setError] = useState<string | null>(null);
```

Handlers:
- `addPerson` → append `{ id: crypto.randomUUID(), name: "" }`
- `removePerson(id)` → filter people; strip id from all `dish.eaterIds`
- `addDish` → append `{ id: crypto.randomUUID(), name: "", price: 0, eaterIds: people.map(p => p.id) }` (default all eaters)
- `handleCalculate`:
```typescript
const validationError = validateItemizedBillInput({
  people, dishes, vatPercent: Number(vatPercent), roundMode,
});
if (validationError) { setError(validationError); setResult(null); return; }
const calculated = calculateItemizedBill({ ... });
setResult(calculated);
setError(null);
```

Sections:
1. `<h2>คน</h2>` + PersonRow list + **+ เพิ่มคน**
2. `<h2>เมนู</h2>` + DishRow list + **+ เพิ่มเมนู** + food subtotal display
3. VAT + round select
4. **คำนวณ** button
5. error message + `{result && <BillResultSection result={result} />}`

Update `ToolPageHeader` description to `แบ่งบิลตามเมนูและ VAT`.

- [ ] **Step 2: Update hub card in tools/page.tsx**

Change bill splitter description:
```typescript
description: "แบ่งบิลตามเมนูและ VAT",
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/lib/billSplitter.test.ts`  
Expected: PASS

- [ ] **Step 4: Manual QA**

1. Add 3 people (2 named, 1 blank → shows คนที่ 3)
2. Add pizza ฿300 shared by 2 people, som tam ฿120 for 1 person
3. VAT 7%, คำนวณ → verify per-person cards
4. Remove eater from dish → error if none selected
5. Round up → whole baht per person

- [ ] **Step 5: Commit**

```bash
git add src/app/(app)/tools/bill-splitter/page.tsx src/app/(app)/tools/page.tsx
git commit -m "feat(bill-splitter): replace with itemized VAT bill UI"
```

---

## Spec Self-Review

| Spec requirement | Task |
|---|---|
| People with optional names | Task 2 PersonRow, Task 3 |
| Dishes + eater assignment | Task 2 DishRow, Task 3 |
| Equal split per dish | Task 1 |
| VAT proportional | Task 1 |
| Round per person | Task 1 |
| คำนวณ button | Task 3 |
| Per-person results | Task 2 BillResultSection |
| Replace simple calculator | Task 1 removes old API, Task 3 replaces page |
| Hub description update | Task 3 |

No placeholders. Types consistent across tasks.
