import { analyzePayload, reportText, runScenarioEvaluation } from "./engine.mjs";

const samples = {
  school: {
    profile: "Student",
    channel: "Email",
    sender: "security@accounts-verify.example",
    claimedBrand: "School",
    message: "URGENT: Your student account will be suspended within 30 minutes. Verify your password immediately at https://account-verify.example/login or reply with your one-time code. Do not tell anyone until this is resolved."
  },
  delivery: {
    profile: "Student",
    channel: "Text message",
    sender: "",
    claimedBrand: "",
    message: "Delivery update: we could not complete your package drop-off. Pay the $2.19 redelivery fee at http://bit.ly/track-4821 before 6 PM today to avoid return to sender."
  },
  voice: {
    profile: "Student",
    channel: "Text message",
    sender: "",
    claimedBrand: "",
    message: "Hey, I need you to send $250 in gift cards right now. Please keep this private until I can explain."
  },
  reward: {
    profile: "Student",
    channel: "Email",
    sender: "rewards@claim-prize.example",
    claimedBrand: "School",
    message: "Congratulations! You were selected for a student reward. Send your account information immediately to claim the cash prize today."
  },
  safe: {
    profile: "Student",
    channel: "Chat",
    sender: "",
    claimedBrand: "",
    message: "The robotics club meets in the library at 3 PM tomorrow. Please bring your laptop charger."
  }
};

const iconMap = { timer: "◷", key: "⌘", mask: "◌", card: "▱", lock: "⌑", link: "↗", at: "@" };
const input = document.querySelector("#message-input");
const senderInput = document.querySelector("#sender-input");
const brandInput = document.querySelector("#brand-input");
const channelInput = document.querySelector("#channel-input");
const profileInput = document.querySelector("#profile-input");
const analyzeButton = document.querySelector("#analyze-button");
const clearButton = document.querySelector("#clear-button");
const aiButton = document.querySelector("#ai-review-button");
const evaluationButton = document.querySelector("#evaluation-button");
const charCount = document.querySelector("#char-count");
const actionStatus = document.querySelector("#action-status");
const resultsArea = document.querySelector("#results-area");
const toast = document.querySelector("#toast");
let latestResult = null;
let latestReply = "";
let latestReport = "";

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function getPayload() {
  return {
    message: input.value.trim(),
    sender: senderInput.value.trim(),
    claimedBrand: brandInput.value.trim(),
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

function resetAiCard() {
  document.querySelector("#ai-state").textContent = "ready when you are";
  document.querySelector("#ai-summary").textContent = "Run a local Ollama review to look for meaning-level persuasion patterns that complement the explainable evidence engine.";
  document.querySelector("#ai-observations").innerHTML = "<li>Input stays local when Ollama is available.</li><li>Model output is never treated as a verdict.</li>";
  document.querySelector("#ai-caveat").textContent = "If no local model is available, PhishLens keeps the deterministic evidence analysis fully usable.";
}

function renderResults(data) {
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
    ? data.urls.map((url) => `<div class="url-item"><div class="url-host">${escapeHtml(url.host)}</div><div class="url-verdict">${escapeHtml(url.verdict)}</div>${url.flags.length ? `<div class="url-flags">${escapeHtml(url.flags.join(" · "))}</div>` : ""}</div>`).join("")
    : "<div class=\"url-empty\">No links found. If the message still feels unusual, verify the sender independently.</div>";

  const resilience = document.querySelector("#resilience-list");
  resilience.innerHTML = data.resilience.tactics.map((tactic) => `<li>${escapeHtml(tactic)}</li>`).join("");
  latestResult = data;
  latestReply = data.safeReply;
  latestReport = reportText(data);
  document.querySelector("#safe-reply").textContent = latestReply;
  document.querySelector("#report-status").textContent = `Case ${data.caseId}: a redacted report is ready for ${data.report.destination}.`;
  resetAiCard();
  resultsArea.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function analyze() {
  const payload = getPayload();
  if (!payload.message) {
    actionStatus.textContent = "Paste a message first.";
    input.focus();
    return;
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
    renderResults(data);
    actionStatus.textContent = "Analysis ready.";
  } catch {
    renderResults(analyzePayload(payload));
    actionStatus.textContent = "Offline browser fallback used — analysis stayed local.";
  } finally {
    analyzeButton.disabled = false;
    resultsArea.setAttribute("aria-busy", "false");
  }
}

async function runAiReview() {
  if (!latestResult) await analyze();
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
    document.querySelector("#ai-state").textContent = review.available ? "local AI complete" : "evidence fallback";
    document.querySelector("#ai-summary").textContent = review.summary;
    document.querySelector("#ai-observations").innerHTML = review.observations.map((observation) => `<li>${escapeHtml(observation)}</li>`).join("");
    document.querySelector("#ai-caveat").textContent = review.caveat;
  } catch (error) {
    document.querySelector("#ai-state").textContent = "evidence fallback";
    document.querySelector("#ai-summary").textContent = "The local AI service is unavailable, so PhishLens kept its deterministic evidence analysis active.";
    document.querySelector("#ai-observations").innerHTML = `<li>${escapeHtml(error.message)}</li>`;
  } finally {
    aiButton.disabled = false;
  }
}

function downloadReport() {
  if (!latestReport || !latestResult) return;
  const blob = new Blob([latestReport], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `phishlens-${latestResult.caseId.toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Redacted safety report downloaded locally");
}

async function copySafeReply() {
  if (!latestReply) return;
  try {
    await navigator.clipboard.writeText(latestReply);
    showToast("Safe response copied");
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
      evaluation = runScenarioEvaluation();
    }
    status.textContent = `${evaluation.passed}/${evaluation.total} expected scenarios passed`;
    details.hidden = false;
    details.innerHTML = `<strong>${escapeHtml(evaluation.label)}</strong><span>${escapeHtml(evaluation.note)}</span>`;
  } finally {
    evaluationButton.disabled = false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

input.addEventListener("input", updateCount);
analyzeButton.addEventListener("click", analyze);
input.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") analyze();
});
clearButton.addEventListener("click", () => {
  input.value = "";
  senderInput.value = "";
  brandInput.value = "";
  updateCount();
  input.focus();
  actionStatus.textContent = "Ready for a new message.";
});
document.querySelectorAll("[data-sample]").forEach((button) => {
  button.addEventListener("click", () => {
    const sample = samples[button.dataset.sample];
    input.value = sample.message;
    senderInput.value = sample.sender;
    brandInput.value = sample.claimedBrand;
    channelInput.value = sample.channel;
    profileInput.value = sample.profile;
    updateCount();
    actionStatus.textContent = "Scenario loaded — scan when ready.";
    input.focus();
  });
});
document.querySelector("#copy-button").addEventListener("click", copySafeReply);
document.querySelector("#report-button").addEventListener("click", downloadReport);
aiButton.addEventListener("click", runAiReview);
evaluationButton.addEventListener("click", runEvaluation);

updateCount();
analyze();
