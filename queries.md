# Vault — Coral SQL queries (all proven against the demo data)

Every query below was run live against the `vault` Coral source
(`coral-hackathon-local-test`) and returns the numbers quoted in the demo.
Three local JSONL files — `vault.transactions`, `vault.receipts`, `vault.usage` —
joined by Coral in one plan. Nothing leaves the machine.

Run any of these with:

```bash
wsl -d Ubuntu -e env CORAL_CONFIG_DIR=/home/rjdp/coral-hackathon-local-test \
  /home/rjdp/.cargo/bin/coral sql --format json "<QUERY>"
```

---

## 1. THE KILLER QUERY — Forgotten subscriptions (money × receipts × usage)

*Charged every month, but you haven't opened it in 60+ days. Three independent
sources — your bank, your inbox, your app activity — joined on the service.*

```sql
SELECT
    r.service,
    r.category,
    r.list_price                       AS monthly,
    ROUND(r.list_price * 12, 2)        AS annual_waste,
    u.last_used_date,
    COUNT(t.txn_id)                    AS charges_last_4mo
FROM vault.receipts r
JOIN vault.usage u        ON u.service  = r.service
JOIN vault.transactions t ON t.merchant = r.merchant AND t.category = 'subscription'
WHERE r.billing_cycle = 'monthly'
  AND CAST(u.last_used_date AS DATE) < CAST(CURRENT_DATE AS TIMESTAMP) - INTERVAL '60 days'
GROUP BY r.service, r.category, r.list_price, u.last_used_date
ORDER BY annual_waste DESC
```

**Returns:** Peloton App $528/yr, Evernote $179.88, Audible $179.40, Disney+ $167.88, Apple Music $131.88 → **~$1,187/yr in forgotten spend.**

---

## 2. Silent price hikes (transactions × receipts)

*The price crept up and nobody told you. Compares the latest real charge to the
price you signed up at.*

```sql
WITH latest AS (
    SELECT merchant, MAX(date) AS last_date
    FROM vault.transactions
    WHERE category = 'subscription'
    GROUP BY merchant
),
first_charge AS (
    SELECT merchant, MIN(date) AS first_date
    FROM vault.transactions
    WHERE category = 'subscription'
    GROUP BY merchant
)
SELECT
    t_now.merchant,
    ABS(t_old.amount)                          AS was_paying,
    ABS(t_now.amount)                          AS now_paying,
    ROUND(ABS(t_now.amount) - ABS(t_old.amount), 2)         AS monthly_increase,
    ROUND((ABS(t_now.amount) - ABS(t_old.amount)) * 12, 2)  AS yearly_increase
FROM latest l
JOIN first_charge f       ON f.merchant = l.merchant
JOIN vault.transactions t_now ON t_now.merchant = l.merchant AND t_now.date = l.last_date
JOIN vault.transactions t_old ON t_old.merchant = f.merchant AND t_old.date = f.first_date
WHERE ABS(t_now.amount) > ABS(t_old.amount)
ORDER BY yearly_increase DESC
```

**Returns:** Netflix $15.49 → $17.99 (+$30/yr), AWS $12.40 → $83.10 (cloud creep, +$848/yr to review).

---

## 3. Duplicate categories (receipts)

*Paying for two services that do the same job.*

```sql
SELECT
    category,
    COUNT(*)              AS services,
    SUM(list_price)       AS monthly_total,
    ROUND(SUM(list_price) * 12, 2) AS annual_total
FROM vault.receipts
WHERE billing_cycle = 'monthly'
GROUP BY category
HAVING COUNT(*) > 1
ORDER BY monthly_total DESC
```

**Returns:** streaming ×2 ($31.98/mo), notes ×2 ($24.99/mo), music ×2 ($22.98/mo). Cancel the cheaper-value one in each pair → save the lower line.

---

## 4. Free trial about to convert (receipts × transactions)

*Signed up recently, a $0 trial charge landed, real money hits in days.*

```sql
SELECT
    r.service,
    r.signup_date,
    r.list_price                       AS converts_to,
    ROUND(r.list_price * 12, 2)        AS annual_if_kept
FROM vault.receipts r
JOIN vault.transactions t ON t.merchant = r.merchant
WHERE t.amount = 0.0
  AND CAST(r.signup_date AS DATE) >= CAST(CURRENT_DATE AS TIMESTAMP) - INTERVAL '30 days'
ORDER BY r.signup_date DESC
```

**Returns:** Creative Cloud — signed up ~12 days ago, $0 trial charge, converts to $59.99/mo ($720/yr) within days.

---

## 5. Annual renewal sneaking up (receipts)

*An annual charge you forgot about renews this week.*

```sql
SELECT
    service,
    list_price                         AS annual_charge,
    signup_date,
    CAST(signup_date AS DATE) + INTERVAL '365 days' AS approx_renewal
FROM vault.receipts
WHERE billing_cycle = 'annual'
```

**Returns:** Amazon Prime — $139 annual, renews in ~3 days.

---

## 6. The hero number — total annual leak (one number for the top of the app)

```sql
WITH forgotten AS (
    SELECT r.list_price * 12 AS yr
    FROM vault.receipts r
    JOIN vault.usage u ON u.service = r.service
    WHERE r.billing_cycle = 'monthly'
      AND CAST(u.last_used_date AS DATE) < CAST(CURRENT_DATE AS TIMESTAMP) - INTERVAL '60 days'
)
SELECT ROUND(SUM(yr), 2) AS annual_leak_usd, COUNT(*) AS leaking_subscriptions
FROM forgotten
```

**Returns:** ~$1,187/yr across 5 forgotten subscriptions — the headline figure.

---

## 7. Spend map — every dollar by category (for the donut chart)

```sql
SELECT
    category,
    ROUND(SUM(ABS(amount)), 2) AS spent
FROM vault.transactions
WHERE amount < 0
GROUP BY category
ORDER BY spent DESC
```

---

## Optional live extension (when Google OAuth is fresh)

The same joins work against **live** sources too — swap `vault.receipts` for
`gmail.messages` (real receipts in your inbox) and add `google_calendar.events`
to put each renewal on your actual calendar. Local files keep the demo
bulletproof; the live join is the "and it scales to your real accounts" beat.
