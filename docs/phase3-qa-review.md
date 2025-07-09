PART A – Playbook Review
========================

Coverage / Completeness
-----------------------
✅  All security items from the QA log (bcrypt, CSP, HSTS, proxy trust, Zod schemas, rate limiting, token revocation, secret logging) are represented.
✅  Each section lists (1) background, (2) acceptance criteria, (3) reproducible tests, and (4) troubleshooting notes.
✅  Manual + automated checks are provided, including edge-cases (e.g. cleanup on SIGTERM) and matrix tests for `TRUST_PROXY_HEADERS`.

Gaps / Minor Tweaks
1. Add a check for **HSTS includeSubDomains**:
   `curl -I https://localhost:3000 | grep -i strict-transport-security`
2. Spell out the **LRU eviction policy** explicitly in the Rate Limiter section.
3. Mention that the in-memory revocation store is **per-process** also inside §3 so reviewers don’t miss it.
4. Replace Storybook reference in the pre-commit suggestion with `eslint-plugin-security` only.
5. Add a CI guard (eslint rule or test) to fail if inline Zod schemas are found inside `pages/api`.

Alignment / Style
-----------------
• Tone and formatting match internal runbooks.
• Steps clearly ordered (pre-checks, functional tests, sign-off).

Quality
-------
• Script examples are runnable; flags and env vars stated.
• Spelling/grammar pass.

Verdict
-------
Playbook is 95 % production-ready. Apply the 5 tweaks above and publish.


PART B – WebSocket Lifecycle Test Failures
=========================================

Quick Recap of Issues
--------------------
1. `MockWebSocket` lacks static constants (`CONNECTING`, `OPEN`, `CLOSING`, `CLOSED`) causing status checks to pass incorrectly.
2. Retry logic flaws:
   • `retryCount` resets too early; can enter infinite loop.
   • Reaches `maxRetries` without throwing → tests hang.
3. Tests close the socket while `open()` promise is unresolved.
4. After constants fix, two specs still time-out due to #2 and #3.

Recommended Fixes
-----------------
A. **Add static constants to the mock**
```ts
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN       = 1;
  static CLOSING    = 2;
  static CLOSED     = 3;
  // …existing impl…
}
```

B. **Refactor retry logic**
```ts
async connect() {
  while (this.retryCount < this.maxRetries) {
    try {
      await this._establish();
      this.retryCount = 0;             // reset only after success
      return;
    } catch (e) {
      this.retryCount += 1;
      if (this.retryCount >= this.maxRetries) throw new Error('Max retries exceeded');
      await wait(this.backoff(this.retryCount));
    }
  }
}
```

C. **Improve tests**
1. Use fake timers to avoid real back-off delays.
2. When testing close-during-connect, emit `close` immediately then flush timers.
3. Add `afterEach` guard to ensure no dangling connections.

Debug Checklist for Developer
-----------------------------
• Ensure `global.WebSocket` is overridden with `MockWebSocket` in test setup.
• Keep retry/backoff unit tests isolated from integration suites.
• Use `NODE_DEBUG=mcp-socket` (or similar) to trace retry loops.
• If timeouts persist, increase Jest timeout briefly; persisting leaks indicate unawaited handles.

Deliverables
------------
1. Patch `MockWebSocket` constants.
2. Refactor retry logic with proper rejection on max retries.
3. Update tests with fake timers and cleanup guards.
4. Run `pnpm test` – all WebSocket lifecycle specs should pass.
5. Push PR tagged `#security-phase3 qa-ws-fix`, reference QA ticket.

