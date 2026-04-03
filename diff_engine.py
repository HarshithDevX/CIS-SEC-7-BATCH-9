import difflib


def compute_diff(old_content: str, new_content: str) -> dict:
    """
    Compare two text snapshots and return a structured diff result.
    """
    old_lines = old_content.splitlines()
    new_lines = new_content.splitlines()

    diff = list(difflib.unified_diff(
        old_lines, new_lines,
        lineterm="",
        n=3  # context lines
    ))

    added   = [l[1:] for l in diff if l.startswith("+") and not l.startswith("+++")]
    removed = [l[1:] for l in diff if l.startswith("-") and not l.startswith("---")]

    total_lines = max(len(old_lines), 1)
    change_percent = round((len(added) + len(removed)) / total_lines * 100, 2)

    # Build side-by-side blocks for the frontend
    matcher = difflib.SequenceMatcher(None, old_lines, new_lines)
    blocks = []
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        blocks.append({
            "type": tag,          # replace | insert | delete
            "old": old_lines[i1:i2],
            "new": new_lines[j1:j2],
        })

    return {
        "diff_lines": diff,
        "added": added,
        "removed": removed,
        "change_percent": change_percent,
        "lines_added": len(added),
        "lines_removed": len(removed),
        "blocks": blocks,
    }


def get_inline_diff(old_text: str, new_text: str) -> list[dict]:
    """
    Return a list of {type, text} tokens for character-level inline diff.
    Useful for rendering highlighted changes word-by-word.
    """
    old_words = old_text.split()
    new_words = new_text.split()

    matcher = difflib.SequenceMatcher(None, old_words, new_words)
    tokens = []

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            tokens.append({"type": "equal", "text": " ".join(old_words[i1:i2])})
        elif tag == "insert":
            tokens.append({"type": "insert", "text": " ".join(new_words[j1:j2])})
        elif tag == "delete":
            tokens.append({"type": "delete", "text": " ".join(old_words[i1:i2])})
        elif tag == "replace":
            tokens.append({"type": "delete", "text": " ".join(old_words[i1:i2])})
            tokens.append({"type": "insert", "text": " ".join(new_words[j1:j2])})

    return tokens
