"use client";

import { useEffect, useState } from "react";
import { getTierMeta } from "./results-utils";

interface ScoreGaugeProps {
  score: number;
  size?: "md" | "lg";
}

const SIZES = {
  md: { svg: 140, r: 54, stroke: 8, text: "text-4xl" },
  lg: { svg: 168, r: 64, stroke: 10, text: "text-5xl" },
};

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

export function ScoreGauge({ score, size }: ScoreGaugeProps) {
  const isMobile = useIsMobile();
  const resolvedSize = size ?? (isMobile ? "md" : "lg");
  const [animated, setAnimated] = useState(false);
  const meta = getTierMeta(score);
  const { svg, r, stroke, text } = SIZES[resolvedSize];
  const circumference = 2 * Math.PI * r;
  const center = svg / 2;

  useEffect(() => {
    const timer = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(timer);
  }, []);

  const offset = circumference - (animated ? (score / 100) * circumference : 0);

  return (
    <div
      className="relative shrink-0 mx-auto lg:mx-0"
      aria-label={`Match score: ${score} percent, ${meta.label}`}
    >
      <svg
        width={svg}
        height={svg}
        viewBox={`0 0 ${svg} ${svg}`}
        className="-rotate-90 drop-shadow-sm"
      >
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={meta.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-mono ${text} font-bold leading-none`} style={{ color: meta.color }}>
          {score}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted">
          %
        </span>
      </div>
    </div>
  );
}
