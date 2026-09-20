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

An optional local Ollama review adds a constrained second opinion for semantic patterns that simple rules may not capture. If the local model is unavailable, PhishLens explicitly says so and retains the deterministic evidence result—no silent fallback to an unverified AI claim.

### How we built it

The prototype uses vanilla HTML, CSS, JavaScript modules, and a small Node.js server. The core analysis engine runs in the browser and is shared with the server-side demo endpoint. The optional AI review connects only to a local Ollama endpoint; it treats every pasted message as untrusted content, requests a compact JSON triage response, blocks scam-generation tasks in its prompt, and never exposes chain-of-thought.

We added a 24-case deterministic regression suite covering phishing, impersonation, payment, school, and benign-message cases. The user can run that check visibly in the interface. It is clearly presented as a curated behavior check, not as a claim of real-world model accuracy.

### Challenges we ran into

The main challenge was avoiding the usual “black-box confidence score” trap. A polished percentage can make users over-trust a system that has not been measured in their environment. We replaced it with a transparent observed-factor count, explanations tied to literal evidence, clear caveats, and an independent-verification workflow.

We also needed the AI layer to add value without becoming a privacy leak or a mechanism for unsafe content. That is why it is optional, local-first, narrow in scope, and visibly separated from the deterministic safety engine.

### Accomplishments that we're proud of

- A judge can follow a complete safe workflow in under two minutes.
- Every risk finding is evidence-linked instead of hidden behind a score.
- PhishLens handles sender/brand and link-destination inconsistencies without opening a link.
- It offers concrete next steps tailored to the person receiving the message.
- The UI itself exposes a reproducible 24-case safety regression check.
- The tool is useful even without an AI model or an external service.

### What we learned

Cybersecurity UX is not only about detecting threats; it is about helping someone make a safer decision under pressure. Explanations, uncertainty labels, and a trustworthy verification route are product features, not afterthoughts.

### What's next for PhishLens

The next iteration would add opt-in school reporting workflows, multilingual explanation packs, accessibility testing with student and caregiver participants, and a consent-first evaluation dataset with measurable false-positive and false-negative reporting. We would keep the current safety boundary: analyze locally whenever possible, never follow untrusted links, and do not treat a model output as proof.

## Built with

- JavaScript / Node.js
- HTML and CSS
- Local browser-side analysis modules
- Ollama (optional, local semantic review)
- OpenAI Codex (development assistance)

## Testing and reviewer instructions

1. Run `npm run check` and `npm test`.
2. Start the application with `npm run dev` and open `http://127.0.0.1:4173`.
3. Load **School account**, click **Analyze safely**, and inspect the pressure points and locally parsed link.
4. Click **Run 24-case safety check** to see the deterministic regression result.
5. If Ollama is installed locally, click **Run local AI second opinion**. Otherwise the UI safely explains that the deterministic evidence result remains in use.

## Published project links

- Demo video: https://youtu.be/SRyd-WwHj_4
- Source code: https://github.com/moscraciunxxx/phishlens-tln-2026
- Live static demo: https://moscraciunxxx.github.io/phishlens-tln-2026/

## Required AI disclosure

OpenAI Codex was used as development assistance. The product includes an optional, local-only Ollama semantic-review feature. The deterministic evidence engine and safety checks do not depend on a hosted AI service, and no external AI API key is required.
