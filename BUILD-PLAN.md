# Vault — Build Plan (one focused day)

You already have the hard parts done: the data, the Coral source, and the proven
queries. The backend and frontend are ~70% reusable from Compass. Build in this
order so you always have a working demo, even if you run out of time.

Legend: ✅ already done · 🔨 build tomorrow · ♻️ copy from Compass and tweak

---

## Phase 0 — Foundation (✅ DONE)

- ✅ `scripts/seed_data.py` → generates the 3 JSONL files with planted leaks
- ✅ `data/transactions.jsonl`, `data/receipts.jsonl`, `data/usage.jsonl`
- ✅ `sources/vault/manifest.yaml` → registered with Coral, all test queries pass
- ✅ `queries.md` → 7 leak queries, each run live and returning the demo numbers

If you ever need to reset: `python scripts/seed_data.py` then
`coral source add --file sources/vault/manifest.yaml`.

---

## Phase 1 — Backend core (the part that wins) — ~2–3 hrs

**♻️ Copy from Compass `backend/`:** `coral_runner.py`, `gemini_client.py`,
`requirements.txt`. Change the port to **8002** and point `CORAL_CONFIG_DIR` at
the same `coral-hackathon-local-test` workspace where `vault` is registered.

**🔨 `backend/queries.py`** — paste the 7 queries from `queries.md` as functions:
`forgotten_subscriptions()`, `price_hikes()`, `duplicate_categories()`,
`trials_converting()`, `annual_renewals()`, `annual_leak_total()`, `spend_map()`.
They take no arguments — the data is fixed — so they're trivial to wire.

**🔨 `backend/leaks.py`** — assemble one `/api/leaks` payload:
- run the 6 detector queries (in parallel with `ThreadPoolExecutor` — see the
  Token ROI endpoint in Helm for the exact pattern, it matters for speed)
- tag each row with a `leak_type` (`forgotten` / `price_hike` / `duplicate` /
  `trial` / `annual` / `cloud_creep`) and a `severity`
- compute the **Annual Leak** hero number (sum of forgotten + duplicate savings
  + price-hike deltas)
- attach the Coral proof object (sql, sources, row_count, duration_ms) to each
  group — `coral_runner` already returns this

**🔨 `backend/drafts.py`** — `draft_cancellation(service)` returns a short,
polite cancel email + the `cancel_url` from `vault.receipts`. Draft only. No send.

**🔨 `backend/main.py`** — endpoints:
- `GET /api/leaks` → the full leaks payload + hero number + proofs
- `GET /api/spend-map` → category donut data
- `GET /api/health` → Coral source health (♻️ from Compass)
- `POST /api/draft-cancel` → `{service}` → draft email
- `POST /api/ask` → plain-English Q&A (♻️ Compass `ask` pattern; route to the
  closest query, then Gemini explains; keep the SQL proof attached)
- `GET /api/iphone/brief` → plain text, e.g. `"2 forgotten charges hit this week — $58.95. Biggest leak: Peloton $44/mo, unused 5 months."`

**Checkpoint:** `curl localhost:8002/api/leaks` returns the 5 forgotten subs +
hero number. If this works, you can already win — everything else is polish.

---

## Phase 2 — Frontend (the part judges see) — ~3–4 hrs

**♻️ Copy from Compass `frontend/`:** the Vite/Tailwind shell, `api.ts`,
`CoralProof.tsx`, `BrandMarks.tsx`, the header/layout. Rename to Vault, new
color theme (deep green/gold "vault" palette).

**🔨 Build these components (in priority order):**

1. **`HeroLeak.tsx`** — the giant "$1,187/year leaking" number + subline. This is
   the screenshot. Make it beautiful. *(highest priority)*
2. **`LeaksFeed.tsx`** — cards for each leak: service, monthly bleed, last-used,
   leak-type badge, "Generate cancel draft" button, expandable Coral SQL proof.
3. **`SpendMap.tsx`** — Recharts donut of spend by category (♻️ Compass chart).
4. **`LocalFirstBadge.tsx`** — persistent "🔒 0 bytes left this device" pill in
   the header. Small, but it's the whole trust story — always visible.
5. **`AskVault.tsx`** — ♻️ Compass `AskCompass.tsx`, re-themed.
6. **`CancelDraftModal.tsx`** — shows the generated email + cancel link + copy
   button.

**Checkpoint:** the hero number, the leaks feed with one expanded SQL proof, and
the local-first badge all render. That's a winning screen.

---

## Phase 3 — Winning polish — ~1–2 hrs

- **Local-first proof on camera:** a tiny "Network: 0 external calls" panel, or
  literally show the Coral query runs with no internet to a cloud. This is your
  unfair advantage — make it impossible to miss.
- **One-tap cancel draft** working end to end (click → modal → copy).
- **iPhone Shortcut**: set up the `Get Contents of URL` → `Show Notification`
  shortcut against `/api/iphone/brief`. Screen-record it firing on your phone.
- **Spend Map donut** colored by leak status (green=used, red=forgotten, etc).
- Seed-data sanity: re-run `seed_data.py` so all dates are fresh relative to demo day.

---

## Phase 4 — Submission assets — ~1 hr

- Record the 3-minute video using `demo-script.md`.
- Screenshots: the hero number, a leaks card with SQL proof, the donut, the
  iPhone notification, the local-first badge.
- Submit the `vault` source spec to the Coral community repo too — it's a clean
  JSONL file source and counts toward the **Top-10 Source Spec** bounty.
- Post the build in Coral Discord `#how-i-coral` (the showcase bounty).

---

## What to cut if you run low on time (in this order)

1. Ask Vault (nice, not essential)
2. Spend Map donut (the leaks feed alone wins)
3. iPhone brief (mention it instead of demoing it)

**Never cut:** the hero number, the leaks feed with SQL proof, and the
local-first badge. Those three are the win.

---

## The one risk to manage

The whole edge is **local-first + a file joined to other sources**. Make sure the
demo visibly shows the data is local (the file paths, the badge, ideally no
network). If a judge thinks it's just another cloud finance app, you lose the
differentiator. Say "local" and "never leaves your machine" early and often.
