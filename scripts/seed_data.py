"""
Vault demo data generator.

Writes three local JSONL files that Coral reads as SQL tables:
  data/transactions.jsonl  — your bank export (the money going out)
  data/receipts.jsonl      — your inbox receipts (what you signed up for, when, list price)
  data/usage.jsonl         — your app activity (when you last actually used each service)

The three files are independent "worlds" — money, sign-ups, usage — that no single
app connects. Vault joins them in one Coral SQL query to find leaking money.

Everything here uses real merchant names and real 2026 subscription prices, with a
deliberately story-rich set of leaks planted so the demo lands:

  - Forgotten / zombie subs:   Audible, Peloton, Disney+ (charged monthly, unused for months)
  - Duplicate categories:      Spotify + Apple Music (music), Notion + Evernote (notes)
  - Silent price hike:         Netflix 15.49 -> 17.99
  - Free trial converting:     Adobe Creative Cloud ($0 trial -> $59.99 in 2 days)
  - Cloud creep:               AWS 12.40 -> 83.10 over 4 months
  - Annual sneak renewal:      Amazon Prime $139 renews in 3 days

Run:  python scripts/seed_data.py
"""

import json
from datetime import date, timedelta
from pathlib import Path

NOW = date(2026, 5, 30)              # the "today" the demo is anchored to
DATA = Path(__file__).resolve().parent.parent / "data"
DATA.mkdir(parents=True, exist_ok=True)


def d(days_ago: int) -> str:
    return (NOW - timedelta(days=days_ago)).isoformat()


def on(iso: str) -> str:
    return iso


# ── Subscription catalog: (merchant, service, category, list_price, cycle, signup_days_ago, last_used_days_ago) ──
# last_used_days_ago = None means "no usage record" (treated as never/unknown).
SUBS = [
    # merchant            service              category      price   cycle      signup  last_used
    ("Netflix",           "Netflix",           "streaming",  17.99,  "monthly",  812,    1),
    ("Spotify",           "Spotify Premium",   "music",      11.99,  "monthly",  640,    0),
    ("Apple Music",       "Apple Music",       "music",      10.99,  "monthly",  410,    96),   # duplicate + barely used
    ("Audible",           "Audible",           "audiobooks", 14.95,  "monthly",  900,    243),  # ZOMBIE
    ("Peloton",           "Peloton App",       "fitness",    44.00,  "monthly",  500,    151),  # ZOMBIE (expensive)
    ("Adobe",             "Creative Cloud",    "creative",   59.99,  "monthly",  18,     3),    # TRIAL converting
    ("Notion",            "Notion Plus",       "notes",      10.00,  "monthly",  300,    2),
    ("Evernote",          "Evernote Personal", "notes",      14.99,  "monthly",  720,    119),  # duplicate + forgotten
    ("OpenAI",            "ChatGPT Plus",      "ai",         20.00,  "monthly",  250,    0),
    ("AWS",               "Amazon Web Services","cloud",     83.10,  "monthly",  430,    1),    # CLOUD CREEP
    ("iCloud",            "iCloud+ 200GB",     "storage",     2.99,  "monthly",  980,    0),
    ("Disney Plus",       "Disney+",           "streaming",  13.99,  "monthly",  390,    71),   # forgotten
    ("NYTimes",           "NYT Digital",       "news",       17.00,  "monthly",  610,    4),
    ("Amazon Prime",      "Amazon Prime",      "shopping",  139.00,  "annual",   362,    5),    # ANNUAL sneak
]

# Price-hike history: merchant -> list of (charge_date_days_ago, amount) overriding the flat monthly charge.
PRICE_HISTORY = {
    "Netflix": [(118, 15.49), (88, 15.49), (58, 15.49), (28, 17.99), (1, 17.99)],     # hike at ~day 28
    "AWS":     [(118, 12.40), (88, 31.80), (58, 58.20), (28, 71.40), (1, 83.10)],     # creep
}

# Free-trial: merchant -> ($0 trial charge days_ago, conversion_date_days_from_now, convert_amount)
TRIALS = {
    "Adobe": (18, -2, 59.99),   # signed up 18d ago, converts in 2 days (negative days_ago = future)
}

transactions = []
receipts = []
usage = []
txn_id = 1000


def add_txn(iso_date, merchant, desc, amount, category):
    global txn_id
    txn_id += 1
    transactions.append({
        "txn_id": f"T{txn_id}",
        "date": iso_date,
        "merchant": merchant,
        "description": desc,
        "amount": round(amount, 2),
        "category": category,
    })


# ── Build subscription charges + receipts + usage ─────────────────────────────
for merchant, service, category, price, cycle, signup, last_used in SUBS:
    receipts.append({
        "merchant": merchant,
        "service": service,
        "category": category,
        "list_price": price,
        "billing_cycle": cycle,
        "signup_date": d(signup),
        "cancel_url": f"https://{merchant.lower().replace(' ', '')}.com/account/cancel",
    })
    if last_used is not None:
        usage.append({
            "service": service,
            "merchant": merchant,
            "last_used_date": d(last_used),
            "sessions_last_30d": 0 if last_used > 30 else max(1, 30 - last_used),
        })

    if merchant in TRIALS:
        trial_days_ago, _convert_in, _amt = TRIALS[merchant]
        add_txn(d(trial_days_ago), merchant, f"{service} FREE TRIAL", 0.00, "subscription")
        continue

    if cycle == "annual":
        # one annual charge ~last year, next renewal sneaking up (3 days out)
        add_txn(d(signup), merchant, f"{service} ANNUAL", -price, "subscription")
        continue

    if merchant in PRICE_HISTORY:
        for days_ago, amt in PRICE_HISTORY[merchant]:
            add_txn(d(days_ago), merchant, service, -amt, "subscription")
    else:
        # flat monthly charge for ~4 months
        for days_ago in (118, 88, 58, 28, 1):
            add_txn(d(days_ago), merchant, service, -price, "subscription")


# ── Realistic non-subscription noise so it reads like a true bank statement ───
NOISE = [
    ("Whole Foods Market", "groceries", 92.40), ("Trader Joe's", "groceries", 47.10),
    ("Shell", "gas", 58.30), ("Chipotle", "dining", 14.85), ("Starbucks", "dining", 6.75),
    ("Uber", "transport", 23.40), ("Amazon", "shopping", 64.20), ("CVS Pharmacy", "health", 18.90),
    ("Trader Joe's", "groceries", 51.66), ("Shell", "gas", 61.05), ("Chipotle", "dining", 16.20),
    ("Uber Eats", "dining", 31.75), ("Target", "shopping", 88.40), ("Starbucks", "dining", 5.95),
]
for i, (m, cat, amt) in enumerate(NOISE):
    add_txn(d(110 - i * 7), m, m, -amt, cat)

# Monthly salary deposits (positive) + rent (large negative) for realism.
for days_ago in (120, 90, 60, 30):
    add_txn(d(days_ago), "Acme Corp Payroll", "DIRECT DEPOSIT PAYROLL", 4200.00, "income")
    add_txn(d(days_ago - 2), "Skyline Apartments", "RENT", -1850.00, "housing")


def write_jsonl(name, rows):
    path = DATA / name
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row) + "\n")
    print(f"  wrote {len(rows):3d} rows -> {path}")


print("Generating Vault demo data (anchored at 2026-05-30)...")
# sort transactions oldest -> newest for a natural statement
transactions.sort(key=lambda r: r["date"])
write_jsonl("transactions.jsonl", transactions)
write_jsonl("receipts.jsonl", receipts)
write_jsonl("usage.jsonl", usage)
print("Done.")
