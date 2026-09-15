# Security model

User-controlled source URLs are hostile input. All HTTP and browser navigation passes through
`SafeUrlService`; adapters never directly fetch an unvalidated URL.

The policy permits only HTTP/S, constrained ports, configured public hosts, public DNS answers,
and a small redirect budget. It rejects credentials in URLs, localhost names, private, loopback,
link-local, multicast, unspecified, reserved, and cloud metadata addresses. Redirect targets are
resolved and validated again. Browser request interception applies the same policy to subrequests
and blocks downloads and unnecessary resource types.

Production generic scanning is disabled by default. Enabling it is an operational decision, not
a user control. Response size, connect, total, and navigation timeouts are bounded. Per-IP/user
preview limits and outbound host concurrency prevent abuse.

Passwords use Argon2id. Sessions use signed, secure, HTTP-only, same-site cookies in production.
Every user resource is checked by service-layer ownership policy; admin operations require the
`ADMIN` role. API errors are sanitized. Logs redact secrets, authorization headers, passwords,
tokens, and phone numbers.

WhatsApp sends only after explicit opt-in and phone verification. Webhook verification and event
deduplication are required before delivery state changes. Credentials only come from environment
or the deployment secret manager.

The product does not bypass CAPTCHAs, authentication, access controls, rate limits, or purchasing
flows. Blocked or unsupported sources are represented honestly.
