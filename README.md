# Roast Yourself

Upload your Spotify data and a bored critic turns it into a mean, story-style presentation with stats, charts and a shareable magazine cover.

**Status:** early development. See [the project plan](docs/PLAN.md) (in Polish).

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS, Clerk, Neon Postgres with Drizzle, next-intl.

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
| `npm run build` | Production build (needs Clerk keys) |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate` | Apply migrations (needs `DATABASE_URL` in `.env.local`) |

## License

[MIT](LICENSE)
