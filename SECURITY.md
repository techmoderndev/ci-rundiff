# Security policy

## Supported versions

The project is pre-release. Security fixes apply to the latest commit and most
recent published version only.

## Reporting a vulnerability

Do not open a public issue containing a vulnerability, token, secret, or
private CI log. Use GitHub's private vulnerability reporting feature for this
repository when it is available.

If private reporting is not enabled, do not share the sensitive details. Open
a minimal public issue asking the maintainer to enable a private channel.

## Sensitive logs

CI logs may contain secrets that platform masking missed. CI RunDiff does not
upload logs, but its output can repeat evidence lines. Review and redact output
before posting it publicly.
