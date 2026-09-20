# PhishLens pilot status

## Current status

The application includes a consent-first local pilot mode. One explicitly consented local dogfood session has now been completed and exported; this is an n=1 descriptive result, not a representative human study. A participant must explicitly opt in inside the app before any timing or outcome event is recorded.

The pilot records only:

- time from session start to a safety outcome;
- whether the participant chooses independent verification;
- false-alarm or missed-warning feedback;
- an anonymous exported summary.

It does not retain names, contact details, original messages, screenshots, QR contents, or raw message text. The exporter includes `rawMessagesStored: false` and labels a one-session result as local dogfood rather than representative research.

## Measures ready to report

The local summary reports participant count, outcome count, independent-verification rate, false-alarm feedback count, and average time to outcome. These measures are descriptive only until additional consented sessions are collected and reviewed.

## Observed local dogfood result

The first consented session was completed with synthetic content on 2026-09-20. The exported summary reported:

- participant count: `1`;
- recorded outcomes: `2`;
- independent-verification outcomes: `1`;
- false-alarm or missed-warning feedback outcomes: `1`;
- independent-verification share of recorded outcomes: `0.5`;
- average time to an outcome: `94,688 ms` (about 94.7 seconds);
- original messages stored: `false`.

The two outcome categories are not mutually exclusive in this prototype, so these figures describe one local interaction and must not be generalized to a population or treated as product accuracy. The sanitized export is preserved in [`PILOT_RESULT_2026-09-20.json`](PILOT_RESULT_2026-09-20.json).

## What is still required for a genuine user-pilot claim

Run additional in-app flows with explicitly consenting student, caregiver, or school-staff participants using synthetic or voluntarily supplied content. Export the anonymous summaries, review the limitations, and report the observed sample size and measures without generalizing beyond it.
