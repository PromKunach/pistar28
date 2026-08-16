"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import type { ProfileCustomization } from "@/lib/profileCustomization";
import { cn } from "@/lib/utils";

function mapPasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid credentials") ||
    lower.includes("wrong password")
  ) {
    return "รหัสผ่านปัจจุบันไม่ถูกต้อง";
  }
  if (lower.includes("password") && lower.includes("least")) {
    return "รหัสผ่านใหม่สั้นเกินไป";
  }
  if (lower.includes("same")) {
    return "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  }
  return "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองอีกครั้ง";
}

export function PrivacyPanel({
  draft,
  onPrivacyChange,
  email,
  onSave,
  saving,
  saveMessage,
}: {
  draft: ProfileCustomization;
  onPrivacyChange: (show_email: boolean) => void;
  email: string;
  onSave: () => void;
  saving: boolean;
  saveMessage: string | null;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  async function handlePasswordSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setChangingPassword(true);

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    });

    if (verifyError) {
      setPasswordError(mapPasswordError(verifyError.message));
      setChangingPassword(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setChangingPassword(false);

    if (updateError) {
      setPasswordError(mapPasswordError(updateError.message));
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">ความเป็นส่วนตัว</h2>
        <p className="mt-1 text-sm text-slate-500">จัดการการแสดงข้อมูลและรหัสผ่าน</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-medium text-slate-900">แสดงอีเมล</p>
          <p className="text-xs text-slate-500">แสดงอีเมลบนด้านหลังการ์ดของคุณ</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.privacy_settings.show_email}
          onClick={() => onPrivacyChange(!draft.privacy_settings.show_email)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            draft.privacy_settings.show_email ? "bg-slate-900" : "bg-slate-200"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
              draft.privacy_settings.show_email && "translate-x-5"
            )}
          />
        </button>
      </div>

      <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-900">เปลี่ยนรหัสผ่าน</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            ยืนยันรหัสผ่านปัจจุบันก่อนเปลี่ยนรหัสใหม่
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="current-password">รหัสผ่านปัจจุบัน</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">ยืนยันรหัสผ่าน</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {passwordError && (
          <p role="alert" className="text-sm text-red-600">
            {passwordError}
          </p>
        )}
        {passwordSuccess && (
          <p role="status" className="text-sm text-green-700">
            เปลี่ยนรหัสผ่านสำเร็จ
          </p>
        )}

        <Button type="submit" variant="secondary" disabled={changingPassword}>
          {changingPassword ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
        </Button>
      </form>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-900">สถานะเซสชัน</p>
        <p className="mt-1 text-sm text-slate-600">เข้าสู่ระบบอยู่</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">{email}</p>
      </div>

      {saveMessage && (
        <p
          role="status"
          className={cn(
            "rounded-lg px-3 py-2 text-sm",
            saveMessage.includes("บันทึกแล้ว")
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          )}
        >
          {saveMessage}
        </p>
      )}

      <div className="border-t border-slate-100 pt-4">
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "กำลังบันทึก..." : "บันทึก"}
        </Button>
      </div>
    </div>
  );
}
