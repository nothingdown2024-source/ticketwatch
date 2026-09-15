# Domain model

`Source` is a canonical public page and deduplication boundary. `SourceMonitor` contains shared
scheduling and health state. `WatchRule` expresses one user's matching intent and owns a
`WatchState`. A successful `Scan` owns a `ScanSnapshot` and relational `ExtractedListing`s.

```mermaid
erDiagram
  User ||--|| UserProfile : has
  User ||--o{ WatchRule : creates
  User ||--o{ NotificationPreference : configures
  Source ||--|| SourceMonitor : scheduled_by
  Source ||--o{ Scan : scanned_as
  Source ||--o{ WatchRule : watched_by
  Scan ||--o| ScanSnapshot : records
  Scan ||--o{ ExtractedListing : extracts
  WatchRule ||--o{ WatchAlias : includes
  WatchRule ||--|| WatchState : has
  WatchRule ||--o{ AvailabilityEvent : emits
  AvailabilityEvent ||--o{ Notification : requests
  Notification ||--o{ NotificationDelivery : tracks
```

Important invariants:

1. Canonical source fingerprints are unique.
2. One active scan per source is enforced by lock plus deterministic job/run keys.
3. Failed scans do not change availability to unavailable.
4. `SEARCHING -> AVAILABLE` creates one occurrence and one availability-open event.
5. Notification idempotency keys are unique even when jobs retry.
6. Every user command applies an ownership policy; IDs alone never authorize access.

Raw HTML is not a primary record. Normalized listings and a deterministic content fingerprint
are retained; bounded diagnostic snapshots have explicit expiry timestamps.
