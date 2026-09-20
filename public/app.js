import {
  analyzePayload,
  compareReviews,
  PILOT_PROTOCOL,
  reportText,
  runDatasetEvaluation
} from "./engine.mjs";

const samples = {
  school: {
    profile: "Student",
    channel: "Email",
    sender: "security@accounts-verify.example",
    claimedBrand: "School",
    headers: "Authentication-Results: mx; spf=fail dkim=fail dmarc=fail",
    message: "URGENT: Your student account will be suspended within 30 minutes. Verify your password immediately at https://account-verify.example/login or reply with your one-time code. Do not tell anyone until this is resolved."
  },
  delivery: {
    profile: "Student",
    channel: "Text message",
    sender: "",
    claimedBrand: "",
    headers: "",
    message: "Delivery update: we could not complete your package drop-off. Pay the $2.19 redelivery fee at http://bit.ly/track-4821 before 6 PM today to avoid return to sender."
  },
  voice: {
    profile: "Student",
    channel: "Text message",
    sender: "",
    claimedBrand: "",
    headers: "",
    message: "Hey, I need you to send $250 in gift cards right now. Please keep this private until I can explain."
  },
  reward: {
    profile: "Student",
    channel: "Email",
    sender: "rewards@claim-prize.example",
    claimedBrand: "School",
    headers: "",
    message: "Congratulations! You were selected for a student reward. Send your account information immediately to claim the cash prize today."
  },
  safe: {
    profile: "Student",
    channel: "Chat",
    sender: "",
    claimedBrand: "",
    headers: "",
    message: "The robotics club meets in the library at 3 PM tomorrow. Please bring your laptop charger."
  }
};

const iconMap = { timer: "◷", key: "⌘", mask: "◌", card: "▱", lock: "⌑", link: "↗", at: "@", mail: "✉" };
const input = document.querySelector("#message-input");
const senderInput = document.querySelector("#sender-input");
const brandInput = document.querySelector("#brand-input");
const headersInput = document.querySelector("#headers-input");
const qrValueInput = document.querySelector("#qr-value-input");
const channelInput = document.querySelector("#channel-input");
const profileInput = document.querySelector("#profile-input");
const screenshotInput = document.querySelector("#screenshot-input");
const analyzeButton = document.querySelector("#analyze-button");
const clearButton = document.querySelector("#clear-button");
const aiButton = document.querySelector("#ai-review-button");
const evaluationButton = document.querySelector("#evaluation-button");
const judgeButton = document.querySelector("#judge-mode-button");
const charCount = document.querySelector("#char-count");
const actionStatus = document.querySelector("#action-status");
const resultsArea = document.querySelector("#results-area");
const toast = document.querySelector("#toast");
const handoffRecipient = document.querySelector("#handoff-recipient");
const handoffConsent = document.querySelector("#handoff-consent");
const handoffButton = document.querySelector("#handoff-button");
const pilotConsent = document.querySelector("#pilot-consent");
const pilotStartButton = document.querySelector("#pilot-start-button");
const pilotVerifyButton = document.querySelector("#pilot-verify-button");
const pilotFeedbackButton = document.querySelector("#pilot-feedback-button");
const pilotExportButton = document.querySelector("#pilot-export-button");
const pilotStatus = document.querySelector("#pilot-status");
let latestResult = null;
let latestReply = "";
let latestReport = "";
let latestReview = null;
let pilotSession = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function getPayload() {
  return {
    message: input.value.trim(),
    sender: senderInput.value.trim(),
    claimedBrand: brandInput.value.trim(),
    headers: headersInput.value.trim(),
    qrValue: qrValueInput.value.trim(),
    channel: channelInput.value,
    profile: profileInput.value
  };
}

function updateCount() {
  charCount.textContent = `${input.value.length.toLocaleString()} / 4,000`;
}

function highlightMessage(message, signals) {
  let output = escapeHtml(message);
  const matches = [...new Set(signals.map((signal) => signal.evidence).filter(Boolean))]
    .filter((match) => message.toLowerCase().includes(String(match).toLowerCase()))
    .sort((a, b) => b.length - a.length);
  for (const match of matches) {
    const escaped = escapeHtml(match);
    output = output.replaceAll(escaped, `<mark>${escaped}</mark>`);
  }
  return output;
}

function renderHeaderAnalysis(data) {
  const panel = document.querySelector("#header-analysis");
  const list = document.querySelector("#header-list");
  if (!data.headers?.provided) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  list.innerHTML = data.headers.checks.length
    ? data.headers.checks.map((check) => `<li><strong>${escapeHtml(check.name)}: ${escapeHtml(check.status)}</strong><span>${escapeHtml(check.detail)}</span></li>`).join("")
    : "<li><strong>No SPF/DKIM/DMARC result found</strong><span>The pasted headers did not expose a parseable authentication result.</span></li>";
  document.querySelector("#header-caveat").textContent = data.headers.caveat;
}

function renderQrAnalysis(data) {
  const panel = document.querySelector("#qr-analysis");
  if (!data.qr?.provided) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  document.querySelector("#qr-analysis-text").textContent = `${data.qr.linksFound} link${data.qr.linksFound === 1 ? "" : "s"} found in the locally supplied QR value. It was parsed, never opened.`;
}

function renderComparison(comparison) {
  const card = document.querySelector("#comparison-card");
  if (!comparison) {
    card.hidden = true;
    return;
  }
  const labels = {
    urgency: "Urgency",
    credential: "Credentials",
    impersonation: "Impersonation",
    payment: "Payment/reward",
    secrecy: "Secrecy",
    link: "Link/destination",
    "sender-mismatch": "Sender mismatch",
    "header-authentication": "Email authentication"
  };
  const list = (ids) => ids.length ? ids.map((id) => labels[id] || id).join(", ") : "None surfaced";
  card.hidden = false;
  document.querySelector("#comparison-status").textContent = comparison.agreement;
  document.querySelector("#shared-signals").textContent = list(comparison.sharedSignals);
  document.querySelector("#deterministic-only").textContent = list(comparison.deterministicOnly);
  document.querySelector("#ai-only").textContent = list(comparison.aiOnly);
  document.querySelector("#comparison-note").textContent = comparison.note;
}

function resetAiCard() {
  latestReview = null;
  document.querySelector("#ai-state").textContent = "ready when you are";
  document.querySelector("#ai-summary").textContent = "Run a local Ollama review to look for meaning-level persuasion patterns that complement the explainable evidence engine.";
  document.querySelector("#ai-observations").innerHTML = "<li>Input stays local when Ollama is available.</li><li>Model output is never treated as a verdict.</li>";
  document.querySelector("#ai-caveat").textContent = "If no local model is available, PhishLens keeps the deterministic evidence analysis fully usable.";
  renderComparison(null);
}

function renderResults(data, { scroll = true } = {}) {
  const score = document.querySelector("#score-value");
  const ring = document.querySelector("#score-ring");
  const label = document.querySelector("#risk-label");
  const summary = document.querySelector("#risk-summary");
  const signalList = document.querySelector("#signal-list");
  const safeSteps = document.querySelector("#safe-steps");
  const messagePreview = document.querySelector("#message-preview");
  const urlList = document.querySelector("#url-list");
  const signalCount = document.querySelector("#signal-count");
  const linkStat = document.querySelector("#link-stat");

  score.textContent = data.score;
  ring.style.setProperty("--score", `${Math.max(8, data.score * 3.6)}deg`);
  label.textContent = data.severity.label;
  label.className = `risk-label ${data.severity.tone}`;
  summary.textContent = data.severity.summary;
  document.querySelector("#evidence-value").textContent = data.evidenceCoverage.label;
  document.querySelector("#triage-note").textContent = data.triageNotice;
  signalCount.textContent = `${data.signals.length} signal${data.signals.length === 1 ? "" : "s"}`;
  linkStat.textContent = `${data.urls.length} link${data.urls.length === 1 ? "" : "s"} found`;
  document.querySelector("#scan-mode").textContent = data.scan.mode;

  safeSteps.innerHTML = data.safeSteps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
  signalList.innerHTML = data.signals.length
    ? data.signals.map((signal) => `
      <div class="signal-item">
        <div class="signal-icon" aria-hidden="true">${iconMap[signal.icon] || "•"}</div>
        <div>
          <div class="signal-name"><span>${escapeHtml(signal.label)}</span><span class="signal-weight">+${signal.weight} evidence</span></div>
          <div class="signal-evidence">“${escapeHtml(signal.evidence)}”</div>
          <p class="signal-explain">${escapeHtml(signal.explain)}</p>
        </div>
      </div>`).join("")
    : "<div class=\"url-empty\">No strong signal cluster was detected. Verify unexpected requests through a channel you already trust.</div>";

  messagePreview.innerHTML = highlightMessage(data.input.message, data.signals);
  urlList.innerHTML = data.urls.length
    ? data.urls.map((url) => `<div class="url-item"><div class="url-host">${escapeHtml(url.host)}<span class="url-port">:${escapeHtml(url.port)}</span></div><div class="url-verdict">${escapeHtml(url.verdict)}</div>${url.flags.length ? `<div class="url-flags">${escapeHtml(url.flags.join(" · "))}</div>` : ""}</div>`).join("")
    : "<div class=\"url-empty\">No links found. If the message still feels unusual, verify the sender independently.</div>";

  document.querySelector("#resilience-list").innerHTML = data.resilience.tactics.map((tactic) => `<li>${escapeHtml(tactic)}</li>`).join("");
  renderHeaderAnalysis(data);
  renderQrAnalysis(data);
  latestResult = data;
  latestReply = data.safeReply;
  latestReport = reportText(data);
  document.querySelector("#safe-reply").textContent = latestReply;
  document.querySelector("#report-status").textContent = `Case ${data.caseId}: a redacted report is ready for ${data.report.destination}.`;
  renderHandoffPreview();
  resetAiCard();
  recordPilotEvent("analysis_complete");
  if (scroll) resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function analyze({ scroll = true } = {}) {
  const payload = getPayload();
  if (!payload.message) {
    actionStatus.textContent = "Paste a message first.";
    input.focus();
    return null;
  }
  analyzeButton.disabled = true;
  resultsArea.setAttribute("aria-busy", "true");
  actionStatus.textContent = "Reading evidence locally…";
  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to analyze this message.");
    renderResults(data, { scroll });
    actionStatus.textContent = "Analysis ready.";
    return data;
  } catch {
    const data = analyzePayload(payload);
    renderResults(data, { scroll });
    actionStatus.textContent = "Offline browser fallback used — analysis stayed local.";
    return data;
  } finally {
    analyzeButton.disabled = false;
    resultsArea.setAttribute("aria-busy", "false");
  }
}

async function runAiReview() {
  if (!latestResult) await analyze({ scroll: false });
  if (!latestResult) return;
  aiButton.disabled = true;
  document.querySelector("#ai-state").textContent = "reviewing locally…";
  document.querySelector("#ai-summary").textContent = "The local model is checking for persuasion patterns beyond individual keywords.";
  try {
    const response = await fetch("/api/ai-review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getPayload())
    });
    const review = await response.json();
    if (!response.ok) throw new Error(review.error || "Unable to run local AI review.");
    latestReview = review;
    document.querySelector("#ai-state").textContent = review.available ? "local AI complete" : "evidence fallback";
    document.querySelector("#ai-summary").textContent = review.summary;
    document.querySelector("#ai-observations").innerHTML = review.observations.map((observation) => `<li>${escapeHtml(observation)}</li>`).join("");
    document.querySelector("#ai-caveat").textContent = review.caveat;
    renderComparison(review.comparison || compareReviews(latestResult, review));
    recordPilotEvent("ai_review_complete");
  } catch (error) {
    const review = {
      available: false,
      signalIds: latestResult.signals.map((signal) => signal.id),
      summary: "The local AI service is unavailable, so PhishLens kept its deterministic evidence analysis active.",
      observations: [error.message],
      caveat: "The deterministic engine remains the primary safety trace; no network model call succeeded."
    };
    latestReview = review;
    document.querySelector("#ai-state").textContent = "evidence fallback";
    document.querySelector("#ai-summary").textContent = review.summary;
    document.querySelector("#ai-observations").innerHTML = `<li>${escapeHtml(error.message)}</li>`;
    document.querySelector("#ai-caveat").textContent = review.caveat;
    renderComparison(compareReviews(latestResult, review));
  } finally {
    aiButton.disabled = false;
  }
}

function downloadText(filename, text, type = "text/plain;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadReport() {
  if (!latestReport || !latestResult) return;
  downloadText(`phishlens-${latestResult.caseId.toLowerCase()}.txt`, latestReport);
  showToast("Redacted safety report downloaded locally");
  recordPilotEvent("report_exported");
}

async function copySafeReply() {
  if (!latestReply) return;
  try {
    await navigator.clipboard.writeText(latestReply);
    showToast("Safe response copied");
    recordPilotEvent("safe_reply_copied");
  } catch {
    showToast("Select the response text to copy it");
  }
}

async function runEvaluation() {
  evaluationButton.disabled = true;
  const status = document.querySelector("#evaluation-status");
  const details = document.querySelector("#evaluation-details");
  status.textContent = "Running safety checks…";
  try {
    let evaluation;
    try {
      const response = await fetch("/api/evaluate");
      if (!response.ok) throw new Error("Local endpoint unavailable");
      evaluation = await response.json();
    } catch {
      evaluation = runDatasetEvaluation();
    }
    status.textContent = `${evaluation.passed}/${evaluation.total} cases passed`;
    details.hidden = false;
    details.innerHTML = `
      <strong>${escapeHtml(evaluation.label)}</strong>
      <span>Accuracy: ${evaluation.accuracy ?? "n/a"}</span>
      <span>Precision: ${evaluation.precision ?? "n/a"}</span>
      <span>Recall: ${evaluation.recall ?? "n/a"}</span>
      <span>False-positive rate: ${evaluation.falsePositiveRate ?? "n/a"}</span>
      <span>${escapeHtml(evaluation.note)}</span>`;
    recordPilotEvent("evaluation_complete");
    return evaluation;
  } finally {
    evaluationButton.disabled = false;
  }
}

async function runJudgeMode() {
  judgeButton.disabled = true;
  const status = document.querySelector("#judge-status");
  status.textContent = "1/3 loading a representative school scenario…";
  loadSample("school", false);
  const data = await analyze({ scroll: false });
  if (!data) {
    judgeButton.disabled = false;
    return;
  }
  status.textContent = "2/3 evidence trail and safe report ready…";
  await runEvaluation();
  status.textContent = "3/3 judge proof ready: evidence → safe report → adversarial metrics.";
  document.querySelector("#judge-proof").hidden = false;
  resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("90-second judge mode is ready to present");
  judgeButton.disabled = false;
}

async function inspectScreenshot() {
  const file = screenshotInput.files?.[0];
  const status = document.querySelector("#screenshot-status");
  const preview = document.querySelector("#screenshot-preview");
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    status.textContent = "Choose an image file to inspect locally.";
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  preview.src = objectUrl;
  preview.hidden = false;
  status.textContent = "Screenshot preview is local; checking for a QR code…";
  try {
    if (!("BarcodeDetector" in window)) throw new Error("This browser does not expose a local QR detector.");
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    const bitmap = await createImageBitmap(file);
    const codes = await detector.detect(bitmap);
    bitmap.close?.();
    const values = codes.map((code) => code.rawValue).filter(Boolean);
    if (!values.length) throw new Error("No QR code was detected. You can paste any visible link or OCR text below.");
    qrValueInput.value = [...new Set(values)].join("\n");
    status.textContent = `${values.length} QR value${values.length === 1 ? "" : "s"} decoded locally. Analyze to inspect its destination without opening it.`;
    if (input.value.trim()) await analyze({ scroll: false });
  } catch (error) {
    status.textContent = `${error.message} The image was not uploaded.`;
  }
}

function renderHandoffPreview() {
  document.querySelector("#handoff-preview").textContent = latestReport
    ? `Consent-first handoff preview\nRecipient: ${handoffRecipient.value}\n\n${latestReport}`
    : "Analyze a message to create a redacted handoff preview.";
}

function exportHandoff() {
  if (!handoffConsent.checked) {
    document.querySelector("#handoff-status").textContent = "Check consent before exporting a handoff.";
    return;
  }
  if (!latestReport || !latestResult) {
    document.querySelector("#handoff-status").textContent = "Analyze a message first.";
    return;
  }
  const text = `PHISHLENS CONSENTED HANDOFF\nRecipient: ${handoffRecipient.value}\nOriginal message storage: none\n\n${latestReport}`;
  downloadText(`phishlens-handoff-${latestResult.caseId.toLowerCase()}.txt`, text);
  document.querySelector("#handoff-status").textContent = "Redacted handoff exported locally; nothing was sent.";
  recordPilotEvent("handoff_exported");
}

function recordPilotEvent(type, value = "") {
  if (!pilotSession) return;
  pilotSession.events.push({ type, value: String(value).slice(0, 40), elapsedMs: Math.round(performance.now() - pilotSession.startedAt) });
  const actionCount = pilotSession.events.filter((event) => ["independent_verification", "false_alarm_feedback"].includes(event.type)).length;
  pilotStatus.textContent = `${actionCount} consented outcome${actionCount === 1 ? "" : "s"} recorded locally; original messages are not stored.`;
}

function startPilot() {
  if (!pilotConsent.checked) {
    pilotStatus.textContent = "Consent is required. Use synthetic or voluntarily supplied content only.";
    return;
  }
  pilotSession = { startedAt: performance.now(), events: [] };
  [pilotVerifyButton, pilotFeedbackButton, pilotExportButton].forEach((button) => { button.disabled = false; });
  pilotStatus.textContent = "Pilot started locally. Choose the outcome that best matches your decision after reviewing the evidence.";
  recordPilotEvent("pilot_started");
}

function exportPilotSummary() {
  if (!pilotSession) {
    pilotStatus.textContent = "Start a consented pilot session first.";
    return;
  }
  const outcomes = pilotSession.events.filter((event) => ["independent_verification", "false_alarm_feedback"].includes(event.type));
  const times = outcomes.map((event) => event.elapsedMs);
  const summary = {
    protocol: PILOT_PROTOCOL,
    generatedAt: new Date().toISOString(),
    participantCount: 1,
    outcomeCount: outcomes.length,
    averageTimeToOutcomeMs: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null,
    outcomes: outcomes.map((event) => ({ type: event.type, elapsedMs: event.elapsedMs })),
    limitation: "Local dogfood session only; this is not a representative user study. Run additional consented sessions before making population-level claims."
  };
  downloadText("phishlens-pilot-summary.json", JSON.stringify(summary, null, 2), "application/json;charset=utf-8");
  pilotStatus.textContent = "Anonymous pilot summary exported locally. No original message content was included.";
}

function loadSample(name, announce = true) {
  const sample = samples[name];
  if (!sample) return;
  input.value = sample.message;
  senderInput.value = sample.sender;
  brandInput.value = sample.claimedBrand;
  headersInput.value = sample.headers;
  qrValueInput.value = "";
  channelInput.value = sample.channel;
  profileInput.value = sample.profile;
  updateCount();
  if (announce) actionStatus.textContent = "Scenario loaded — scan when ready.";
  input.focus();
}

function applyAccessibilityPreferences() {
  document.body.classList.toggle("large-type", document.querySelector("#large-text-toggle").checked);
  document.body.classList.toggle("high-contrast", document.querySelector("#high-contrast-toggle").checked);
  document.body.classList.toggle("reduce-motion", document.querySelector("#reduce-motion-toggle").checked);
  document.body.dataset.readingLevel = document.querySelector("#reading-level-input").value;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

input.addEventListener("input", updateCount);
analyzeButton.addEventListener("click", () => analyze());
input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") analyze();
});
clearButton.addEventListener("click", () => {
  input.value = "";
  senderInput.value = "";
  brandInput.value = "";
  headersInput.value = "";
  qrValueInput.value = "";
  screenshotInput.value = "";
  document.querySelector("#screenshot-preview").hidden = true;
  document.querySelector("#screenshot-status").textContent = "No image selected.";
  updateCount();
  input.focus();
  actionStatus.textContent = "Ready for a new message.";
});
document.querySelectorAll("[data-sample]").forEach((button) => button.addEventListener("click", () => loadSample(button.dataset.sample)));
document.querySelector("#copy-button").addEventListener("click", copySafeReply);
document.querySelector("#report-button").addEventListener("click", downloadReport);
aiButton.addEventListener("click", runAiReview);
evaluationButton.addEventListener("click", runEvaluation);
judgeButton.addEventListener("click", runJudgeMode);
screenshotInput.addEventListener("change", inspectScreenshot);
handoffRecipient.addEventListener("change", renderHandoffPreview);
handoffConsent.addEventListener("change", () => { handoffButton.disabled = !handoffConsent.checked; });
handoffButton.addEventListener("click", exportHandoff);
pilotStartButton.addEventListener("click", startPilot);
pilotVerifyButton.addEventListener("click", () => { recordPilotEvent("independent_verification"); pilotStatus.textContent = "Independent verification choice recorded locally."; });
pilotFeedbackButton.addEventListener("click", () => { recordPilotEvent("false_alarm_feedback"); pilotStatus.textContent = "False-alarm / missed-warning feedback recorded locally."; });
pilotExportButton.addEventListener("click", exportPilotSummary);
document.querySelectorAll("#large-text-toggle, #high-contrast-toggle, #reduce-motion-toggle, #reading-level-input").forEach((control) => control.addEventListener("change", applyAccessibilityPreferences));

applyAccessibilityPreferences();
updateCount();
renderHandoffPreview();
analyze({ scroll: false });
