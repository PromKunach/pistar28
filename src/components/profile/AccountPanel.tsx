"use client";

import Link from "next/link";
import type { MemberProfile } from "@/components/member/types";

export function AccountPanel({
  profile,
  email,
}: {
  profile: MemberProfile;
  email: string;
}) {
  const fields = [
    { label: "ชื่อ-นามสกุล", value: profile.full_name_th },
    { label: "ชื่อเล่น", value: profile.nickname_th },
    { label: "รหัสนักศึกษา", value: profile.pbri_id },
    { label: "ฝ่าย", value: profile.section },
    { label: "อีเมล", value: email },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">บัญชี</h2>
        <p className="mt-1 text-sm text-slate-500">ข้อมูลบัญชีของคุณ (อ่านอย่างเดียว)</p>
      </div>

      <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-xs font-medium text-slate-500">{field.label}</dt>
            <dd className="text-sm text-slate-900">{field.value || "—"}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={`/member?member=${profile.id}`}
        className="inline-flex text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
      >
        ดูการ์ดของฉันในหน้าสมาชิก
      </Link>

      <p className="text-xs text-slate-400">เวอร์ชัน 1.5.1</p>
    </div>
  );
}
