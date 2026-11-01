import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText, Output, type LanguageModel } from "ai";
import { roastOutputSchema, validateRoastOutput, type DeckCopy } from "./copy";
import type { DeckSlide } from "./deck";
import { buildRoastPrompt, type Heat, type RoastLocale } from "./prompt";

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 60_000;
// Reasoning counts towards this limit: at full effort it used up all of it about 1 time in 8.
const MAX_OUTPUT_TOKENS = 6000;
// Only for when OpenRouter reports no cost: deliberately above the model's real price.
const FALLBACK_USD_PER_TOKEN = 2 / 1_000_000;

export function roastModelId() {
  const model = process.env.ROAST_MODEL;
  if (!model) throw new Error("ROAST_MODEL is not set");
  return model;
}

export function createRoastModel() {
  const openrouter = createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY,
  });
  return openrouter(roastModelId(), {
    usage: { include: true },
    reasoning: { effort: "low" },
    provider: { data_collection: "deny", require_parameters: true },
  });
}

export class RoastGenerationError extends Error {
  constructor(
    message: string,
    readonly costUsd: number,
  ) {
    super(message);
  }
}

function costOf(result: Awaited<ReturnType<typeof generateText>>) {
  const usage = result.providerMetadata?.openrouter?.usage as
    | { cost?: number }
    | undefined;
  if (typeof usage?.cost === "number") return usage.cost;
  return (result.totalUsage.totalTokens ?? 0) * FALLBACK_USD_PER_TOKEN;
}

/** Calls the model, retrying with the reason when the answer cannot be used. Failed attempts still cost money. */
export async function generateRoastCopy(
  deck: DeckSlide[],
  heat: Heat,
  locale: RoastLocale,
  model: LanguageModel,
): Promise<{ copy: DeckCopy; costUsd: number }> {
  const { system, prompt } = buildRoastPrompt(deck, heat, locale);
  let costUsd = 0;
  let lastProblem = "";

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const result = await generateText({
        model,
        system,
        prompt: lastProblem
          ? `${prompt}\n\nYour previous answer was rejected: ${lastProblem}`
          : prompt,
        output: Output.object({ schema: roastOutputSchema }),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        timeout: TIMEOUT_MS,
      });
      costUsd += costOf(result);

      const { copy, problems } = validateRoastOutput(
        result.output,
        deck,
        locale,
      );
      if (copy) return { copy, costUsd };
      lastProblem = problems.join("; ");
    } catch (error) {
      lastProblem = error instanceof Error ? error.message : "unknown error";
    }
  }

  throw new RoastGenerationError(lastProblem, costUsd);
}
