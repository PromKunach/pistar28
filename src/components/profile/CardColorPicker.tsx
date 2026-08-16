"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  CARD_PRESETS,
  TEXT_PRESETS,
  THEME_PAIRS,
  contrastRatio,
  hexToHsv,
  hsvToHex,
  normalizeHex,
  readableTextColor,
} from "@/lib/colorPicker";
import { DEFAULT_CUSTOMIZATION } from "@/lib/profileCustomization";

type ColorTarget = "text" | "card";

const COLOR_TARGET_LABELS: Record<ColorTarget, string> = {
  card: "สีพื้นหลังการ์ด",
  text: "สีข้อความ",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function useDragSurface(onMove: (clientX: number, clientY: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);

  return {
    ref,
    handlers: {
      onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
        event.preventDefault();
        activePointer.current = event.pointerId;
        ref.current?.setPointerCapture(event.pointerId);
        onMove(event.clientX, event.clientY);
      },
      onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return;
        onMove(event.clientX, event.clientY);
      },
      onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
        if (activePointer.current !== event.pointerId) return;
        activePointer.current = null;
        ref.current?.releasePointerCapture(event.pointerId);
      },
      onPointerCancel: () => {
        activePointer.current = null;
      },
    },
  };
}

function SpectrumPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (hex: string) => void;
}) {
  const { h, s, v } = hexToHsv(color);
  const [hue, setHue] = useState(h);

  useEffect(() => {
    const next = hexToHsv(color);
    if (next.s > 0.01 && next.v > 0.01) setHue(next.h);
  }, [color]);

  const area = useDragSurface((clientX, clientY) => {
    const rect = area.ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const nextS = clamp((clientX - rect.left) / rect.width, 0, 1);
    const nextV = 1 - clamp((clientY - rect.top) / rect.height, 0, 1);
    onChange(hsvToHex(hue, nextS, nextV));
  });

  const hueBar = useDragSurface((clientX) => {
    const rect = hueBar.ref.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const nextHue = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    setHue(nextHue);
    onChange(hsvToHex(nextHue, s || 1, v || 1));
  });

  return (
    <div className="space-y-2">
      <div
        ref={area.ref}
        {...area.handlers}
        role="slider"
        tabIndex={0}
        aria-label="ความอิ่มตัวและความสว่าง"
        className="relative h-28 w-full cursor-crosshair touch-none rounded-md border border-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hsvToHex(hue, 1, 1)})`,
        }}
      >
        <span
          className="pointer-events-none absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
          style={{
            left: `${s * 100}%`,
            top: `${(1 - v) * 100}%`,
            backgroundColor: color,
          }}
        />
      </div>

      <div
        ref={hueBar.ref}
        {...hueBar.handlers}
        role="slider"
        tabIndex={0}
        aria-label="สี (Hue)"
        className="relative h-3.5 w-full cursor-pointer touch-none rounded-full border border-neutral-200 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
        style={{
          background:
            "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
        }}
      >
        <span
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.35)]"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor: hsvToHex(hue, 1, 1),
          }}
        />
      </div>
    </div>
  );
}

export function CardColorPicker({
  textColor,
  cardColor,
  onTextColorChange,
  onCardColorChange,
}: {
  textColor: string;
  cardColor: string;
  onTextColorChange: (color: string) => void;
  onCardColorChange: (color: string) => void;
}) {
  const [target, setTarget] = useState<ColorTarget>("card");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeColor = target === "text" ? textColor : cardColor;
  const setActiveColor = target === "text" ? onTextColorChange : onCardColorChange;
  const presets = target === "text" ? TEXT_PRESETS : CARD_PRESETS;
  const [hexDraft, setHexDraft] = useState(activeColor);

  useEffect(() => {
    setHexDraft(activeColor);
  }, [activeColor]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const ratio = contrastRatio(textColor, cardColor);
  const readable = ratio >= 4.5;
  const matchedTheme = THEME_PAIRS.find(
    (pair) =>
      pair.textColor === textColor.toLowerCase() && pair.cardColor === cardColor.toLowerCase()
  );

  return (
    <div className="space-y-2">
      <Label>สีการ์ด</Label>
      <div ref={panelRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-neutral-200 bg-gray-50 px-3 text-sm text-neutral-800 transition-colors hover:bg-neutral-100"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-neutral-300"
              style={{ backgroundColor: cardColor, color: textColor }}
            >
              A
            </span>
            <span className="truncate">{matchedTheme?.label ?? "กำหนดเอง"}</span>
          </span>
          <ChevronDownIcon
            className={cn(
              "h-4 w-4 shrink-0 text-neutral-500 transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              role="dialog"
              aria-label="ตั้งค่าสี"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 mt-1 w-[17rem] space-y-3 rounded-lg border border-neutral-200 bg-background p-3 shadow-lg"
            >
              <div className="grid grid-cols-2 gap-1 rounded-md bg-neutral-100 p-1">
                {(["card", "text"] as ColorTarget[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTarget(option)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      target === option
                        ? "bg-background text-neutral-900 shadow-sm"
                        : "text-neutral-600 hover:text-neutral-900"
                    )}
                  >
                    <span
                      className="h-3 w-3 rounded-full ring-1 ring-neutral-300"
                      style={{
                        backgroundColor: option === "text" ? textColor : cardColor,
                      }}
                    />
                    {COLOR_TARGET_LABELS[option]}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {presets.map((preset) => {
                  const isActive = activeColor.toLowerCase() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      title={preset}
                      onClick={() => setActiveColor(preset)}
                      className={cn(
                        "aspect-square rounded-full border border-neutral-300 transition-transform hover:scale-110",
                        isActive && "ring-2 ring-neutral-900 ring-offset-2 ring-offset-background"
                      )}
                      style={{ backgroundColor: preset }}
                      aria-label={`ใช้ ${preset}`}
                    />
                  );
                })}
              </div>

              <SpectrumPicker color={activeColor} onChange={setActiveColor} />

              <div className="flex items-center gap-2">
                <span
                  className="h-9 w-9 shrink-0 rounded-md border border-neutral-300"
                  style={{ backgroundColor: activeColor }}
                />
                <input
                  value={hexDraft}
                  onChange={(event) => {
                    setHexDraft(event.target.value);
                    const next = normalizeHex(event.target.value);
                    if (next) setActiveColor(next);
                  }}
                  onBlur={() => {
                    const next = normalizeHex(hexDraft);
                    if (next) setActiveColor(next);
                    else setHexDraft(activeColor);
                  }}
                  spellCheck={false}
                  className="h-9 min-w-0 flex-1 rounded-md border border-neutral-200 bg-background px-2 font-mono text-xs text-neutral-800 uppercase outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                  placeholder="#000000"
                  aria-label={`ค่าสี ${COLOR_TARGET_LABELS[target]}`}
                />
              </div>

              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-[11px]",
                  readable
                    ? "bg-neutral-100 text-neutral-500"
                    : "bg-amber-50 text-amber-700"
                )}
              >
                <span>
                  {readable ? "อ่านง่าย" : "คอนทราสต์ต่ำ"} · {ratio.toFixed(1)}:1
                </span>
                {!readable && (
                  <button
                    type="button"
                    onClick={() => onTextColorChange(readableTextColor(cardColor))}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    ปรับข้อความ
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-neutral-500">ธีม</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {THEME_PAIRS.map((pair) => (
                    <button
                      key={pair.label}
                      type="button"
                      onClick={() => {
                        onTextColorChange(pair.textColor);
                        onCardColorChange(pair.cardColor);
                      }}
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-[11px] font-medium transition-transform hover:scale-[1.03]",
                        matchedTheme?.label === pair.label
                          ? "border-neutral-900"
                          : "border-neutral-200"
                      )}
                      style={{
                        backgroundColor: pair.cardColor,
                        color: pair.textColor,
                      }}
                    >
                      {pair.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onTextColorChange(cardColor);
                    onCardColorChange(textColor);
                  }}
                  className="text-[11px] text-neutral-500 underline-offset-2 hover:underline"
                >
                  สลับสี
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onTextColorChange(DEFAULT_CUSTOMIZATION.card_text_color);
                    onCardColorChange(DEFAULT_CUSTOMIZATION.card_color);
                  }}
                  className="text-[11px] text-neutral-500 underline-offset-2 hover:underline"
                >
                  รีเซ็ตทั้งคู่
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
