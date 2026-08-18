"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";

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

export function PrivacyPanel({ email }: { email: string }) {
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
        <h2 className="text-lg font-semibold text-foreground">ความเป็นส่วนตัว</h2>
        <p className="mt-1 text-sm text-muted-foreground">จัดการรหัสผ่านและเซสชัน</p>
      </div>

      <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">เปลี่ยนรหัสผ่าน</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
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

      <div className="rounded-lg border border-border bg-muted px-4 py-3">
        <p className="text-sm font-medium text-foreground">สถานะเซสชัน</p>
        <p className="mt-1 text-sm text-muted-foreground">เข้าสู่ระบบอยู่</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{email}</p>
      </div>
    </div>
  );
}
