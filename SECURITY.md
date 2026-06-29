# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security problems.** Report privately so a fix can ship
before details are public:

- Preferred: GitHub's **private vulnerability reporting** — repo **Security → Report a
  vulnerability** (must be enabled in repo settings).
- Or email **support@ascentspark.com** with steps to reproduce, affected version(s), and
  impact.

We aim to acknowledge within **2 business days** and to provide a remediation timeline after
triage. Please give us a reasonable window to release a fix before any public disclosure.

## Supported versions

Security fixes are provided for the latest release of each supported line:

| Version | Supported |
|---------|-----------|
| 22.x    | ✅        |
| 21.x    | ✅        |
| 20.x    | ✅        |
| < 20    | ❌        |

## Scope & trust boundary

`@ascentsparksoftware/angular-calendar` is a library; runtime security ultimately depends on
how the consuming app uses it.

This library renders **caller-supplied text as text nodes only** and never injects caller
content as HTML. **Consumer-supplied templates** (event cards, cell templates, etc.) run in
the consumer's own trust context — any HTML or bindings you place inside a template are your
responsibility to keep safe. Do not pass untrusted HTML into your own templates.

## What is not a vulnerability

- Issues requiring a malicious local environment or a compromised build toolchain.
- Advisories in **devDependencies / build tooling** that never ship to consumers (this package
  declares its framework dependencies as `peerDependencies`, resolved by the consumer's tree).
