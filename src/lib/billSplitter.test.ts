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
  it("subtracts dishes from overall total and splits remainder equally", () => {
    const dishes: BillDish[] = [
      { id: "d1", name: "พิซซ่า", price: 300, eaterIds: ["p1", "p2"] },
      { id: "d2", name: "ส้มตำ", price: 120, eaterIds: ["p2"] },
    ];

    const result = calculateItemizedBill({
      people,
      dishes,
      overallTotal: 1000,
      vatPercent: 7,
      roundMode: "none",
    });

    expect(result).not.toBeNull();
    expect(result!.assignedTotal).toBe(420);
    expect(result!.remainder).toBe(580);
    // remainder 580 / 3 = 193.33 each
    const p1 = result!.people.find((p) => p.personId === "p1")!;
    const p2 = result!.people.find((p) => p.personId === "p2")!;
    const p3 = result!.people.find((p) => p.personId === "p3")!;
    expect(p1.dishShare).toBe(150);
    expect(p2.dishShare).toBe(270);
    expect(p1.dishes).toEqual([
      { dishId: "d1", dishName: "พิซซ่า", amount: 150 },
    ]);
    expect(p2.dishes).toEqual([
      { dishId: "d1", dishName: "พิซซ่า", amount: 150 },
      { dishId: "d2", dishName: "ส้มตำ", amount: 120 },
    ]);
    expect(p3.dishes).toEqual([]);
    expect(p1.sharedShare).toBeCloseTo(193.33, 2);
    expect(p2.sharedShare).toBeCloseTo(193.33, 2);
    expect(p3.dishShare).toBe(0);
    expect(p3.sharedShare).toBeCloseTo(193.33, 2);
    expect(p1.foodShare).toBeCloseTo(343.33, 2);
    expect(p2.foodShare).toBeCloseTo(463.33, 2);
    expect(p3.foodShare).toBeCloseTo(193.33, 2);
    expect(result!.overallTotal).toBe(1000);
    expect(result!.vatTotal).toBeCloseTo(70, 2);
    // VAT split equally: 70 / 3
    expect(p1.vatShare).toBeCloseTo(70 / 3, 2);
    expect(p2.vatShare).toBeCloseTo(70 / 3, 2);
    expect(p3.vatShare).toBeCloseTo(70 / 3, 2);
  });

  it("splits entire bill equally when no dishes", () => {
    const result = calculateItemizedBill({
      people: people.slice(0, 2),
      dishes: [],
      overallTotal: 200,
      vatPercent: 0,
      roundMode: "none",
    });

    expect(result).not.toBeNull();
    expect(result!.remainder).toBe(200);
    const p1 = result!.people.find((p) => p.personId === "p1")!;
    expect(p1.dishShare).toBe(0);
    expect(p1.dishes).toEqual([]);
    expect(p1.sharedShare).toBe(100);
    expect(p1.foodShare).toBe(100);
  });

  it("rounds up per person total", () => {
    const dishes: BillDish[] = [
      { id: "d1", name: "ข้าว", price: 100, eaterIds: ["p1", "p2"] },
    ];
    const result = calculateItemizedBill({
      people: people.slice(0, 2),
      dishes,
      overallTotal: 100,
      vatPercent: 7,
      roundMode: "up",
    });
    const p1 = result!.people.find((p) => p.personId === "p1")!;
    // dish 50 + shared 0 + equal vat (100 * 7% / 2)
    expect(p1.total).toBe(Math.ceil(50 + 3.5));
  });
});

describe("validateItemizedBillInput", () => {
  it("requires at least one eater per dish", () => {
    const msg = validateItemizedBillInput({
      people: [{ id: "p1", name: "เอ" }],
      dishes: [{ id: "d1", name: "ข้าว", price: 100, eaterIds: [] }],
      overallTotal: 500,
      vatPercent: 7,
      roundMode: "none",
    });
    expect(msg).toBe("เลือกผู้รับผิดชอบแต่ละเมนู");
  });

  it("rejects dishes exceeding overall total", () => {
    const msg = validateItemizedBillInput({
      people: [{ id: "p1", name: "เอ" }],
      dishes: [{ id: "d1", name: "ข้าว", price: 600, eaterIds: ["p1"] }],
      overallTotal: 500,
      vatPercent: 7,
      roundMode: "none",
    });
    expect(msg).toBe("ราคาเมนูรวมเกินยอดบิล");
  });
});
