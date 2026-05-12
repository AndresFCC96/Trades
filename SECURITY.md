# Security Policy

## Supported versions

This project is in early development. Security fixes target the latest
commit on `main`. Older tags are not patched.

| Version              | Supported |
|----------------------|-----------|
| 0.1.x (latest `main`)| Yes       |
| < 0.1.0              | No        |

## Reporting a vulnerability

**Do not open a public issue for security vulnerabilities.**

Report them privately via GitHub's
[Private Vulnerability Reporting](https://github.com/AndresFCC96/Trades/security/advisories/new).

### What to include

- A description of the vulnerability and its impact
- Steps to reproduce (proof-of-concept if possible)
- The commit SHA or tag where you observed it
- Any suggested fix or mitigation

### What to expect

| Step | Target |
|------|--------|
| Acknowledgement                | within 72 hours       |
| Initial assessment             | within 7 days         |
| Patch (Critical / High)        | within 14 days        |
| Patch (Medium / Low)           | next release cycle    |

We follow **coordinated disclosure**. We notify the reporter when the fix
ships and credit them (with permission) in the release notes or in the
published GitHub Security Advisory.

## Out of scope

- Vulnerabilities in third-party dependencies — those are tracked by
  Dependabot (`.github/dependabot.yml`).
- Issues requiring physical access to a deployed instance.
- Denial of service via excessive resource consumption. The current API
  does not implement rate limiting; see the enterprise roadmap in
  `docs/architecture.md`.

## Security controls already in place

1. **Input validation** — 14 RV-XX rules (`src/trade_validator.py`) gate
   trades before transformation.
2. **Schema validation** — Patito enforces extracted-data structure
   (`src/trade_extractor.py`).
3. **Pseudonymization** — `trader_id` and `counterparty_id` are
   SHA-256(salt + value) hashed on every public-facing endpoint
   (`src/api/main.py`). Salt sourced from `TRADES_PSEUDO_SALT`.
4. **Append-only audit trail** — Rejections, pipeline events, API
   accesses and data changes are written to JSONL files for forensic
   review (`src/audit.py`).
5. **CI security gates** — Every push runs:
   - **ruff** with security ruleset (S, B)
   - **bandit** (Python AST SAST, SARIF uploaded to Code Scanning)
   - **semgrep** with `p/python`, `p/security-audit`, `p/owasp-top-ten`
6. **Container hardening** — Non-root user in the Docker image,
   read-only config volume, healthcheck. Multi-stage build to minimize
   runtime image size.
