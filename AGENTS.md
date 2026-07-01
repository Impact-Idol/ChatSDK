## agent runtime

- Codex is the primary lead agent for this repo.
- Prefer durable artifacts over chat-only progress: update `docs/features/**`, `docs/agent-runs/**`, and `docs/product-memory/**` as work progresses.
- For meaningful feature, hardening, integration, or debugging work, record the final state, evidence, and open follow-ups in an agent-run note or product-memory decision.
- Do not treat generated delivery packages under `assets/delivery-package/` as the source of truth unless the task is explicitly about packaged output. Prefer `packages/**`, `docs/**`, `examples/**`, `ios-sdk/**`, and deployment scripts.

## product memory / mempalace

This project uses product memory as its Mempalace-backed durable context layer.

Rules:
- Read `docs/product-memory/RESUME.md` at the start of substantial sessions. Keep it under 30 lines.
- Update `docs/product-memory/RESUME.md` at pause checkpoints with current branch/state, active work, verification status, next steps, and blockers.
- Append durable milestone notes to `docs/product-memory/CURRENT_MISSION.md`; do not use it as a scratchpad.
- Store stable architectural decisions in `docs/product-memory/decisions/`.
- Store confirmed recurring gotchas in `docs/product-memory/gotchas/`.
- When asking about prior decisions, resumed work, previous attempts, or "what did we say last time?", search Mempalace before broad raw search.

Suggested command:

```bash
/Users/pushkar/.local/bin/mempalace search "<question>" --wing chatsdk_sessions
```

## graphify

This project should maintain a Graphify knowledge graph at `graphify-out/`.

CLI: use `./scripts/graphify`, the local wrapper that finds the central Graphify install and builds from `git ls-files`.

Rules:
- Before answering architecture or cross-module codebase questions, consult `graphify-out/GRAPH_REPORT.md` when it exists.
- If `graphify-out/wiki/index.md` exists, prefer it for orientation over broad raw file reads.
- For cross-module "how does X relate to Y" questions, prefer:

```bash
./scripts/graphify query "<question>"
./scripts/graphify path "<A>" "<B>"
./scripts/graphify explain "<concept>"
```

- At the start of multi-file features, refactors, reviews, or debugging tasks, consult Graphify first when the graph exists.
- After modifying source code in a meaningful way, run:

```bash
./scripts/graphify update . --wiki
```

This update is AST-only and no-viz by default, so it avoids LLM/API spend.

## verification

- Run the smallest meaningful check for the changed surface.
- For API or auth changes, prefer package tests and targeted integration tests.
- For React/UI changes, run build/type checks and use browser/Playwright verification when a dev server is needed.
- If verification is blocked by environment, credentials, network, or missing services, record the limitation explicitly in the final answer and any relevant agent-run note.
