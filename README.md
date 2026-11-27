# tdz-schema

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

This project was created using `bun init` in bun v1.3.4. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## ddl/

Hand-applied SQL, one dated file per change (`ddl/YYYY-MM-DD-<name>.sql`), the
same convention as tabula20-schema. Files are additive and re-runnable
(`IF NOT EXISTS`); apply them by hand before any consumer deploys a schema that
contains the new tables. Every constraint and index is named explicitly, and the
Drizzle mirror in `src/schema.ts` declares the same names.

drizzle-kit 0.31.8 reports a false positive for `question_standards` and
`question_standard_reviews` (`ddl/2026-11-26-question-standards.sql`): it reads
the empty-array default of `flags` (`text[] NOT NULL DEFAULT '{}'`) back as
`'{""}'`, so it always proposes `ALTER COLUMN "flags" SET DEFAULT '{}'::text[]`.
The catalogs are identical; review the generated SQL and never push these
tables. The `id` default is a bare `gen_random_uuid()` (no `::text`) in both the
DDL and Drizzle, because drizzle-kit strips a trailing cast when it reads a
default back. tabula20's `src/server/standards/__tests__/drizzleRoundTrip.test.ts`
applies the DDL to PGlite, checks that only the `flags` lines remain, and that
the DDL and the Drizzle mirror build identical catalogs.
