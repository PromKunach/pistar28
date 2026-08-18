"use client";

import { useEffect } from "react";
import { Mail, MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const CONTACT_CHANNELS = [
  {
    label: "Instagram",
    value: "pi.star28",
    href: "https://www.instagram.com/pi.star28/",
    icon: MessageCircle,
  },
  {
    label: "อีเมลผู้ดูแลเว็บไซต์",
    value: "pr0m89215375@gmail.com",
    href: "",
    icon: Mail,
  },
] as const;

export function ContactPanel({
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
            aria-label="ปิดช่องทางติดต่อ"
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
            aria-labelledby="contact-panel-title"
            className="fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-4 sm:pt-6"
            initial={{ y: "-110%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-110%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="contact-panel-title"
                    className="text-lg font-semibold text-foreground"
                  >
                    ช่องทางติดต่อ
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    ติดต่อทีมงาน PI*28 ได้ผ่านช่องทางด้านล่าง
                  </p>
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

              <ul className="space-y-3">
                {CONTACT_CHANNELS.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      target={channel.href.startsWith("mailto:") ? undefined : "_blank"}
                      rel={channel.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                      className="flex items-center gap-3 rounded-xl border border-border bg-muted px-4 py-3 transition-colors hover:border-slate-300 hover:bg-card"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border">
                        <channel.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {channel.label}
                        </span>
                        <span className="block truncate text-sm font-medium text-foreground">
                          {channel.value}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
