from app.switch.review import build_review_prompt, new_replies


def test_review_prompt_mentions_handles_and_digest():
    prompt = build_review_prompt(
        "scan_1",
        "abc123",
        {"total_dependencies": 4, "critical_risk_count": 1, "high_risk_count": 2},
        ["exit-verify", "exit-analyst"],
    )

    assert "@exit-verify" in prompt
    assert "@exit-analyst" in prompt
    assert "abc123" in prompt
    assert "1 critical" in prompt


def test_new_replies_skips_old_staging_and_human_messages():
    messages = [
        {"messageId": "old", "seq": 5, "body": "PASS before request", "sender": {"kind": "agent", "name": "exit-verify"}},
        {"messageId": "staging", "seq": 6, "body": "Starting a session to handle this", "sender": {"kind": "agent", "name": "exit-verify"}},
        {"messageId": "verdict", "seq": 7, "body": "PASS - digest matches", "sender": {"kind": "agent", "name": "exit-verify"}},
        {"messageId": "other-agent", "seq": 8, "body": "PASS", "sender": {"kind": "agent", "name": "exit-analyst"}},
        {"messageId": "human", "seq": 9, "body": "PASS", "sender": {"kind": "human", "name": "Admin"}},
    ]

    replies = new_replies(messages, ["exit-verify"], 5)

    assert [reply["messageId"] for reply in replies] == ["verdict"]
