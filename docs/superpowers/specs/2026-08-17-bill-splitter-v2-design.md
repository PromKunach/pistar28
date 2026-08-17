# Bill Splitter v2 (Itemized) Design Spec

**Date:** 2026-08-17  
**Status:** Approved  
**Route:** `/tools/bill-splitter`

## Summary

Replace the simple equal-split bill calculator with an **itemized bill splitter**. Users add people (optional names), add dishes with prices, assign each dish to the people who ate it, apply **VAT** proportionally, and see a per-person breakdown.

## Requirements

| Requirement | Detail |
|---|---|
| People | Add/remove profiles; name optional → display `คนที่ 1`, `คนที่ 2`, … |
| Dishes | Name + price (บาท); assign ≥1 eater per dish |
| Dish split | Price split **equally** among assigned eaters |
| VAT | Label **VAT (%)**; default **7**; applied to total food subtotal |
| VAT allocation | Each person's VAT = `(their food share / total food) × VAT amount` |
| Rounding | Per-person final total: `none` / `up` / `down` / `nearest` (same as v1) |
| Calculate | **คำนวณ** button (not live auto-recalc) |
| Results | Per-person card: อาหาร, VAT, รวม + footer summary |
| Auth | Logged-in only (unchanged) |
| Storage | Client-side React state only |
| UI language | Thai |

## Non-Goals

- Save bill history
- Import from receipt OCR
- Custom % split per dish per person
- Tip field (replaced by VAT)
- Simple equal-split mode (replaced entirely)

---

## Data Model

```typescript
type BillPerson = { id: string; name: string };
type BillDish = { id: string; name: string; price: number; eaterIds: string[] };

type PersonBillResult = {
  personId: string;
  displayName: string;
  foodShare: number;
  vatShare: number;
  total: number; // after rounding
};

type ItemizedBillResult = {
  foodSubtotal: number;
  vatTotal: number;
  grandTotal: number;
  people: PersonBillResult[];
};
```

## Calculation

For each dish with `eaterIds.length > 0`:
- `sharePerEater = dish.price / eaterIds.length`
- Add `sharePerEater` to each eater's `foodShare`

Then:
- `foodSubtotal = sum(dish.price)`
- `vatTotal = foodSubtotal × (vatPercent / 100)`
- Per person: `vatShare = (foodShare / foodSubtotal) × vatTotal` (0 if `foodSubtotal === 0`)
- `rawTotal = foodShare + vatShare`
- `total = applyRoundMode(rawTotal, roundMode)`

People with `foodShare === 0` still appear in results with 0 amounts.

## Validation (before calculate)

| Rule | Error (Thai) |
|---|---|
| No people | `เพิ่มคนอย่างน้อย 1 คน` |
| No dishes | `เพิ่มเมนูอย่างน้อย 1 รายการ` |
| Dish price ≤ 0 | `กรุณากรอกราคาเมนูให้ถูกต้อง` |
| Dish with 0 eaters | `เลือกผู้รับผิดชอบแต่ละเมนู` |
| VAT not 0–100 | `VAT ต้องอยู่ระหว่าง 0–100` |

## UI Layout (single page, top → bottom)

1. **คน** — person cards + **+ เพิ่มคน**
2. **เมนู** — dish rows with eater checkboxes + **+ เพิ่มเมนู** + `รวมอาหาร: ฿X`
3. **VAT (%)** + **ปัดเศษ**
4. **คำนวณ** button
5. **ผลลัพธ์** — per-person cards + summary footer

## Hub card update

Change description from `หารค่าใช้จ่ายเท่าๆ กัน` → `แบ่งบิลตามเมนูและ VAT`

## Files

| File | Action |
|---|---|
| `src/lib/billSplitter.ts` | Replace with itemized logic |
| `src/lib/billSplitter.test.ts` | Replace tests |
| `src/components/tools/bill-splitter/PersonRow.tsx` | Create |
| `src/components/tools/bill-splitter/DishRow.tsx` | Create |
| `src/components/tools/bill-splitter/BillResultSection.tsx` | Create |
| `src/app/(app)/tools/bill-splitter/page.tsx` | Replace UI |
| `src/app/(app)/tools/page.tsx` | Update hub card description |

## Testing

- Unit: shared dish split, VAT proportional, rounding, validation errors
- Manual: 3 people, 2 dishes with different eater sets, VAT 7%, verify totals sum correctly
