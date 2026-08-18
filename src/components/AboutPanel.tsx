"use client";

import { useEffect } from "react";
import { ThemeLogo } from "@/components/ThemeLogo";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export function AboutPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="ปิดเกี่ยวกับเรา"
            className="fixed inset-0 z-50 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="about-panel-title"
            className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4 sm:pt-6"
            initial={{ y: "-110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-110%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
                    <ThemeLogo variant="icon" alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                  </div>
                  <div>
                    <h2
                      id="about-panel-title"
                      className="text-lg font-semibold text-foreground"
                    >
                      เกี่ยวกับเรา
                    </h2>
                    <p className="text-sm text-muted-foreground">PI*28</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
                  aria-label="ปิด"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
                <p>
                  เว็บไซต์สำหรับคณะแพทยศาสตร์ สถาบันพระบรมราชชนก รุ่น PI*28
                  
                </p>
                <p>
                  เว็บไซต์นี้สร้างขึ้นเพื่อประดับรุ่นเฉยๆ
                </p>
                <p className="text-xs text-muted-foreground">เวอร์ชัน beta</p>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
