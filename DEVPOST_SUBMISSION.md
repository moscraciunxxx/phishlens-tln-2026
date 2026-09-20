# Devpost submission draft

Use this as the source copy for the TLN Cybersecurity Challenge submission. Replace the bracketed links only after their targets are live, and preserve the AI disclosure.

## Project name

**PhishLens — Explain first. Click later.**

## One-line pitch

An explainable, privacy-conscious scam triage tool that helps people inspect the pressure behind a suspicious message without opening its links.

## Description

### Inspiration

Scams do not always look technically sophisticated. Many work because a message creates urgency, impersonates a trusted organization, asks for a code or payment, and isolates the recipient from the people who could help them verify it. Students and families especially need a calm way to pause before a click becomes an account compromise or financial loss.

### What it does

PhishLens turns a pasted email, text, or chat message into an explainable safety check. It identifies observable social-engineering signals—urgency pressure, credential requests, impersonation cues, payment/reward bait, secrecy requests, sender/brand mismatches, and suspicious destination patterns—and shows the exact evidence that triggered each finding.

The product does not open pasted links. It parses a URL locally and says what needs attention, such as a shortener, numeric host, look-alike encoding, high-risk domain ending, sender/destination mismatch, or claimed-brand mismatch. It then gives audience-aware next steps for students, parents/caregivers, school staff, and general users, as well as a redacted local report and a safe reply. Nothing is sent automatically.

PhishLens also makes harder cases inspectable. A user can preview a suspicious screenshot locally, decode a QR value when the browser supports local barcode detection, or paste OCR text; the decoded destination is analyzed without being opened. Email users can paste SPF, DKIM, and DMARC results, including a visible caveat that these are reported headers rather than independent verification. The URL parser also surfaces unusual ports, encoded/deceptive destinations, IDN/punycode look-alikes, shorteners, and sender/domain mismatch.

An optional local Ollama review adds a constrained second opinion for semantic patterns that simple rules may not capture. The interface compares the deterministic signal set with the AI signal set so agreement and disagreement are visible. If the local model is unavailable, PhishLens explicitly says so and retains the deterministic evidence result—no silent fallback to an unverified AI claim.

The product includes a guided 90-second judge mode, a consent-first redacted handoff for caregivers/teachers/school IT, accessibility controls for larger text, contrast, reduced motion, and plain-language reading, and a local ethical pilot mode. The pilot mode records anonymous timing and outcome choices only in memory and exports a summary without the original message. Its local dogfood output is labelled as n=1 and is not presented as a representative user study.

### How we built it

The prototype uses vanilla HTML, CSS, JavaScript modules, and a small Node.js server. The core analysis engine runs in the browser and is shared with the server-side demo endpoint. The optional AI review connects only to a local Ollama endpoint; it treats every pasted message as untrusted content, requests a compact JSON triage response, blocks scam-generation tasks in its prompt, and never exposes chain-of-thought.

We added a 36-case deterministic dataset: the original 24 curated cases plus adversarial checks for polite rewrites, misspellings, Unicode tricks, multilingual scams, voice-clone bait, image-text deception, unusual ports, QR-like destinations, and pasted email authentication results. The user can run that check visibly in the interface and see accuracy, precision, recall, and false-positive rate. It is clearly presented as a synthetic/adversarial behavior check, not as a claim of real-world model accuracy.

### Challenges we ran into

The main challenge was avoiding the usual “black-box confidence score” trap. A polished percentage can make users over-trust a system that has not been measured in their environment. We replaced it with a transparent observed-factor count, explanations tied to literal evidence, clear caveats, and an independent-verification workflow.

We also needed the AI layer to add value without becoming a privacy leak or a mechanism for unsafe content. That is why it is optional, local-first, narrow in scope, and visibly separated from the deterministic safety engine.

### Accomplishments that we're proud of

- A judge can follow a complete safe workflow in under two minutes.
- Every risk finding is evidence-linked instead of hidden behind a score.
- PhishLens handles sender/brand and link-destination inconsistencies without opening a link, including encoded destinations and unusual ports.
- It offers concrete next steps tailored to the person receiving the message.
- The UI itself exposes reproducible behavior metrics and a visible deterministic-versus-AI comparison.
- Screenshot/QR intake, email-header context, accessibility controls, and consent-first handoff make the safety flow useful beyond pasted plain text.
- The tool is useful even without an AI model or an external service.

### What we learned

Cybersecurity UX is not only about detecting threats; it is about helping someone make a safer decision under pressure. Explanations, uncertainty labels, and a trustworthy verification route are product features, not afterthoughts.

### What's next for PhishLens

The next step is to run additional consented sessions with students, caregivers, and school staff using the built-in pilot protocol, then report participant-level results only after ethical review and sufficient sample size. The prototype already exports the measures needed—time to first decision, independent-verification choice, evidence understanding, and false-alarm feedback—without retaining original messages. We would keep the current safety boundary: analyze locally whenever possible, never follow untrusted links, and do not treat a model output as proof.

## Built with

- JavaScript / Node.js
- HTML and CSS
- Local browser-side analysis modules
- Ollama (optional, local semantic review)
- OpenAI Codex (development assistance)

## Testing and reviewer instructions

1. Run `npm run check` and `npm test`.
2. Start the application with `npm run dev` and open `http://127.0.0.1:4173`.
3. Load **School account**, click **Analyze safely**, and inspect the pressure points, pasted header context, and locally parsed link.
4. Click **Run 36-case safety check** to see the deterministic dataset metrics, or use **Run 90-second judge mode** for the guided proof flow.
5. If Ollama is installed locally, click **Run local AI second opinion** and inspect the comparison panel. Otherwise the UI safely explains that the deterministic evidence result remains in use.

## Published project links

- Demo video: https://youtu.be/SRyd-WwHj_4
- Source code: https://github.com/moscraciunxxx/phishlens-tln-2026
- Live static demo: https://moscraciunxxx.github.io/phishlens-tln-2026/

## Required AI disclosure

OpenAI Codex was used as development assistance. The product includes an optional, local-only Ollama semantic-review feature. The deterministic evidence engine and safety checks do not depend on a hosted AI service, and no external AI API key is required.
