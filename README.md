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
