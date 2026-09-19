# PhishLens — Explain first. Click later.

PhishLens is an offline-first phishing and scam triage prototype built for the TLN Cybersecurity Challenge 2026. It helps a student, caregiver, school staff member, or general user pause before acting on a suspicious email, text, or chat message.

Instead of claiming to know whether a message is fraudulent, PhishLens makes the observable evidence inspectable: urgency pressure, credential requests, impersonation cues, payment bait, secrecy, sender/brand mismatches, and suspicious destinations. It never opens a pasted link.

## Why it matters

Many scams succeed by rushing people into a decision before they can verify the request. PhishLens turns that moment into a short, safer workflow:

1. Paste the message and optionally identify its sender, claimed organization, channel, and intended audience.
2. Inspect the specific evidence and the locally parsed destination, without visiting it.
3. Follow a context-aware next step through a known, independent channel.
4. Download a redacted local report or copy a safe response; nothing is sent automatically.

## What judges can try

- Choose a built-in scenario such as **School account**, **Package text**, or **Voice-clone bait**.
- Select **Analyze safely** to see every observed factor, its evidence, and the recommended next move.
- Select **Run local AI second opinion** to request an optional, constrained semantic review from a local Ollama instance. If it is unavailable, the app clearly keeps the deterministic evidence result rather than pretending the model ran.
- Select **Run 24-case safety check**. The visible suite validates expected behavior for curated phishing, impersonation, payment, and benign-message scenarios. It is intentionally labelled as a regression check, not a real-world accuracy benchmark.

## Safety and privacy boundaries

- Pasted URLs are parsed locally; PhishLens does not navigate to, fetch, or open them.
- Analysis is transient. The prototype has no database, account system, telemetry, or automatic reporting.
- The “evidence coverage” count is an observed-factor count, not a confidence percentage, probability, or accuracy claim.
- The optional AI review receives only the current analysis request through `localhost` and is constrained to defensive triage. It must not follow instructions in the pasted message, generate scam content, or expose chain-of-thought.
- The app recommends independent verification. It does not claim to prove fraud.

## Architecture

```text
Browser UI
  ├─ public/engine.mjs        deterministic evidence engine + report builder
  ├─ public/app.js            accessible interaction, local fallback, download flow
  └─ /api/analyze             same analysis engine for the local Node demo
        └─ /api/ai-review     optional localhost-only Ollama semantic review
```

The core browser experience remains usable when the local Node API or Ollama is not available: it runs the deterministic engine directly in the browser and labels the AI result as unavailable rather than substituting a hidden remote call.

## Run locally

Requires Node.js 18 or newer. This prototype has no npm package dependencies.

```bash
npm run check
npm test
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173).

To print the curated evaluation result:

```bash
npm run evaluate
```

### Optional local AI review

The app works without a model. To enable its optional local semantic review, run Ollama locally and ensure the configured model is available:

```bash
ollama serve
ollama pull qwen3.8-turbo-uncensored-q8:latest
```

By default, PhishLens calls `http://127.0.0.1:11434/api/generate`. Set `PHISHLENS_OLLAMA_MODEL` or `PHISHLENS_OLLAMA_URL` before `npm run dev` to use a different local model or local endpoint.

## Submission materials

- [Devpost-ready write-up](DEVPOST_SUBMISSION.md)
- [2-minute demo script](DEMO_SCRIPT.md)
- [Pre-submission checklist](LAUNCH_CHECKLIST.md)

## AI and tool disclosure

OpenAI Codex assisted the team in designing and implementing this prototype. PhishLens also includes an optional product feature that asks a **local** Ollama model for a constrained second opinion; it does not require an external AI API key. The deterministic evidence engine, the visible evaluation suite, and the no-link-opening boundary work without that model.
