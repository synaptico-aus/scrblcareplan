# Dependency security maintenance

Run `npm audit` and the Replit dependency scan against `package-lock.json`.
The two scanners count advisories differently; both must be clear.

Verification:

- `npm run check`
- `npm run test:dependencies`
- `npm run test:care-plan`
- `npm run test:care-plan-browser`
- `npm run build`
- `npx --no-install drizzle-kit check` (reads local migrations; does not push schema changes)

## Compatibility choices

The app keeps Node 20, Express 4 and Tailwind 3. Vite 6.4.6 includes the
required security fixes without requiring a new Node runtime. OpenAI 6 and
Google Cloud Storage 7 are the patched, Node-20-compatible release lines.
No database schema or stored clinical data changes are required.

Zod 4 requires `.issues` for validation errors and explicit record key schemas.
Object groups use `.prefault({})` so nested null defaults are parsed, preserving
the previous sparse-document and serialization behavior.

## Temporary nested dependency overrides

- `@esbuild-kit/core-utils > esbuild`: Drizzle Kit's latest stable release still
  brings an old loader with vulnerable esbuild. The override uses patched
  esbuild 0.25; the build and migration checks exercise compatibility.
- `postcss-selector-parser`: the latest typography plugin pins vulnerable
  6.0.10 exactly. Use patched 6.1.6 within the same major.
- `gaxios > uuid` and `teeny-request > uuid`: the Node-20-compatible Google
  client still requests vulnerable UUID 9. UUID 11 is patched and retains
  CommonJS support and the v4 API these clients use. Do not replace it with
  ESM-only UUID 12+. The dependency compatibility tests check both clients.

Remove each override once its parent supports a patched version natively.
