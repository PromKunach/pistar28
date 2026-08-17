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
