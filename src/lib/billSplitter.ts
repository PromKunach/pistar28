export type RoundMode = "none" | "up" | "down" | "nearest";

export type BillPerson = { id: string; name: string };
export type BillDish = { id: string; name: string; price: number; eaterIds: string[] };

export type PersonDishShare = {
  dishId: string;
  dishName: string;
  amount: number;
};

export type PersonBillResult = {
  personId: string;
  displayName: string;
  dishes: PersonDishShare[];
  dishShare: number;
  sharedShare: number;
  foodShare: number;
  vatShare: number;
  total: number;
};

export type ItemizedBillResult = {
  overallTotal: number;
  assignedTotal: number;
  remainder: number;
  vatTotal: number;
  grandTotal: number;
  people: PersonBillResult[];
};

export type ItemizedBillInput = {
  people: BillPerson[];
  dishes: BillDish[];
  overallTotal: number;
  vatPercent: number;
  roundMode: RoundMode;
};

export function getDishDisplayName(dish: BillDish, index: number): string {
  const trimmed = dish.name.trim();
  return trimmed.length > 0 ? trimmed : `เมนูที่ ${index + 1}`;
}

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
  if (!Number.isFinite(input.overallTotal) || input.overallTotal <= 0) {
    return "กรุณากรอกยอดรวมบิลให้ถูกต้อง";
  }
  if (!Number.isFinite(input.vatPercent) || input.vatPercent < 0 || input.vatPercent > 100) {
    return "VAT ต้องอยู่ระหว่าง 0–100";
  }

  let assignedTotal = 0;
  for (const dish of input.dishes) {
    if (!Number.isFinite(dish.price) || dish.price <= 0) {
      return "กรุณากรอกราคาเมนูให้ถูกต้อง";
    }
    if (dish.eaterIds.length < 1) return "เลือกผู้รับผิดชอบแต่ละเมนู";
    assignedTotal += dish.price;
  }

  if (assignedTotal > input.overallTotal) {
    return "ราคาเมนูรวมเกินยอดบิล";
  }

  return null;
}

export function calculateItemizedBill(input: ItemizedBillInput): ItemizedBillResult | null {
  const validationError = validateItemizedBillInput(input);
  if (validationError) return null;

  const dishByPerson = new Map<string, number>();
  const dishesByPerson = new Map<string, PersonDishShare[]>();
  for (const person of input.people) {
    dishByPerson.set(person.id, 0);
    dishesByPerson.set(person.id, []);
  }

  let assignedTotal = 0;
  for (const [dishIndex, dish] of input.dishes.entries()) {
    assignedTotal += dish.price;
    const share = dish.price / dish.eaterIds.length;
    const dishName = getDishDisplayName(dish, dishIndex);
    for (const eaterId of dish.eaterIds) {
      dishByPerson.set(eaterId, (dishByPerson.get(eaterId) ?? 0) + share);
      const roundedShare = Math.round(share * 100) / 100;
      dishesByPerson.get(eaterId)!.push({
        dishId: dish.id,
        dishName,
        amount: roundedShare,
      });
    }
  }

  const remainder = input.overallTotal - assignedTotal;
  const sharedSharePerPerson = remainder / input.people.length;

  const vatTotal = input.overallTotal * (input.vatPercent / 100);
  const vatSharePerPerson = vatTotal / input.people.length;

  const people: PersonBillResult[] = input.people.map((person, index) => {
    const dishShare = dishByPerson.get(person.id) ?? 0;
    const sharedShare = sharedSharePerPerson;
    const foodShare = dishShare + sharedShare;
    const vatShare = vatSharePerPerson;
    const rawTotal = foodShare + vatShare;
    return {
      personId: person.id,
      displayName: getPersonDisplayName(person, index),
      dishes: dishesByPerson.get(person.id) ?? [],
      dishShare: Math.round(dishShare * 100) / 100,
      sharedShare: Math.round(sharedShare * 100) / 100,
      foodShare: Math.round(foodShare * 100) / 100,
      vatShare: Math.round(vatShare * 100) / 100,
      total: applyRoundMode(rawTotal, input.roundMode),
    };
  });

  const grandTotal = people.reduce((sum, person) => sum + person.total, 0);

  return {
    overallTotal: Math.round(input.overallTotal * 100) / 100,
    assignedTotal: Math.round(assignedTotal * 100) / 100,
    remainder: Math.round(remainder * 100) / 100,
    vatTotal: Math.round(vatTotal * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    people,
  };
}
