# TLN Cybersecurity Challenge pre-submission checklist

## Product evidence — complete locally

- [x] Explainable social-engineering analysis with evidence tied to each factor.
- [x] Sender/claimed-brand and link-destination inspection without opening links.
- [x] Evidence coverage replaces a misleading confidence or accuracy claim.
- [x] Audience-aware safe next steps, copy-safe response, and a redacted local report.
- [x] Optional constrained local AI second opinion with an explicit fallback.
- [x] Screenshot/QR inspection path and pasted SPF/DKIM/DMARC context with caveats.
- [x] Deterministic-versus-AI comparison, multilingual/adversarial regression coverage, and accessibility controls.
- [x] Consent-first redacted school handoff, ethical pilot mode, and 90-second judge flow.
- [x] Run one explicitly consented local dogfood pilot session and report its descriptive measures in `PILOT_REPORT.md`; do not substitute synthetic regression metrics.
- [x] Visible 36-case deterministic safety dataset with precision/recall/false-positive reporting.
- [x] Under-five-minute demo script and Devpost-ready narrative.
- [x] Local checks: `npm run check`, `npm test`, and `npm run evaluate`.

## Required participant actions — not claimed until verified

- [ ] Attend at least one required TLN workshop. The organizer update says every participant must attend one; retain attendance confirmation if one is provided.
- [ ] If pursuing the 10 bonus points: subscribe to Tech Literacy Network on YouTube, follow TLN on Instagram, and DM the registered full name to TLN on Instagram. Do this only from the participant's own authenticated accounts and verify the exact name before sending.

## Public submission assets — stage, then verify

- [ ] Record the updated demo using `DEMO_SCRIPT.md`; keep it under five minutes.
- [ ] Publish or create an accessible video URL.
- [ ] Create a public source-code repository, then replace the placeholder in `DEVPOST_SUBMISSION.md`.
- [ ] Optionally deploy the static browser build and add a live URL.
- [ ] Complete every Devpost submission field with the content in `DEVPOST_SUBMISSION.md`.
- [ ] Confirm the final Devpost submission only after reviewing every field and link.

## Final integrity check

- [ ] Ensure the description says **curated behavior checks**, not a real-world accuracy result.
- [ ] Ensure AI/tool disclosure is included.
- [ ] Ensure no real personal data, credentials, live malicious URLs, or secret tokens appear in the video, repository, or Devpost text.
- [ ] Verify that the published submission page shows the intended project title, description, video, and repository after submission.
