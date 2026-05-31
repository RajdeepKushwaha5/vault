"""Assemble the Vault leaks payload: run the detectors, score the hero number, tag leaks."""

from concurrent.futures import ThreadPoolExecutor

import queries as q
from coral_runner import coral_query


def _num(v, default=0.0):
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def build_leaks() -> dict:
    """Run all leak detectors in parallel and assemble one ranked payload + hero number."""
    jobs = {
        "forgotten":  ("Forgotten subscriptions (bank x receipts x usage)", q.forgotten_subscriptions(), ["vault"]),
        "price_hike": ("Silent price hikes (transactions x receipts)",       q.price_hikes(),            ["vault"]),
        "duplicate":  ("Duplicate categories (receipts)",                     q.duplicate_categories(),   ["vault"]),
        "trial":      ("Free trials converting soon (receipts x transactions)", q.trials_converting(),   ["vault"]),
        "annual":     ("Annual renewals (receipts)",                          q.annual_renewals(),        ["vault"]),
    }

    results: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            key: pool.submit(coral_query, label, sql, srcs)
            for key, (label, sql, srcs) in jobs.items()
        }
        for key, fut in futures.items():
            results[key] = fut.result()

    forgotten = results["forgotten"]["rows"]
    price_hike = results["price_hike"]["rows"]
    duplicate = results["duplicate"]["rows"]
    trial = results["trial"]["rows"]
    annual = results["annual"]["rows"]
    proofs = [results[k]["proof"] for k in ("forgotten", "price_hike", "duplicate", "trial", "annual")]
    # Per-leak-type proof so each card can show the exact query that found it.
    # "review" (cloud creep) comes from the same price-hike query.
    proofs_by_type = {
        "forgotten": results["forgotten"]["proof"],
        "price_hike": results["price_hike"]["proof"],
        "review": results["price_hike"]["proof"],
        "duplicate": results["duplicate"]["proof"],
        "trial": results["trial"]["proof"],
        "annual": results["annual"]["proof"],
    }

    # Build a single ranked leaks feed with a uniform shape.
    leaks: list[dict] = []
    for r in forgotten:
        leaks.append({
            "type": "forgotten", "severity": "high",
            "title": r.get("service"), "category": r.get("category"),
            "monthly": _num(r.get("monthly")), "annual_impact": _num(r.get("annual_waste")),
            "detail": f"Last used {r.get('last_used_date')} · {r.get('sessions_last_30d', 0)} sessions in 30 days",
            "cancel_url": r.get("cancel_url"),
        })
    for r in price_hike:
        inc = _num(r.get("yearly_increase"))
        if inc <= 0:
            continue
        title = r.get("service") or r.get("merchant") or ""
        # A large jump or a cloud bill is "creep to review", not a clean leak —
        # growing usage can be legitimate, so we never count it in the headline.
        is_creep = _num(r.get("monthly_increase")) > 20 or "Web Services" in title or "AWS" in str(r.get("merchant", ""))
        leaks.append({
            "type": "review" if is_creep else "price_hike",
            "severity": "low" if is_creep else "medium",
            "title": title,
            "category": "cloud creep — review" if is_creep else "price increase",
            "monthly": _num(r.get("monthly_increase")), "annual_impact": inc,
            "detail": (f"Bill grew from ${r.get('was_paying')}/mo to ${r.get('now_paying')}/mo — worth a review"
                       if is_creep else f"Was ${r.get('was_paying')}/mo, now ${r.get('now_paying')}/mo"),
            "cancel_url": r.get("cancel_url"),
        })
    for r in duplicate:
        leaks.append({
            "type": "duplicate", "severity": "medium",
            "title": f"{r.get('services')} {r.get('category')} subscriptions",
            "category": r.get("category"),
            "monthly": _num(r.get("cheaper_line")), "annual_impact": _num(r.get("annual_saving_if_drop_one")),
            "detail": f"Paying ${r.get('monthly_total')}/mo total for {r.get('services')} {r.get('category')} services",
            "cancel_url": None,
        })
    for r in trial:
        leaks.append({
            "type": "trial", "severity": "high",
            "title": r.get("service"), "category": "trial converting",
            "monthly": _num(r.get("converts_to")), "annual_impact": _num(r.get("annual_if_kept")),
            "detail": f"Signed up {r.get('signup_date')} · converts to ${r.get('converts_to')}/mo soon",
            "cancel_url": r.get("cancel_url"),
        })
    for r in annual:
        leaks.append({
            "type": "annual", "severity": "low",
            "title": r.get("service"), "category": "annual renewal",
            "monthly": round(_num(r.get("annual_charge")) / 12, 2), "annual_impact": _num(r.get("annual_charge")),
            "detail": f"${r.get('annual_charge')} charged yearly — review before it renews",
            "cancel_url": r.get("cancel_url"),
        })

    leaks.sort(key=lambda x: x["annual_impact"], reverse=True)

    # HEADLINE = clearly-wasted money only: subscriptions charged monthly but
    # unused for 60+ days. Each service counted exactly once (the forgotten query
    # returns one row per service), so there is no double-counting. Duplicates and
    # price-creep are shown as separate findings/context, never added to the
    # headline (the services in a duplicate pair are already the forgotten ones).
    hard_leak = sum(_num(r.get("annual_waste")) for r in forgotten)

    # Context buckets, shown separately so each dollar is counted once.
    to_review = sum(_num(r.get("yearly_increase")) for r in price_hike if _num(r.get("yearly_increase")) > 0)
    about_to_start = sum(_num(r.get("annual_if_kept")) for r in trial)

    summary = {
        "annual_leak_usd": round(hard_leak, 2),         # forgotten subscriptions only — bulletproof
        "to_review_usd": round(to_review, 2),           # price creep (incl. cloud) — review, not waste
        "about_to_start_usd": round(about_to_start, 2), # trials about to convert
        "forgotten_count": len(forgotten),
        "total_leaks": len(leaks),
        "monthly_bleed_usd": round(hard_leak / 12, 2),
        "sources_joined": ["vault.transactions", "vault.receipts", "vault.usage"],
    }

    return {"summary": summary, "leaks": leaks, "proofs": proofs, "proofs_by_type": proofs_by_type}
