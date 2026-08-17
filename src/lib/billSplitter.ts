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
