"use client";

import { QrCode, Receipt, Shuffle } from "lucide-react";

import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolHubCard } from "@/components/tools/ToolHubCard";

const TOOLS = [
  {
    href: "/tools/qr",
    title: "สร้าง QR Code",
    description: "แปลงข้อความหรือลิงก์เป็น QR",
    icon: QrCode,
  },
  {
    href: "/tools/bill-splitter",
    title: "แบ่งบิล",
    description: "แบ่งบิลตามเมนูและ VAT",
    icon: Receipt,
  },
  {
    href: "/tools/match-maker",
    title: "จับคู่ / แบ่งกลุ่ม",
    description: "สุ่มจากสมาชิก 32 คน",
    icon: Shuffle,
  },
] as const;

export default function ToolsPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">เครื่องมือ</h1>
          <p className="mt-1 text-sm text-slate-500">เครื่องมืออำนวยความสะดวกสำหรับสมาชิก</p>
        </header>
        <div className="grid gap-3">
          {TOOLS.map((tool) => (
            <ToolHubCard key={tool.href} {...tool} />
          ))}
        </div>
      </div>
    </RequireAuth>
  );
}
