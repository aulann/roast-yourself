# Roast Yourself

Connect your Steam account and a bored critic turns your library into a mean, story-style presentation with stats, charts and a shareable magazine cover.

**Status:** early development. See [the project plan](docs/PLAN.md) (in Polish).

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, Clerk, Neon Postgres with Drizzle, next-intl, AI SDK with OpenRouter.

## Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

| Command | Purpose |
|---|---|
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit tests |
| `npm run test:e2e` | Browser tests (needs Clerk keys) |
| `npm run eval` | Evals on the real model and database (costs money, writes `evals/output/report.md`) |
| `npm run build` | Production build (needs Clerk keys) |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate` | Apply migrations (needs `DATABASE_URL` in `.env.local`) |

## License

[MIT](LICENSE)
