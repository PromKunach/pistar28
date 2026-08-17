"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { RequireAuth } from "@/components/tools/RequireAuth";
import { ToolPageHeader } from "@/components/tools/ToolPageHeader";
import { Button } from "@/components/ui/button";

export default function QrToolPage() {
  const [text, setText] = useState("");
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = text.trim();
    if (!trimmed) {
      setDataUrl(null);
      return;
    }
    void QRCode.toDataURL(trimmed, { width: 256, margin: 2 }).then(setDataUrl);
  }, [text]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "qrcode.png";
    link.click();
  };

  return (
    <RequireAuth>
      <div className="mx-auto max-w-[800px] px-4 py-6">
        <ToolPageHeader
          title="สร้าง QR Code"
          description="แปลงข้อความหรือลิงก์เป็น QR"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="พิมพ์ข้อความหรือวางลิงก์..."
          className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        />
        {dataUrl ? (
          <div className="mt-6 flex flex-col items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt="QR Code"
              className="h-64 w-64 rounded-lg border border-slate-200"
            />
            <Button type="button" onClick={handleDownload}>
              ดาวน์โหลด PNG
            </Button>
          </div>
        ) : null}
      </div>
    </RequireAuth>
  );
}
