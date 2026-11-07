import os

collect_ignore_glob = ["fixtures/*"]

# Tests must never wake real Slack agents or wait on live Switch replies.
os.environ["SWITCH_AGENT_REVIEW_ENABLED"] = "false"
