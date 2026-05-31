"""
Vault — Coral SQL leak-detection queries.

Three LOCAL JSONL files joined by Coral:
  vault.transactions (bank)  x  vault.receipts (inbox)  x  vault.usage (app activity)

Every query is read-only and runs entirely on the local machine.
All proven live — see queries.md for sample outputs.
"""


def forgotten_subscriptions() -> str:
    """Charged monthly, not opened in 60+ days. The killer 3-source join."""
    return """
SELECT
    r.service,
    r.category,
    r.list_price                       AS monthly,
    ROUND(r.list_price * 12, 2)        AS annual_waste,
    u.last_used_date,
    u.sessions_last_30d,
    r.cancel_url,
    COUNT(t.txn_id)                    AS charges_last_4mo
FROM vault.receipts r
JOIN vault.usage u        ON u.service  = r.service
JOIN vault.transactions t ON t.merchant = r.merchant AND t.category = 'subscription'
WHERE r.billing_cycle = 'monthly'
  AND CAST(u.last_used_date AS DATE) < CAST(CURRENT_DATE AS TIMESTAMP) - INTERVAL '60 days'
GROUP BY r.service, r.category, r.list_price, u.last_used_date, u.sessions_last_30d, r.cancel_url
ORDER BY annual_waste DESC
""".strip()


def price_hikes() -> str:
    """Latest charge crept above the first charge — a silent price increase."""
    return """
WITH latest AS (
    SELECT merchant, MAX(date) AS last_date
    FROM vault.transactions WHERE category = 'subscription' GROUP BY merchant
),
first_charge AS (
    SELECT merchant, MIN(date) AS first_date
    FROM vault.transactions WHERE category = 'subscription' GROUP BY merchant
)
SELECT
    t_now.merchant,
    r.service,
    ABS(t_old.amount)                                       AS was_paying,
    ABS(t_now.amount)                                       AS now_paying,
    ROUND(ABS(t_now.amount) - ABS(t_old.amount), 2)        AS monthly_increase,
    ROUND((ABS(t_now.amount) - ABS(t_old.amount)) * 12, 2) AS yearly_increase,
    r.cancel_url
FROM latest l
JOIN first_charge f       ON f.merchant = l.merchant
JOIN vault.transactions t_now ON t_now.merchant = l.merchant AND t_now.date = l.last_date
JOIN vault.transactions t_old ON t_old.merchant = f.merchant AND t_old.date = f.first_date
LEFT JOIN vault.receipts r ON r.merchant = t_now.merchant
WHERE ABS(t_now.amount) > ABS(t_old.amount)
ORDER BY yearly_increase DESC
""".strip()


def duplicate_categories() -> str:
    """Two or more subscriptions in the same category — pick one, save the other."""
    return """
SELECT
    category,
    COUNT(*)                          AS services,
    SUM(list_price)                   AS monthly_total,
    ROUND(SUM(list_price) * 12, 2)    AS annual_total,
    MIN(list_price)                   AS cheaper_line,
    ROUND(MIN(list_price) * 12, 2)    AS annual_saving_if_drop_one
FROM vault.receipts
WHERE billing_cycle = 'monthly'
GROUP BY category
HAVING COUNT(*) > 1
ORDER BY monthly_total DESC
""".strip()


def trials_converting() -> str:
    """Recent sign-up, a $0 trial charge landed, real money hits in days."""
    return """
SELECT
    r.service,
    r.signup_date,
    r.list_price                       AS converts_to,
    ROUND(r.list_price * 12, 2)        AS annual_if_kept,
    r.cancel_url
FROM vault.receipts r
JOIN vault.transactions t ON t.merchant = r.merchant
WHERE t.amount = 0.0
  AND CAST(r.signup_date AS DATE) >= CAST(CURRENT_DATE AS TIMESTAMP) - INTERVAL '30 days'
ORDER BY r.signup_date DESC
""".strip()


def annual_renewals() -> str:
    """Annual charges — a yearly bill that can sneak up on you."""
    return """
SELECT
    service,
    list_price                         AS annual_charge,
    signup_date,
    cancel_url
FROM vault.receipts
WHERE billing_cycle = 'annual'
ORDER BY list_price DESC
""".strip()


def spend_map() -> str:
    """Every dollar of spend by category — for the donut chart."""
    return """
SELECT
    category,
    ROUND(SUM(ABS(amount)), 2) AS spent,
    COUNT(*)                   AS txns
FROM vault.transactions
WHERE amount < 0
GROUP BY category
ORDER BY spent DESC
""".strip()


def active_subscriptions() -> str:
    """All monthly subscriptions with usage — for the full ledger view."""
    return """
SELECT
    r.service,
    r.category,
    r.list_price          AS monthly,
    u.last_used_date,
    u.sessions_last_30d
FROM vault.receipts r
LEFT JOIN vault.usage u ON u.service = r.service
WHERE r.billing_cycle = 'monthly'
ORDER BY r.list_price DESC
""".strip()
