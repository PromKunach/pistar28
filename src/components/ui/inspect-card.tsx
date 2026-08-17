"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { MEMBER_CARD_DIMENSION_CLASS } from "@/components/member/cardDimensions";

const ROTATE_SPRING = { stiffness: 220, damping: 24, mass: 0.6 } as const;
const LIFT_SPRING = { stiffness: 300, damping: 26, mass: 0.5 } as const;
const DRAG_SENSITIVITY = 0.6;
const MAX_TILT_X = 28;
const HOVER_TILT = 7;
const KEY_STEP = 24;
/** How far a flick's velocity (deg/ms) is projected before snapping to a face. */
const FLICK_PROJECTION = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

type InspectCardProps = {
  front: ReactNode;
  back: ReactNode;
  className?: string;
  /** Changing this returns the card to its resting, front-facing position. */
  resetKey?: string | number | null;
  ariaLabel?: string;
};

export function InspectCard({
  front,
  back,
  className,
  resetKey,
  ariaLabel = "Drag to rotate the card",
}: InspectCardProps) {
  const reduceMotion = useReducedMotion();

  // Rotation is split into an unbounded "base" (drag + flips) and a small hover
  // offset, so pointer hover and dragging can drive the card without fighting.
  const baseX = useMotionValue(0);
  const baseY = useMotionValue(0);
  const hoverX = useMotionValue(0);
  const hoverY = useMotionValue(0);
  const lift = useMotionValue(1);

  const targetX = useTransform([baseX, hoverX], (v: number[]) => v[0] + v[1]);
  const targetY = useTransform([baseY, hoverY], (v: number[]) => v[0] + v[1]);
  const springX = useSpring(targetX, ROTATE_SPRING);
  const springY = useSpring(targetY, ROTATE_SPRING);
  const scaleSpring = useSpring(lift, LIFT_SPRING);

  const rotateX = reduceMotion ? targetX : springX;
  const rotateY = reduceMotion ? targetY : springY;
  const scale = reduceMotion ? lift : scaleSpring;

  const glareX = useTransform(rotateY, [-45, 45], ["-40%", "40%"]);
  const glareY = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], ["35%", "-35%"]);
  const glareOpacity = useTransform([rotateX, rotateY], (v: number[]) =>
    clamp((Math.abs(v[0]) + Math.abs(v[1])) / 70, 0, 1) * 0.35 + 0.05
  );
  const shadowScale = useTransform(rotateY, (v: number) =>
    0.68 + 0.32 * Math.abs(Math.cos((v * Math.PI) / 180))
  );
  const shadowOpacity = useTransform(rotateX, [-MAX_TILT_X, MAX_TILT_X], [0.3, 0.1]);

  const drag = useRef({ active: false, x: 0, y: 0, t: 0, velocity: 0, moved: false });
  const boundsRef = useRef<DOMRect | null>(null);

  const settle = useCallback(
    (velocity = 0) => {
      const current = baseY.get();
      const projected = clamp(
        current + velocity * FLICK_PROJECTION,
        current - 260,
        current + 260
      );
      baseY.set(Math.round(projected / 180) * 180);
      baseX.set(0);
      lift.set(1);
    },
    [baseX, baseY, lift]
  );

  const flip = useCallback(() => {
    baseY.set(Math.round(baseY.get() / 180) * 180 + 180);
    baseX.set(0);
  }, [baseX, baseY]);

  const reset = useCallback(() => {
    baseY.set(Math.round(baseY.get() / 360) * 360);
    baseX.set(0);
    hoverX.set(0);
    hoverY.set(0);
  }, [baseX, baseY, hoverX, hoverY]);

  useEffect(() => {
    reset();
  }, [resetKey, reset]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    boundsRef.current = event.currentTarget.getBoundingClientRect();
    drag.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      t: event.timeStamp,
      velocity: 0,
      moved: false,
    };
    hoverX.set(0);
    hoverY.set(0);
    lift.set(1.03);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;

    if (!state.active) {
      if (reduceMotion) return;
      const bounds = boundsRef.current;
      if (!bounds) return;
      const px = (event.clientX - bounds.left) / bounds.width - 0.5;
      const py = (event.clientY - bounds.top) / bounds.height - 0.5;
      hoverY.set(px * HOVER_TILT * 2);
      hoverX.set(-py * HOVER_TILT * 2);
      return;
    }

    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    const dt = Math.max(1, event.timeStamp - state.t);

    state.x = event.clientX;
    state.y = event.clientY;
    state.t = event.timeStamp;
    state.velocity = (dx * DRAG_SENSITIVITY) / dt;
    if (Math.abs(dx) + Math.abs(dy) > 2) state.moved = true;

    event.preventDefault();

    baseY.set(baseY.get() + dx * DRAG_SENSITIVITY);
    baseX.set(clamp(baseX.get() - dy * DRAG_SENSITIVITY, -MAX_TILT_X, MAX_TILT_X));
  };

  const handlePointerUp = () => {
    const state = drag.current;
    if (!state.active) return;
    state.active = false;

    if (state.moved) settle(state.velocity);
    else {
      flip();
      lift.set(1);
    }
  };

  const handlePointerCancel = () => {
    if (!drag.current.active) return;
    drag.current.active = false;
    settle();
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    boundsRef.current = event.currentTarget.getBoundingClientRect();
  };

  const handlePointerLeave = () => {
    if (drag.current.active) return;
    boundsRef.current = null;
    hoverX.set(0);
    hoverY.set(0);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case "ArrowLeft":
        baseY.set(baseY.get() - KEY_STEP);
        break;
      case "ArrowRight":
        baseY.set(baseY.get() + KEY_STEP);
        break;
      case "ArrowUp":
        baseX.set(clamp(baseX.get() - KEY_STEP, -MAX_TILT_X, MAX_TILT_X));
        break;
      case "ArrowDown":
        baseX.set(clamp(baseX.get() + KEY_STEP, -MAX_TILT_X, MAX_TILT_X));
        break;
      case "Enter":
      case " ":
        flip();
        break;
      case "Escape":
        reset();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ perspective: 1400 }}>
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={ariaLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onKeyDown={handleKeyDown}
          className={cn(
            "relative cursor-grab touch-none select-none outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-4",
            MEMBER_CARD_DIMENSION_CLASS
          )}
          style={{
            rotateX,
            rotateY,
            scale,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
          <Face>
            {front}
            <Glare x={glareX} y={glareY} opacity={glareOpacity} />
          </Face>
          <Face flipped>
            {back}
            <Glare x={glareX} y={glareY} opacity={glareOpacity} />
          </Face>
        </motion.div>

        <motion.div
          aria-hidden
          className="pointer-events-none absolute -bottom-6 left-1/2 h-6 w-[70%] rounded-[50%] bg-slate-900 blur-xl"
          style={{
            x: "-50%",
            scaleX: shadowScale,
            opacity: shadowOpacity,
            willChange: "transform, opacity",
          }}
        />
      </div>
    </div>
  );
}

function Face({ children, flipped }: { children: ReactNode; flipped?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden rounded-[1.75rem] [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
      style={{
        transformStyle: "preserve-3d",
        transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      {children}
    </div>
  );
}

function Glare({
  x,
  y,
  opacity,
}: {
  x: MotionValue<string>;
  y: MotionValue<string>;
  opacity: MotionValue<number>;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]">
      <motion.div
        aria-hidden
        className="absolute -inset-1/4 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.75),rgba(255,255,255,0.12)_45%,transparent_70%)] mix-blend-soft-light"
        style={{ x, y, opacity, willChange: "transform, opacity" }}
      />
    </div>
  );
}
