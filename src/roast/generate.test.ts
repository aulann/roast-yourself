import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import type { DeckSlide } from "./deck";
import { generateRoastCopy, RoastGenerationError } from "./generate";

const DECK: DeckSlide[] = [{ type: "hours", hours: 1840, days: 76 }];

function answer(body: string) {
  return JSON.stringify({
    slides: [{ type: "hours", title: "", body, note: "słońce", spray: "" }],
  });
}

function modelAnswering(...answers: string[]) {
  let call = 0;
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: answers[call++] }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 500,
          noCache: 500,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 500, text: 500, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe("generateRoastCopy", () => {
  it("returns validated copy", async () => {
    const model = modelAnswering(answer("To 76 dni."));
    const { copy, costUsd } = await generateRoastCopy(DECK, "spicy", "pl", model);
    expect(copy.hours?.body).toBe("To 76 dni.");
    expect(costUsd).toBeGreaterThan(0);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it("retries when the model invents a number", async () => {
    const model = modelAnswering(answer("To 9000 dni."), answer("To 76 dni."));
    const { copy } = await generateRoastCopy(DECK, "spicy", "pl", model);
    expect(copy.hours?.body).toBe("To 76 dni.");
    expect(model.doGenerateCalls).toHaveLength(2);
  });

  it("retries when the answer is not JSON", async () => {
    const model = modelAnswering("nope", answer("To 76 dni."));
    const { copy } = await generateRoastCopy(DECK, "spicy", "pl", model);
    expect(copy.hours?.body).toBe("To 76 dni.");
  });

  it("tells the model why its answer was rejected", async () => {
    const model = modelAnswering(answer("To 9000 dni."), answer("To 76 dni."));
    await generateRoastCopy(DECK, "spicy", "pl", model);
    expect(JSON.stringify(model.doGenerateCalls[0].prompt)).not.toContain(
      "rejected",
    );
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain(
      "invented numbers 9000",
    );
  });

  it("gives up after three attempts and reports the cost so far", async () => {
    const model = modelAnswering(answer("9000"), answer("9000"), answer("9000"));
    const error = await generateRoastCopy(DECK, "spicy", "pl", model).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(RoastGenerationError);
    expect(error.costUsd).toBeGreaterThan(0);
    expect(model.doGenerateCalls).toHaveLength(3);
  });

  it("sends percentages instead of raw shares and hides zero days", async () => {
    const deck: DeckSlide[] = [
      { type: "hours", hours: 2, days: 0 },
      { type: "suspect", game: { name: "Solo", hours: 2, share: 1 } },
    ];
    const model = modelAnswering("nope", "nope", "nope");
    await generateRoastCopy(deck, "mild", "en", model).catch(() => null);
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(sent).toContain("100%");
    expect(sent).not.toContain("days");
  });

  it("sends game data only inside the data block, without the player's name", async () => {
    const deck: DeckSlide[] = [
      ...DECK,
      { type: "opening", name: "Secret Name", games: 3 },
    ];
    const model = modelAnswering("nope", "nope", "nope");
    await generateRoastCopy(deck, "mild", "en", model).catch(() => null);
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(sent).toContain("<data>");
    expect(sent).not.toContain("Secret Name");
  });
});
