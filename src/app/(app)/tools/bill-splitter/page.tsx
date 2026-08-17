"use client";

import { useMemo, useState } from "react";

import { BillResultSection } from "@/components/tools/bill-splitter/BillResultSection";
import { DishRow } from "@/components/tools/bill-splitter/DishRow";
import { PersonRow } from "@/components/tools/bill-splitter/PersonRow";
import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  calculateItemizedBill,
  validateItemizedBillInput,
  type BillDish,
  type BillPerson,
  type ItemizedBillResult,
  type RoundMode,
} from "@/lib/billSplitter";

const ROUND_OPTIONS: { value: RoundMode; label: string }[] = [
  { value: "none", label: "ไม่ปัด" },
  { value: "up", label: "ปัดขึ้น" },
  { value: "down", label: "ปัดลง" },
  { value: "nearest", label: "ปัดใกล้ที่สุด" },
];

export default function BillSplitterPage() {
  const [people, setPeople] = useState<BillPerson[]>([
    { id: crypto.randomUUID(), name: "" },
    { id: crypto.randomUUID(), name: "" },
  ]);
  const [dishes, setDishes] = useState<BillDish[]>([]);
  const [vatPercent, setVatPercent] = useState("7");
  const [roundMode, setRoundMode] = useState<RoundMode>("none");
  const [result, setResult] = useState<ItemizedBillResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const foodSubtotal = useMemo(
    () => dishes.reduce((sum, dish) => sum + dish.price, 0),
    [dishes]
  );

  const addPerson = () => {
    setPeople((current) => [
      ...current,
      { id: crypto.randomUUID(), name: "" },
    ]);
    setResult(null);
    setError(null);
  };

  const removePerson = (id: string) => {
    setPeople((current) => current.filter((person) => person.id !== id));
    setDishes((current) =>
      current.map((dish) => ({
        ...dish,
        eaterIds: dish.eaterIds.filter((eaterId) => eaterId !== id),
      }))
    );
    setResult(null);
    setError(null);
  };

  const addDish = () => {
    setDishes((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: "",
        price: 0,
        eaterIds: people.map((person) => person.id),
      },
    ]);
    setResult(null);
    setError(null);
  };

  const handleCalculate = () => {
    const validationError = validateItemizedBillInput({
      people,
      dishes,
      vatPercent: Number(vatPercent),
      roundMode,
    });
    if (validationError) {
      setError(validationError);
      setResult(null);
      return;
    }
    const calculated = calculateItemizedBill({
      people,
      dishes,
      vatPercent: Number(vatPercent),
      roundMode,
    });
    setResult(calculated);
    setError(null);
  };

  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <ToolPageHeader
          title="แบ่งบิล"
          description="แบ่งบิลตามเมนูและ VAT"
        />

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">คน</h2>
          <div className="space-y-2">
            {people.map((person, index) => (
              <PersonRow
                key={person.id}
                person={person}
                index={index}
                canRemove={people.length > 1}
                onNameChange={(name) => {
                  setPeople((current) =>
                    current.map((item) =>
                      item.id === person.id ? { ...item, name } : item
                    )
                  );
                  setResult(null);
                  setError(null);
                }}
                onRemove={() => removePerson(person.id)}
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addPerson}>
            + เพิ่มคน
          </Button>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">เมนู</h2>
          <div className="space-y-2">
            {dishes.map((dish) => (
              <DishRow
                key={dish.id}
                dish={dish}
                people={people}
                onChange={(next) => {
                  setDishes((current) =>
                    current.map((item) => (item.id === dish.id ? next : item))
                  );
                  setResult(null);
                  setError(null);
                }}
                onRemove={() => {
                  setDishes((current) =>
                    current.filter((item) => item.id !== dish.id)
                  );
                  setResult(null);
                  setError(null);
                }}
              />
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addDish}>
            + เพิ่มเมนู
          </Button>
          <p className="text-sm text-slate-600">
            รวมอาหาร: {foodSubtotal.toLocaleString("th-TH")} บาท
          </p>
        </section>

        <section className="mt-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bill-vat">VAT (%)</Label>
            <Input
              id="bill-vat"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={vatPercent}
              onChange={(e) => {
                setVatPercent(e.target.value);
                setResult(null);
                setError(null);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bill-round">ปัดเศษ</Label>
            <select
              id="bill-round"
              value={roundMode}
              onChange={(e) => {
                setRoundMode(e.target.value as RoundMode);
                setResult(null);
                setError(null);
              }}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              {ROUND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <div className="mt-6">
          <Button type="button" onClick={handleCalculate}>
            คำนวณ
          </Button>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : null}

        {result ? <BillResultSection result={result} /> : null}
      </div>
    </RequireAuth>
  );
}
