# Planning Evidence

- `extensions/trellis.ts`: existing project/root/session identity, read-only task display and canonical archive exclusion; imports host pi-tui width utilities and registers initialization through a dedicated library module.
- `package.json`: Pi coding-agent and pi-tui are existing peer dependencies; test preload uses actual host pi-tui. No additional TUI framework is needed.
- Pi 1.2.0 docs `docs/extensions.md` and `docs/tui.md` (read in full): `registerCommand`, command-local `ctx.ui.custom`, TUI-only mode guard, custom completion lifecycle, theme helpers, width-safe rendering, and Markdown composition.
- Installed host `@earendil-works/pi-tui/dist/components/markdown.d.ts`: Markdown component with `render(width)`, invalidation, nested lists and width-aware table rendering.
- Installed host `markdown.js` inspected blocks: `renderToken()` implements headings/code/lists/tables/quotes; `renderInlineTokens()` implements emphasis/inline code/links and raw HTML text; `renderList()` preserves `[x]`/`[ ]` task markers. Link rendering supports OSC 8 or printed URL fallback.
- These are API/source findings, not an interactive browser test. Real-host rendering assertions and a possible actual TUI smoke test remain implementation acceptance work.
- User confirmed English application UI. Task titles and document bodies should remain their original language. No task-lifecycle mutations are authorized by opening details.
- Planning scope follows the proposed MVP: list, hierarchy, read-only document details, keyboard navigation and refresh. Search/archive browsing remain deferred.
