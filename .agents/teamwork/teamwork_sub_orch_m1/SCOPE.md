# Scope: Milestone 1 — Font, Asset & Cache Optimization

## Objectives
Implement initial rendering path optimizations, asset hygiene, and caching improvements without breaking UI:
1. **F1. Consolidate Web Fonts & Eliminate Render-Blocking**:
   - In `src/app/index.css`: Remove `@fontsource/jetbrains-mono` import lines (`@import "@fontsource/jetbrains-mono/400.css";`, etc.) to eliminate 24 redundant font binary files from `dist/assets/`.
   - In `index.html`: Ensure Google Fonts stylesheet link uses `display=swap` and non-blocking or preloaded stylesheet pattern so the browser does not block initial layout and paint on external font requests.
   - In `package.json`: Remove `"@fontsource/jetbrains-mono"` dependency.
2. **F2. Static Asset Hygiene & Dead Asset Removal**:
   - Remove unused 695KB `public/auth-bg.png`.
   - Remove unreferenced legacy assets in `public/auth/` if verified dead.
   - Remove `"shadcn"` from runtime `dependencies` in `package.json`.
3. **F3. HTTP Cache Directives Optimization**:
   - In `public/_headers`: Add explicit caching rules for `/auth/*`, `/data/*`, and static icons (`Cache-Control: public, max-age=604800, stale-while-revalidate=86400`).
4. **F4. HTML Boot Skeleton Neutralization**:
   - In `index.html`: Update the inline `#root` loading skeleton so that it renders a neutral, centered pulse animation or generic app shell rather than the 440px auth modal card, eliminating layout shift (CLS) when navigating directly to dashboard and wide authenticated routes.

## Assigned Files & Write Ownership
- `index.html`
- `src/app/index.css`
- `package.json`
- `public/_headers`
- `public/auth-bg.png` (delete)

## Pass / Verification Criteria
- `npm run build` succeeds cleanly with exit code 0.
- `public/auth-bg.png` is removed from `dist/` and `public/`.
- 24 font files from `@fontsource/jetbrains-mono` are no longer generated in `dist/assets/`.
- `dist/assets/index-*.css` size drops by ~15 KB.
- `dist/_headers` contains cache directives for `/auth/*` and `/data/*`.
- Reviewer APPROVE, Challenger verified, Forensic Auditor CLEAN.
