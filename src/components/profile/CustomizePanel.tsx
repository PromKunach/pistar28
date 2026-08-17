"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardColorPicker } from "./CardColorPicker";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { PROFILE_BIO_MAX_LENGTH } from "@/lib/profileCustomization";
import { formatStickerQuota, sumStickerBytes } from "@/lib/stickerQuota";
import { cn } from "@/lib/utils";

export function CustomizePanel({
  draft,
  bio,
  onBioChange,
  onChange,
  onSave,
  onReset,
  onUploadSticker,
  uploading = false,
  saving,
  saveMessage,
}: {
  draft: ProfileCustomization;
  bio: string;
  onBioChange: (bio: string) => void;
  onChange: (next: ProfileCustomization) => void;
  onSave: () => void;
  onReset: () => void;
  onUploadSticker: (file: File) => Promise<void>;
  uploading?: boolean;
  saving: boolean;
  saveMessage: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const used = sumStickerBytes(draft);

  function updateDraft(partial: Partial<ProfileCustomization>) {
    onChange({ ...draft, ...partial });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    await onUploadSticker(file);
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ปรับแต่งการ์ด</h2>
        <p className="mt-1 text-sm text-slate-500">เปลี่ยนสี สติกเกอร์ และ bio บนการ์ด</p>
      </div>

      <div>
        <label htmlFor="profile-bio" className="text-sm font-medium text-slate-900">
          Bio
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          แสดงบนด้านหลังการ์ด สูงสุด {PROFILE_BIO_MAX_LENGTH} ตัวอักษร
        </p>
        <textarea
          id="profile-bio"
          rows={3}
          value={bio}
          onChange={(event) =>
            onBioChange(event.target.value.slice(0, PROFILE_BIO_MAX_LENGTH))
          }
          className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
          placeholder="เขียนเกี่ยวกับตัวคุณ..."
        />
        <p className="mt-1 text-right text-xs text-slate-400">
          {bio.length}/{PROFILE_BIO_MAX_LENGTH}
        </p>
      </div>

      <CardColorPicker
        textColor={draft.card_text_color}
        cardColor={draft.card_color}
        onTextColorChange={(card_text_color) => updateDraft({ card_text_color })}
        onCardColorChange={(card_color) => updateDraft({ card_color })}
      />

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full justify-center gap-2"
        >
          <ImagePlus className="h-4 w-4" />
          {uploading ? "กำลังอัปโหลด..." : "เพิ่มสติกเกอร์"}
        </Button>
        <p className="mt-2 text-xs text-slate-500">พื้นที่สติกเกอร์: {formatStickerQuota(used)}</p>
        <p className="mt-1 text-xs text-slate-400">รองรับ PNG และ JPG สูงสุด 1 MB ต่อผู้ใช้ (รวมทุกสติกเกอร์)</p>
      </div>

      {saveMessage && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            saveMessage.includes("สำเร็จ") || saveMessage.includes("บันทึกแล้ว")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {saveMessage}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (confirm("รีเซ็ตการตั้งค่าการ์ดทั้งหมด?")) {
              onReset();
            }
          }}
          disabled={saving}
        >
          รีเซ็ต
        </Button>
      </div>
    </div>
  );
}
