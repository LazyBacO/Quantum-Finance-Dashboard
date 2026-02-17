# Autonomy Operating Mode

## Merge/Release policy

- Required before merge: CI + E2E + AC PASS/FAIL = passing
- Auto-merge allowed only with green checks
- Daily release-readiness review enabled

## Alert policy

Send immediate alert on:
- CI red on `main`
- E2E red on `main`
- AC PASS/FAIL red
- Deployment failure
- Auth/push blocked

## Delivery style

- concise update per cycle
- include blocker + next action when blocked
