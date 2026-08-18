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
        <h2 className="text-lg font-semibold text-foreground">บัญชี</h2>
        <p className="mt-1 text-sm text-muted-foreground">ข้อมูลบัญชีของคุณ (อ่านอย่างเดียว)</p>
      </div>

      <dl className="divide-y divide-border rounded-lg border border-border bg-card">
        {fields.map((field) => (
          <div
            key={field.label}
            className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
            <dd className="text-sm text-foreground">{field.value || "—"}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={`/member?member=${profile.id}`}
        className="inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
      >
        ดูการ์ดของฉันในหน้าสมาชิก
      </Link>

      <p className="text-xs text-muted-foreground">เวอร์ชัน 1.5.1</p>
    </div>
  );
}
