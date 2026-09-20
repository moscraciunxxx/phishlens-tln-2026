# PhishLens pilot status

## Current status

The application includes a consent-first local pilot mode, but no human-participant result is claimed in this repository. A participant must explicitly opt in inside the app before any timing or outcome event is recorded.

The pilot records only:

- time from session start to a safety outcome;
- whether the participant chooses independent verification;
- false-alarm or missed-warning feedback;
- an anonymous exported summary.

It does not retain names, contact details, original messages, screenshots, QR contents, or raw message text. The exporter includes `rawMessagesStored: false` and labels a one-session result as local dogfood rather than representative research.

## Measures ready to report

The local summary reports participant count, outcome count, independent-verification rate, false-alarm feedback count, and average time to outcome. These measures are descriptive only until additional consented sessions are collected and reviewed.

## What is still required for a genuine user-pilot claim

Run the in-app flow with explicitly consenting student, caregiver, or school-staff participants using synthetic or voluntarily supplied content. Export the anonymous summaries, review the limitations, and report the observed sample size and measures without generalizing beyond it.
