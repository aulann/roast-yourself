"use client";

import { motion } from "motion/react";
import { useFormatter } from "next-intl";
import { Circled } from "@/components/deck/vandal";
import type { DeckGame, DeckTrack } from "@/roast/deck";

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

/** Ranked plays, with the artist under each track so same-named songs stay readable. */
export function RankedTracks({ tracks }: { tracks: DeckTrack[] }) {
  const format = useFormatter();
  const longest = Math.max(...tracks.map((track) => track.plays), 1);

  return (
    <ol className="space-y-[4.5cqw]">
      {tracks.map((track, index) => (
        <li key={`${track.artist}-${track.name}`} className="relative">
          <div className="flex items-baseline justify-between gap-[3cqw] text-[4.8cqw]">
            <span className="min-w-0 truncate">{track.name}</span>
            <span className="shrink-0 font-mono">
              {format.number(track.plays)}×
            </span>
          </div>
          <p className="mb-[1.2cqw] truncate text-[3.4cqw] text-muted">
            {track.artist}
          </p>
          <motion.div
            className="h-[2.6cqw] origin-left rounded-r bg-paper"
            style={{ width: `${Math.max((track.plays / longest) * 100, 1)}%` }}
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

/** A week of listening: brighter means more, and the single busiest hour is red. */
export function ListeningClock({
  cells,
  peakDay,
  peakHour,
  days,
  label,
}: {
  cells: number[][];
  peakDay: number;
  peakHour: number;
  days: string[];
  label: string;
}) {
  const busiest = Math.max(cells[peakDay][peakHour], 1);

  return (
    <div role="img" aria-label={label} className="flex flex-col gap-[0.5cqw]">
      {cells.map((hours, day) => (
        <div key={day} className="flex items-center gap-[1cqw]">
          <span className="w-[8cqw] shrink-0 font-mono text-[2.8cqw] text-muted">
            {days[day]}
          </span>
          <div className="grid flex-1 grid-cols-24 gap-[0.3cqw]">
            {hours.map((value, hour) => {
              const isPeak = day === peakDay && hour === peakHour;
              return (
                <motion.span
                  key={hour}
                  className={`aspect-[3/5] ${isPeak ? "bg-vandal" : "bg-paper"}`}
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: isPeak ? 1 : 0.06 + (value / busiest) * 0.94,
                  }}
                  transition={{ duration: 0.3, delay: 0.1 + hour * 0.02 }}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className="ml-[9cqw] flex justify-between font-mono text-[2.6cqw] text-muted">
        {[0, 6, 12, 18].map((hour) => (
          <span key={hour}>{String(hour).padStart(2, "0")}</span>
        ))}
        <span>24</span>
      </div>
    </div>
  );
}

/** A plain ranking for data that has an order but no counts, so bars would invent a scale. */
export function RankedNames({
  items,
}: {
  items: { name: string; detail?: string }[];
}) {
  return (
    <ol className="space-y-[4cqw]">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`} className="relative flex gap-[3cqw]">
          <span className="w-[8cqw] shrink-0 font-mono text-[5cqw] text-muted">
            {index + 1}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-serif text-[7cqw] leading-tight">
              {item.name}
            </span>
            {item.detail && (
              <span className="block truncate text-[3.6cqw] text-muted">
                {item.detail}
              </span>
            )}
          </span>
          {index === 0 && <Circled />}
        </li>
      ))}
    </ol>
  );
}
