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
              {person.dishes.length > 0 ? (
                <div className="space-y-0.5">
                  {person.dishes.map((dish) => (
                    <p key={dish.dishId}>
                      {dish.dishName}: {dish.amount.toLocaleString("th-TH")} บาท
                    </p>
                  ))}
                </div>
              ) : null}
              <p>ส่วนร่วม: {person.sharedShare.toLocaleString("th-TH")} บาท</p>
              <p>รวมอาหาร: {person.foodShare.toLocaleString("th-TH")} บาท</p>
              <p>VAT: {person.vatShare.toLocaleString("th-TH")} บาท</p>
              <p className="text-base font-semibold text-slate-900">
                รวม: {person.total.toLocaleString("th-TH")} บาท
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p>ยอดบิล: {result.overallTotal.toLocaleString("th-TH")} บาท</p>
        <p>หักเมนู: {result.assignedTotal.toLocaleString("th-TH")} บาท</p>
        <p>คงเหลือ (หารเท่าๆ กัน): {result.remainder.toLocaleString("th-TH")} บาท</p>
        <p>VAT รวม: {result.vatTotal.toLocaleString("th-TH")} บาท</p>
        <p className="mt-1 font-semibold text-slate-900">
          ยอดรวมทั้งหมด: {result.grandTotal.toLocaleString("th-TH")} บาท
        </p>
      </div>
    </div>
  );
}
