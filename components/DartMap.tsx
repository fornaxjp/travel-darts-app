"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DART_STYLES,
  type DartStyleId,
  type Destination,
} from "@/lib/destinations";

import styles from "./DartMap.module.css";

type ThrowAnimation = {
  token: string;
  destination: Destination;
  dartStyleId: DartStyleId;
};

type DartMapProps = {
  currentThrow: ThrowAnimation | null;
  selectedDestination: Destination | null;
  displayStyleId: DartStyleId;
  onThrow: () => void;
  onReset: () => void;
  disabled?: boolean;
  helperText: string;
};

const FLIGHT_DURATION = 500;
const RESULT_DELAY = 800;
const RING_GAP = 100;
const RING_DURATION = 360;
const MARKER_SIZE = 34;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeOutCubic(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  const ratio = window.devicePixelRatio || 1;
  const pixelWidth = Math.max(1, Math.floor(width * ratio));
  const pixelHeight = Math.max(1, Math.floor(height * ratio));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return null;
  }

  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);

  return context;
}

function drawEmoji(
  context: CanvasRenderingContext2D,
  emoji: string,
  x: number,
  y: number,
  size: number,
  rotation = 0,
) {
  context.save();
  context.translate(x, y);
  context.rotate(rotation);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${size}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  context.fillText(emoji, 0, 0);
  context.restore();
}

function drawRings(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsedAfterHit: number,
) {
  for (let index = 0; index < 3; index += 1) {
    const localElapsed = elapsedAfterHit - index * RING_GAP;
    if (localElapsed < 0) {
      continue;
    }

    const ringProgress = clamp(localElapsed / RING_DURATION, 0, 1);
    const radius = 12 + ringProgress * 40;
    const alpha = 1 - ringProgress;

    context.save();
    context.strokeStyle = `rgba(192, 57, 43, ${alpha})`;
    context.lineWidth = 3 - ringProgress;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }
}

function getStyleEmoji(styleId: DartStyleId) {
  return DART_STYLES.find((style) => style.id === styleId)?.emoji ?? "📍";
}

export function DartMap({
  currentThrow,
  selectedDestination,
  displayStyleId,
  onThrow,
  onReset,
  disabled = false,
  helperText,
}: DartMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [imageReady, setImageReady] = useState(false);

  const markerEmoji = useMemo(() => getStyleEmoji(displayStyleId), [displayStyleId]);

  const paintStaticMarker = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!canvas || !wrapper) {
      return;
    }

    const bounds = wrapper.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }

    const context = prepareCanvas(canvas, bounds.width, bounds.height);
    if (!context) {
      return;
    }

    if (!selectedDestination) {
      return;
    }

    const x = selectedDestination.x * bounds.width;
    const y = selectedDestination.y * bounds.height;

    context.save();
    context.fillStyle = "rgba(0, 0, 0, 0.15)";
    context.beginPath();
    context.ellipse(x, y + 18, 18, 6, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();

    drawEmoji(context, markerEmoji, x, y, MARKER_SIZE);
  }, [markerEmoji, selectedDestination]);

  useEffect(() => {
    if (currentThrow || !imageReady) {
      return;
    }

    paintStaticMarker();
  }, [currentThrow, imageReady, paintStaticMarker]);

  useEffect(() => {
    if (!imageReady) {
      return;
    }

    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return;
    }

    const observer = new ResizeObserver(() => {
      if (!currentThrow) {
        paintStaticMarker();
      }
    });

    observer.observe(wrapper);

    return () => observer.disconnect();
  }, [currentThrow, imageReady, paintStaticMarker]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;

    if (!currentThrow || !canvas || !wrapper || !imageReady) {
      return;
    }

    const bounds = wrapper.getBoundingClientRect();
    if (!bounds.width || !bounds.height) {
      return;
    }

    const emoji = getStyleEmoji(currentThrow.dartStyleId);
    const targetX = currentThrow.destination.x * bounds.width;
    const targetY = currentThrow.destination.y * bounds.height;
    const originX =
      bounds.width *
      (0.14 + (parseInt(currentThrow.token.slice(-2), 36) % 48) / 100);
    const originY = -40;
    const startedAt = performance.now();

    const animate = (timestamp: number) => {
      const context = prepareCanvas(canvas, bounds.width, bounds.height);
      if (!context) {
        return;
      }

      const elapsed = timestamp - startedAt;
      const progress = clamp(elapsed / FLIGHT_DURATION, 0, 1);
      const eased = easeOutCubic(progress);
      const currentX = originX + (targetX - originX) * eased;
      const currentY = originY + (targetY - originY) * eased;
      const rotation = -0.6 + eased * 0.8;

      context.save();
      context.fillStyle = "rgba(0, 0, 0, 0.12)";
      context.beginPath();
      context.ellipse(
        progress < 1 ? currentX : targetX,
        progress < 1 ? currentY + 18 : targetY + 18,
        18,
        6,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.restore();

      if (progress < 1) {
        drawEmoji(context, emoji, currentX, currentY, MARKER_SIZE, rotation);
        rafRef.current = window.requestAnimationFrame(animate);
        return;
      }

      const hitElapsed = elapsed - FLIGHT_DURATION;
      drawRings(context, targetX, targetY, hitElapsed);

      const shake = Math.sin(hitElapsed / 28) * Math.exp(-hitElapsed / 240) * 5;
      drawEmoji(context, emoji, targetX + shake, targetY, MARKER_SIZE, 0.12);

      if (hitElapsed < RESULT_DELAY) {
        rafRef.current = window.requestAnimationFrame(animate);
        return;
      }

      paintStaticMarker();
    };

    rafRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [currentThrow, imageReady, paintStaticMarker]);

  return (
    <section className="space-y-5">
      <div
        className={`${styles.statusPill} rounded-[22px] border border-black/[0.06] bg-white/92 px-4 py-3 shadow-soft`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-black/38">
          Current Shortlist
        </p>
        <p className="mt-1 text-sm text-black/72">{helperText}</p>
      </div>

      <div ref={wrapperRef} className={`${styles.mapShell} rounded-[28px]`}>
        <img
          ref={imageRef}
          src="/japan-map.png?v=20260505-1"
          alt="日本地図"
          className="block h-auto w-full"
          onLoad={() => setImageReady(true)}
        />
        <canvas ref={canvasRef} className={styles.mapCanvas} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onThrow}
          disabled={disabled}
          className={`${styles.throwButton} flex items-center justify-center whitespace-nowrap rounded-2xl bg-brand px-4 py-4 text-sm font-medium text-white shadow-soft disabled:cursor-not-allowed disabled:bg-black/25 disabled:shadow-none`}
        >
          <span>ダーツを投げる</span>
        </button>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center whitespace-nowrap rounded-2xl border border-black/[0.06] bg-white/90 px-4 py-4 text-sm font-medium text-black/78 shadow-soft transition hover:-translate-y-0.5"
        >
          <span>リセット</span>
        </button>
      </div>
    </section>
  );
}
