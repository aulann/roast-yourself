"use client";

import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";

const SLAP = { type: "spring", stiffness: 420, damping: 22 } as const;

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/** A note scrawled over the layout by the critic. */
export function HandNote({
  children,
  delay = 0.7,
  rotate = -4,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  rotate?: number;
  className?: string;
}) {
  return (
    <motion.p
      className={`font-hand text-[9.5cqw] leading-none text-vandal ${className}`}
      initial={{ opacity: 0, scale: 1.25, rotate: rotate - 4 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ ...SLAP, delay }}
    >
      {children}
    </motion.p>
  );
}

export function Tape({
  className = "",
  rotate = -6,
  delay = 0.2,
}: {
  className?: string;
  rotate?: number;
  delay?: number;
}) {
  return (
    <motion.span
      aria-hidden
      className={`tape absolute h-[6cqw] w-[28cqw] ${className}`}
      initial={{ opacity: 0, scale: 1.4, rotate: rotate + 10 }}
      animate={{ opacity: 1, scale: 1, rotate }}
      transition={{ ...SLAP, delay }}
    />
  );
}

/** A taped-on paper cutting: ink on cream, slightly crooked. */
export function Clipping({
  children,
  rotate = -2,
  delay = 0.1,
  className = "",
}: {
  children: ReactNode;
  rotate?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={`relative ${className}`}
      initial={{ opacity: 0, y: 30, rotate: rotate - 5 }}
      animate={{ opacity: 1, y: 0, rotate }}
      transition={{ ...SLAP, delay }}
    >
      <div className="clipping bg-paper px-[5cqw] py-[4cqw] text-ink">
        {children}
      </div>
      <Tape className="-top-[2.5cqw] left-[30%]" delay={delay + 0.25} />
    </motion.div>
  );
}

/** Text with a red pen line drawn through it. */
export function Struck({
  children,
  delay = 0.5,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-[-3%] top-1/2 h-[0.35em] w-[106%] -translate-y-1/2 overflow-visible"
      >
        <motion.path
          d="M1 6 C 20 2, 35 9, 52 5 S 85 3, 99 6"
          fill="none"
          stroke="var(--color-vandal)"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ clipPath: "inset(-50% 100% -50% -5%)" }}
          animate={{ clipPath: "inset(-50% -5% -50% -5%)" }}
          transition={{ duration: 0.4, delay, ease: "easeIn" }}
        />
      </svg>
    </span>
  );
}

/** A red pen circling something on the page. */
export function Circled({ delay = 0.9 }: { delay?: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 40"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -top-[2.5cqw] -left-[3cqw] h-[calc(100%+5cqw)] w-[calc(100%+6cqw)] overflow-visible"
    >
      <motion.path
        d="M3 8 C 20 1, 70 0, 94 3 C 100 6, 100 30, 95 36 C 70 40, 25 40, 5 36 C -1 28, -1 14, 5 5"
        fill="none"
        stroke="var(--color-vandal)"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ clipPath: "inset(-5% 100% -5% -5%)" }}
        animate={{ clipPath: "inset(-5% -5% -5% -5%)" }}
        transition={{ duration: 0.55, delay, ease: "easeInOut" }}
      />
    </svg>
  );
}

/** Spray paint across the page. Decorative, so the wording also has to appear in the copy. */
export function Spray({
  children,
  delay = 0.5,
  rotate = -9,
  className = "",
  style,
}: {
  children: ReactNode;
  delay?: number;
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.span
      aria-hidden
      style={style}
      className={`spray pointer-events-none absolute font-hand font-bold text-vandal ${className}`}
      initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)", rotate }}
      animate={{ opacity: 0.92, clipPath: "inset(-20% -5% -20% 0)", rotate }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.span>
  );
}

/** Rough edges for spray paint, rendered once per deck. */
export function SprayFilter() {
  return (
    <svg aria-hidden className="absolute size-0">
      <filter id="spray-filter">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          result="noise"
        />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
      </filter>
    </svg>
  );
}
