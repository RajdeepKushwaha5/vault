"""Safe cancellation drafts — Vault never sends or cancels; it only drafts."""


def draft_cancellation(service: str, monthly: float | None = None, cancel_url: str | None = None) -> dict:
    saving = f" That saves about ${round((monthly or 0) * 12, 2)}/year." if monthly else ""
    body = (
        f"Subject: Cancel my {service} subscription\n\n"
        f"Hi {service} Support,\n\n"
        f"I'd like to cancel my {service} subscription effective at the end of the "
        f"current billing period. I'm no longer using the service and want to stop "
        f"future charges. Please confirm the cancellation and the date my access ends.\n\n"
        f"Thank you,\n[Your name]"
    )
    return {
        "service": service,
        "cancel_url": cancel_url,
        "draft": body,
        "note": f"Draft only — Vault never sends or cancels anything.{saving}",
    }
