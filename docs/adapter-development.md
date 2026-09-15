# Adapter development guide

An adapter owns host detection, URL canonicalization, scan-mode policy, extraction, normalization,
result validation, and a minimum responsible polling interval. It must not know about users,
matching, notifications, queues, or Prisma.

1. Add a directory under `packages/scraper-core/src/adapters`.
2. Implement `TicketSourceAdapter` with a stable ID and explicit supported hosts.
3. Add small licensed/local HTML fixtures for every important page state.
4. Pass the shared adapter contract suite and add selector-specific regression tests.
5. Return `UNSUPPORTED_SOURCE` when confidence is insufficient; never return guessed listings.
6. Prefer HTTP extraction. Select `BROWSER` or `AUTO` only when fixture evidence requires it.
7. Populate relational normalized fields and place only adapter-specific extras in `metadata`.
8. Document request rates and terms/robots constraints before production enablement.

Canonicalization may remove tracking parameters but must preserve semantic city, date, cinema, or
movie parameters. A new adapter is registered with the adapter registry; matching and notification
code require no changes.

The DemoAdapter is the reference contract implementation. Its state fixtures demonstrate the
required no-match to availability transition without live third-party traffic.
