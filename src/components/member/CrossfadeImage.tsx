"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function FadeInImage({
  src,
  alt,
  instant,
}: {
  src: string;
  alt: string;
  instant: boolean;
}) {
  const [visible, setVisible] = useState(instant);

  useEffect(() => {
    if (instant) return;
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [instant]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      draggable={false}
      className={cn(
        "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0"
      )}
    />
  );
}

/**
 * Swaps between two stacked layers so a new photo fades in over the old one
 * without keeping every profile image mounted.
 */
export function CrossfadeImage({ src, alt }: { src: string; alt: string }) {
  const [layers, setLayers] = useState(() => [{ src, key: 0 }]);
  const keyRef = useRef(0);

  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1].src === src) return prev;
      keyRef.current += 1;
      return [...prev.slice(-1), { src, key: keyRef.current }];
    });
  }, [src]);

  return (
    <div className="relative h-full w-full">
      {layers.map((layer, i) => {
        const isTop = i === layers.length - 1;
        return (
          <FadeInImage
            key={layer.key}
            src={layer.src}
            alt={isTop ? alt : ""}
            instant={layers.length === 1}
          />
        );
      })}
    </div>
  );
}
