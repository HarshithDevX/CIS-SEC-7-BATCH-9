import os
import anthropic


def classify_change(url: str, diff_result: dict) -> tuple[str, str]:
    """
    Use Claude to classify a diff as MAJOR or MINOR.
    Returns (change_type, summary_text).
    Falls back to rule-based classification if API key is missing.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY", "")

    added_sample   = "\n".join(diff_result["added"][:15])
    removed_sample = "\n".join(diff_result["removed"][:15])

    # ── Rule-based fallback ──────────────────────────────────────────
    if not api_key:
        pct = diff_result["change_percent"]
        if pct >= 20:
            return "major", f"Large change detected ({pct}% of content changed)."
        elif pct >= 3:
            return "minor", f"Small change detected ({pct}% of content changed)."
        else:
            return "minor", f"Trivial change ({pct}%)."

    # ── Claude classification ────────────────────────────────────────
    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are a website-change classifier for a competitive intelligence tool.

URL monitored: {url}
Change statistics:
  - Content changed: {diff_result['change_percent']}%
  - Lines added: {diff_result['lines_added']}
  - Lines removed: {diff_result['lines_removed']}

Sample of ADDED content:
{added_sample or '(none)'}

Sample of REMOVED content:
{removed_sample or '(none)'}

Classify this change as MAJOR or MINOR using these rules:
MAJOR → pricing changes, product launches, policy updates, contact changes, 
        promotional banners added/removed, >15% content shift, structural nav changes.
MINOR → typo/grammar fixes, date updates, minor wording tweaks, small image swaps,
        whitespace or formatting only, <5% content shift.

Respond with EXACTLY this JSON (no markdown fences):
{{"type": "MAJOR" or "MINOR", "reason": "one clear sentence explaining why"}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )
        import json
        text = message.content[0].text.strip()
        data = json.loads(text)
        return data["type"].lower(), data["reason"]
    except Exception as e:
        # Fallback
        pct = diff_result["change_percent"]
        label = "major" if pct >= 20 else "minor"
        return label, f"Auto-classified ({pct}% changed). AI error: {e}"
