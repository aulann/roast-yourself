"use client";

import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { SlideView } from "@/components/deck/slide-view";
import { SprayFilter } from "@/components/deck/vandal";
import { Link } from "@/i18n/navigation";
import type { DeckSlide } from "@/roast/deck";

const HOLD_MS = 250;
const PREVIOUS_ZONE = 0.35;

const CONTROL =
  "flex size-11 items-center justify-center font-mono text-lg text-paper";

export function Stories({
  slides,
  closeHref,
  badge,
}: {
  slides: DeckSlide[];
  closeHref: string;
  badge?: string;
}) {
  const t = useTranslations("deck.controls");
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const pressedAt = useRef(0);

  const lastIndex = slides.length - 1;
  const next = () => setIndex((current) => Math.min(current + 1, lastIndex));
  const previous = () => setIndex((current) => Math.max(current - 1, 0));

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((current) => Math.min(current + 1, lastIndex));
      } else if (event.key === "ArrowLeft") {
        setIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === " ") {
        event.preventDefault();
        setPaused((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lastIndex]);

  function onFrameClick(event: MouseEvent<HTMLDivElement>) {
    // A long press only pauses, so letting go must not change the slide.
    if (Date.now() - pressedAt.current > HOLD_MS) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    if ((event.clientX - left) / width < PREVIOUS_ZONE) previous();
    else next();
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="grain fixed inset-0 z-50 flex items-center justify-center gap-2 bg-black">
        <SprayFilter />
        <p
          aria-hidden
          className="absolute top-1/2 left-[2vw] hidden -translate-y-1/2 font-serif text-[9vw] leading-none font-black text-paper/[0.07] uppercase [writing-mode:vertical-rl] rotate-180 lg:block"
        >
          Roast
        </p>
        <p
          aria-hidden
          className="absolute top-1/2 right-[2vw] hidden -translate-y-1/2 font-serif text-[9vw] leading-none font-black text-paper/[0.07] uppercase italic [writing-mode:vertical-rl] lg:block"
        >
          Yourself
        </p>
        <button
          type="button"
          onClick={previous}
          disabled={index === 0}
          aria-label={t("previous")}
          className={`${CONTROL} hidden disabled:opacity-30 sm:flex`}
        >
          ←
        </button>

        <div
          className="relative h-dvh w-full cursor-pointer overflow-hidden bg-ink select-none [container-type:size] sm:aspect-[9/16] sm:w-auto"
          onPointerDown={() => {
            pressedAt.current = Date.now();
            setHeld(true);
          }}
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onPointerLeave={() => setHeld(false)}
          onClick={onFrameClick}
        >
          <div className="grain pointer-events-none absolute inset-0" />

          <div className="absolute inset-x-[3cqw] top-[2.5cqw] z-10 flex gap-[1cqw]">
            {slides.map((_, position) => (
              <div
                key={position}
                className="h-[0.6cqw] min-h-0.5 flex-1 overflow-hidden bg-paper/25"
              >
                {position < index && <div className="h-full bg-paper" />}
                {position === index && (
                  <div
                    key={index}
                    className="story-progress h-full bg-paper"
                    style={{
                      animationPlayState:
                        paused || held ? "paused" : "running",
                    }}
                    onAnimationEnd={next}
                  />
                )}
              </div>
            ))}
          </div>

          <div
            className="absolute top-[4cqw] right-[2cqw] z-10 flex"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPaused((current) => !current)}
              aria-label={paused ? t("play") : t("pause")}
              className={CONTROL}
            >
              {paused ? "▶" : "❚❚"}
            </button>
            <Link href={closeHref} aria-label={t("close")} className={CONTROL}>
              ✕
            </Link>
          </div>

          {badge && (
            <p className="absolute top-[7cqw] left-[6cqw] z-10 font-mono text-[2.6cqw] uppercase tracking-widest text-muted">
              {badge}
            </p>
          )}

          <div className="sr-only" aria-live="polite">
            {t("position", { current: index + 1, total: slides.length })}
          </div>

          <AnimatePresence mode="wait">
            <motion.section
              key={index}
              data-slide={slides[index].type}
              className="absolute inset-0 overflow-hidden px-[7cqw] pt-[16cqw] pb-[13cqw]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-live={paused ? "polite" : "off"}
            >
              {slides[index].type !== "cover" && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -top-[4cqw] -right-[5cqw] font-serif text-[78cqw] leading-none text-paper/[0.05] italic"
                >
                  {index + 1}
                </span>
              )}
              <SlideView slide={slides[index]} />
              <p className="absolute inset-x-[7cqw] bottom-[4cqw] flex justify-between border-t border-paper/20 pt-[1.5cqw] font-mono text-[2.6cqw] uppercase tracking-widest text-muted">
                <span>Roast Yourself</span>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(slides.length).padStart(2, "0")}
                </span>
              </p>
            </motion.section>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={next}
          disabled={index === lastIndex}
          aria-label={t("next")}
          className={`${CONTROL} hidden disabled:opacity-30 sm:flex`}
        >
          →
        </button>
      </div>
    </MotionConfig>
  );
}
