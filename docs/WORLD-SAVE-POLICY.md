# World-save compatibility policy

Applies to `src/state/worldSave.js` (format `vepa-world-save`, current
`WORLD_SAVE_VERSION = 1`). This covers the in-browser store (IndexedDB, with a
localStorage fallback) and `.vepa.json` export/import.

## Rules

1. **Older and current saves always load.** A save with no `version`, or a
   `version` up to `WORLD_SAVE_VERSION`, is accepted.
2. **Additive fields get defaults.** A field added after v1 (for example
   `civilization` or `codex`) must be optional. When it is missing, the loader
   gives it a neutral default (`null` means "no state"). Adding such a field
   **does not** bump the version.
3. **Unknown fields are ignored.** A same-version file carrying fields this
   build does not know still loads; the extra fields are dropped.
4. **Newer versions are rejected, not half-restored.** `assertSupportedVersion`
   throws `Unsupported world save version N: this build reads versions up to M`
   on both import (`parseWorldSave`) and restore (`restoreWorldState`).
5. **Breaking changes bump the version.** Bump `WORLD_SAVE_VERSION` only when
   an old save would load *wrongly*, for example a changed buffer layout or
   `PARTICLE_STRIDE`, or a changed meaning of an existing field. The same change
   must add a migration from every older version and a frozen fixture test.
6. **Round trips are lossless.** Export followed by import must keep every
   field the store keeps, including the additive ones.

## Known gaps

- Fixed 2026-10-03: Mechanics laws (128-135, `pentaFlags`) were not saved.
  They are now an additive `laws.penta` field. A save without it leaves the
  live Mechanics laws as they are.

- The PRNG seed and state are not saved yet (RRP E9, see `.codey/RRP-VERIFY.md`).
  When they are added, they will come in as an additive field per rule 2.
- `runtime` saves numeric knobs only, so string settings such as `gravEngine`
  are not persisted.

## Tests

`tests/unit/worldSaveCompat.test.js` covers:

- a frozen legacy v1 file loading;
- additive defaults;
- unknown fields being ignored;
- newer versions being rejected on import and on restore;
- a lossless export/import round trip.

`tests/unit/worldSave.test.js` covers the general store behaviour.
