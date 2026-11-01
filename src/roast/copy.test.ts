import { describe, expect, it } from "vitest";
import { validateRoastOutput, type RoastOutput } from "./copy";
import type { DeckSlide } from "./deck";

const DECK: DeckSlide[] = [
  { type: "hours", hours: 1840, days: 76 },
  {
    type: "suspect",
    game: { name: "Portal 2", hours: 900, share: 0.77 },
  },
];

function output(
  overrides: Partial<Record<"hours" | "suspect", Partial<RoastOutput["slides"][0]>>> = {},
): RoastOutput {
  return {
    slides: [
      {
        type: "hours",
        title: "",
        body: "To 76 dni.",
        note: "słońce",
        spray: "",
        ...overrides.hours,
      },
      {
        type: "suspect",
        title: "",
        body: "Portal 2 to 77% czasu.",
        note: "związek",
        spray: "WINA",
        ...overrides.suspect,
      },
    ],
  };
}

describe("validateRoastOutput", () => {
  it("accepts text quoting the real numbers", () => {
    const { copy, problems } = validateRoastOutput(output(), DECK);
    expect(problems).toEqual([]);
    expect(copy?.suspect?.spray).toBe("WINA");
  });

  it.each(["1840 godzin", "1 840 godzin", "1,840 hours", "1.840 h"])(
    "reads thousands separators: %s",
    (body) => {
      const { problems } = validateRoastOutput(
        output({ hours: { body } }),
        DECK,
      );
      expect(problems).toEqual([]);
    },
  );

  it("rejects invented numbers", () => {
    const { copy, problems } = validateRoastOutput(
      output({ hours: { body: "To 9000 godzin." } }),
      DECK,
    );
    expect(copy).toBeNull();
    expect(problems[0]).toContain("invented numbers 9000");
  });

  it("allows small everyday numbers", () => {
    const { problems } = validateRoastOutput(
      output({ hours: { body: "O 3 w nocy." } }),
      DECK,
    );
    expect(problems).toEqual([]);
  });

  it.each(["Kupiłeś to.", "Kupiłaś to.", "Czy to KUPIŁEŚ?"])(
    "rejects Polish text assuming gender: %s",
    (body) => {
      const { problems } = validateRoastOutput(
        output({ hours: { body } }),
        DECK,
        "pl",
      );
      expect(problems[0]).toContain("gender");
    },
  );

  it.each(["MAN OWNS MANY GAMES", "he calls it art", "three hundred hours. sir."])(
    "rejects English text assuming gender: %s",
    (body) => {
      const { problems } = validateRoastOutput(
        output({ hours: { body } }),
        DECK,
      );
      expect(problems[0]).toContain("gender");
    },
  );

  it("does not mistake parts of words for gender", () => {
    const { problems } = validateRoastOutput(
      output({ hours: { body: "The shelf holds many manuals and ashes." } }),
      DECK,
    );
    expect(problems).toEqual([]);
  });

  it("rejects markdown", () => {
    const { problems } = validateRoastOutput(
      output({ hours: { body: "~~Great collection~~" } }),
      DECK,
    );
    expect(problems[0]).toContain("markdown");
  });

  it("allows quoting a share of everything as 100%", () => {
    const deck: DeckSlide[] = [
      { type: "suspect", game: { name: "Solo", hours: 2, share: 1 } },
    ];
    const { problems } = validateRoastOutput(
      {
        slides: [
          {
            type: "suspect",
            title: "",
            body: "To 100% czasu.",
            note: "x",
            spray: "x",
          },
        ],
      },
      deck,
    );
    expect(problems).toEqual([]);
  });

  it("allows gender-neutral Polish text", () => {
    const { problems } = validateRoastOutput(
      output({ hours: { body: "Nie uruchomiono. Kupiono. Została kupka." } }),
      DECK,
      "pl",
    );
    expect(problems).toEqual([]);
  });

  it("rejects an empty required field", () => {
    const { problems } = validateRoastOutput(
      output({ suspect: { spray: " " } }),
      DECK,
    );
    expect(problems).toEqual(["suspect.spray: empty"]);
  });

  it("rejects text that would not fit the slide", () => {
    const { problems } = validateRoastOutput(
      output({ hours: { note: "x".repeat(45) } }),
      DECK,
    );
    expect(problems[0]).toContain("longer than 44");
  });

  it("rejects missing, repeated and foreign slides", () => {
    const [hours, suspect] = output().slides;
    expect(
      validateRoastOutput({ slides: [hours] }, DECK).problems,
    ).toContain("suspect: expected one slide, got 0");
    expect(
      validateRoastOutput({ slides: [hours, hours, suspect] }, DECK).problems,
    ).toContain("hours: expected one slide, got 2");
    expect(
      validateRoastOutput(
        { slides: [hours, suspect, { ...hours, type: "cover" }] },
        DECK,
      ).problems,
    ).toContain("cover: not in this deck");
  });
});
