level: patch

- CI: the failure log (D-518) failed on every run because its `failure-log` branch was never created: the first run's orphan checkout could not empty itself. It now starts from an empty orphan worktree.
