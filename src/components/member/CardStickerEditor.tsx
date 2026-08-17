"use client";

import { useRef } from "react";
import { clampStickerScale, type CardSticker } from "@/lib/profileCustomization";
import { cn } from "@/lib/utils";

import { STICKER_BASE_PX } from "@/components/member/cardDimensions";
const DRAG_THRESHOLD_PX = 4;

type DragMode = "move" | "resize" | "rotate";

type DragState = {
  id: string;
  pointerId: number;
  mode: DragMode;
  active: boolean;
  startStickerX: number;
  startStickerY: number;
  startScale: number;
  startRotation: number;
  startDistance: number;
  startAngle: number;
};

function clampPosition(value: number) {
  return Math.min(1.5, Math.max(-0.5, value));
}

function getContainerCenter(
  containerRef: React.RefObject<HTMLDivElement | null>,
  sticker: CardSticker
) {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return { x: 0, y: 0 };
  return {
    x: rect.left + sticker.x * rect.width,
    y: rect.top + sticker.y * rect.height,
  };
}

function HandleDot({
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  className?: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
}) {
  return (
    <span
      role="presentation"
      className={cn(
        "absolute z-40 h-2.5 w-2.5 rounded-full border border-white bg-slate-900 shadow-sm select-none",
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragStart={(e) => e.preventDefault()}
    />
  );
}

export function CardStickerEditor({
  stickers,
  selectedId,
  onSelect,
  onMove,
  onScale,
  onRotate,
  containerRef,
}: {
  stickers: CardSticker[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onScale: (id: string, scale: number) => void;
  onRotate: (id: string, rotation: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const dragRef = useRef<DragState | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  function toNormalized(clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0.5, y: 0.5 };
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return {
      x: clampPosition(x),
      y: clampPosition(y),
    };
  }

  function beginDrag(
    e: React.PointerEvent,
    sticker: CardSticker,
    mode: DragMode
  ) {
    e.stopPropagation();
    e.preventDefault();
    onSelect(sticker.id);

    const center = getContainerCenter(containerRef, sticker);
    const startDistance = Math.hypot(e.clientX - center.x, e.clientY - center.y);
    const startAngle =
      (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) / Math.PI;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      id: sticker.id,
      pointerId: e.pointerId,
      mode,
      active: mode !== "move",
      startStickerX: sticker.x,
      startStickerY: sticker.y,
      startScale: sticker.scale,
      startRotation: sticker.rotation,
      startDistance: Math.max(startDistance, 24),
      startAngle,
    };
  }

  function handlePointerMove(e: React.PointerEvent, sticker: CardSticker) {
    const drag = dragRef.current;
    if (!drag || drag.id !== sticker.id || drag.pointerId !== e.pointerId) return;

    if (!drag.active && drag.mode === "move" && pointerStartRef.current) {
      const moved = Math.hypot(
        e.clientX - pointerStartRef.current.x,
        e.clientY - pointerStartRef.current.y
      );
      if (moved < DRAG_THRESHOLD_PX) return;
      drag.active = true;
    }

    e.preventDefault();

    if (drag.mode === "move") {
      const { x, y } = toNormalized(e.clientX, e.clientY);
      onMove(sticker.id, x, y);
      return;
    }

    const center = getContainerCenter(containerRef, sticker);

    if (drag.mode === "resize") {
      const distance = Math.hypot(e.clientX - center.x, e.clientY - center.y);
      const ratio = distance / drag.startDistance;
      onScale(sticker.id, clampStickerScale(drag.startScale * ratio));
      return;
    }

    const angle =
      (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) / Math.PI;
    onRotate(sticker.id, drag.startRotation + (angle - drag.startAngle));
  }

  function handlePointerUp(e: React.PointerEvent, sticker: CardSticker) {
    const drag = dragRef.current;
    if (!drag || drag.id !== sticker.id) return;
    dragRef.current = null;
    pointerStartRef.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <>
      {stickers.map((sticker) => {
        const size = STICKER_BASE_PX * sticker.scale;
        const selected = selectedId === sticker.id;

        return (
          <div
            key={sticker.id}
            data-sticker
            className="absolute z-30 touch-none select-none"
            style={{
              left: `${sticker.x * 100}%`,
              top: `${sticker.y * 100}%`,
              width: size,
              height: size,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
            }}
            onPointerDown={(e) => beginDrag(e, sticker, "move")}
            onPointerMove={(e) => handlePointerMove(e, sticker)}
            onPointerUp={(e) => handlePointerUp(e, sticker)}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="relative h-full w-full select-none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.url}
                alt=""
                draggable={false}
                className="pointer-events-none h-full w-full select-none object-contain [-webkit-user-drag:none]"
                onDragStart={(e) => e.preventDefault()}
              />

              {selected && (
                <div
                  className="pointer-events-none absolute -inset-1 rounded-sm border border-dashed border-slate-900"
                  aria-hidden
                />
              )}

              {selected && (
                <>
                  <HandleDot
                    className="-left-1.5 -top-1.5 cursor-nwse-resize pointer-events-auto"
                    onPointerDown={(e) => beginDrag(e, sticker, "resize")}
                    onPointerMove={(e) => handlePointerMove(e, sticker)}
                    onPointerUp={(e) => handlePointerUp(e, sticker)}
                  />
                  <HandleDot
                    className="-right-1.5 -top-1.5 cursor-nesw-resize pointer-events-auto"
                    onPointerDown={(e) => beginDrag(e, sticker, "resize")}
                    onPointerMove={(e) => handlePointerMove(e, sticker)}
                    onPointerUp={(e) => handlePointerUp(e, sticker)}
                  />
                  <HandleDot
                    className="-bottom-1.5 -left-1.5 cursor-nesw-resize pointer-events-auto"
                    onPointerDown={(e) => beginDrag(e, sticker, "resize")}
                    onPointerMove={(e) => handlePointerMove(e, sticker)}
                    onPointerUp={(e) => handlePointerUp(e, sticker)}
                  />
                  <HandleDot
                    className="-bottom-1.5 -right-1.5 cursor-nwse-resize pointer-events-auto"
                    onPointerDown={(e) => beginDrag(e, sticker, "resize")}
                    onPointerMove={(e) => handlePointerMove(e, sticker)}
                    onPointerUp={(e) => handlePointerUp(e, sticker)}
                  />
                  <HandleDot
                    className="left-1/2 -top-7 h-3 w-3 -translate-x-1/2 cursor-grab pointer-events-auto active:cursor-grabbing"
                    onPointerDown={(e) => beginDrag(e, sticker, "rotate")}
                    onPointerMove={(e) => handlePointerMove(e, sticker)}
                    onPointerUp={(e) => handlePointerUp(e, sticker)}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
