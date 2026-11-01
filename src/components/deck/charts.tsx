"use client";

import { motion } from "motion/react";
import { useFormatter } from "next-intl";
import { Circled } from "@/components/deck/vandal";
import type { DeckGame } from "@/roast/deck";

/** Ranked bars with every value printed, since tapping a slide navigates instead of showing tooltips. */
export function RankedGames({ games }: { games: DeckGame[] }) {
  const format = useFormatter();
  const longest = Math.max(...games.map((game) => game.hours), 1);

  return (
    <ol className="space-y-[5.5cqw]">
      {games.map((game, index) => (
        <li key={game.name} className="relative">
          <div className="mb-[1.5cqw] flex items-baseline justify-between gap-[3cqw] text-[4.8cqw]">
            <span className="min-w-0 truncate">{game.name}</span>
            <span className="shrink-0 font-mono">
              {format.number(game.hours)} h
            </span>
          </div>
          <motion.div
            className="h-[2.6cqw] origin-left rounded-r bg-paper"
            style={{ width: `${Math.max((game.hours / longest) * 100, 1)}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{
              duration: 0.6,
              delay: 0.2 + index * 0.1,
              ease: "easeOut",
            }}
          />
          {index === 0 && <Circled />}
        </li>
      ))}
    </ol>
  );
}

/** 100 cells, one per percent of the library: cream means never launched, so spray stays readable on top. */
export function BacklogWaffle({
  share,
  label,
}: {
  share: number;
  label: string;
}) {
  const filled = Math.round(share * 100);

  return (
    <div
      role="img"
      aria-label={label}
      className="grid aspect-square w-[72cqw] grid-cols-10 gap-[0.8cqw]"
    >
      {Array.from({ length: 100 }, (_, index) => (
        <motion.span
          key={index}
          className={index < filled ? "bg-paper" : "bg-paper/15"}
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.1 + index * 0.008 }}
        />
      ))}
    </div>
  );
}
