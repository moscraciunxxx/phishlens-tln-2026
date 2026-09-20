# PhishLens demo script — 2 minutes 50 seconds

This script is intentionally below Devpost's five-minute limit. Record at 1440×900 or higher, keep the browser zoom at 100%, and use the seeded **School account** scenario for the main walkthrough.

## 0:00–0:12 — The problem

**On screen:** PhishLens hero and the message input.

**Narration:** “Phishing works when a message pressures someone to act before they can check it. PhishLens is a calm layer between a suspicious message and a risky click.”

## 0:12–0:28 — Set the recipient context

**On screen:** Choose **Student**, **Email**, and the supplied School account sample.

**Narration:** “The recipient can be a student, caregiver, school staff member, or general user. That context changes the safest next step—not just the wording of the warning.”

## 0:28–0:53 — Analyze without opening the link

**On screen:** Click **Analyze safely**. Pause on the severity card, observed-factor count, evidence cards, and parsed-link panel.

**Narration:** “PhishLens never opens the message link. It highlights the pressure behind the message: urgency, a request for a password or code, impersonation, secrecy, and a destination that does not match the claimed organization.”

## 0:53–1:15 — Explain the result, not a fake certainty

**On screen:** Scroll to **Message anatomy** and the evidence-coverage explanation.

**Narration:** “There is no pretend accuracy percentage here. The observed-factor count is exactly that—visible evidence to inspect. The product says to verify independently; it does not claim it can prove fraud.”

## 1:15–1:34 — Turn insight into action

**On screen:** Safe next steps, **Copy safe response**, and **Download safe report**.

**Narration:** “The next move is practical: do not share a password, use the organization’s official route, ask a trusted adult or school contact, and keep a redacted local report if it needs to be reported. Nothing is sent automatically.”

## 1:34–1:52 — Show semantic defense safely

**On screen:** Click **Run local AI second opinion** and reveal the completed card.

**Narration:** “For a second perspective, PhishLens can call a local Ollama model. It is constrained to defensive triage and clearly says when the local model is not available. The deterministic evidence engine always remains the foundation.”

## 1:52–2:15 — Show the hard cases and judge flow

**On screen:** Expand **Inspect more evidence safely** to show the email-header and screenshot/QR paths, then click **Run 36-case safety check**. Hold on the `36/36 cases passed` result and its precision/recall/false-positive metrics.

**Narration:** “We made the hard cases inspectable too: encoded destinations, misspellings, multilingual bait, QR and image text, and email authentication context. The 36-case behavior dataset reports transparent metrics for this synthetic test set, not real-world accuracy.”

## 2:15–2:35 — Consent-first workflow

**On screen:** Show the redacted handoff preview and the consent checkbox; show the accessibility controls and pilot card briefly.

**Narration:** “A student can export a redacted explanation to a trusted caregiver, teacher, or school IT contact only after consent. The pilot mode measures decision time and verification choices without storing the original message.”

## 2:35–2:50 — Close

**On screen:** Product promise: Explainable. Safe by design. Actionable.

**Narration:** “Run 90-second judge mode to replay the whole proof: evidence, safe report, and behavior metrics. PhishLens helps people slow down, understand the pressure, and take a safer next step—before a click becomes a compromise.”

## Recording checklist

- Use only synthetic or redacted sample messages.
- Do not demonstrate opening a suspicious URL or entering credentials.
- If the local model is not installed, show the explicit fallback rather than editing around it.
- End with the 36-case metrics and product promise.
- Upload the finished video as **unlisted** or public and add its URL to `DEVPOST_SUBMISSION.md`.
