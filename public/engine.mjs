const SIGNAL_DEFINITIONS = [
  {
    id: "urgency",
    label: "Urgency pressure",
    icon: "timer",
    weight: 22,
    patterns: [
      /within\s+\d+\s*(?:minutes?|hours?)/i,
      /immediately|urgent|act now|last warning|final notice|expires? today|suspended|lose access|inmediatamente|immédiatement|ahora|maintenant/i,
      /before\s+(?:it is\s+)?too late/i,
      /urg(?:e|a)nt|immediat(?:e|ely)|act\s+n[o0]w/i
    ],
    explain: "The message compresses your decision time. Scammers use urgency to discourage independent verification."
  },
  {
    id: "credential",
    label: "Credential request",
    icon: "key",
    weight: 25,
    patterns: [
      /password|passcode|one[- ]time code|otp|sign[- ]?in|log\s*in|verify (?:your|the) (?:account|identity)|contraseña|senha|mot de passe/i,
      /account information|bank details|routing number|información de cuenta|informations? du compte/i,
      /confirm (?:your|the) (?:account|details|information)/i,
      /security check|p[a@]ssw[o0]rd/i
    ],
    explain: "The sender is steering you toward account or identity information. Use a known official route instead of a message link."
  },
  {
    id: "impersonation",
    label: "Impersonation cues",
    icon: "mask",
    weight: 18,
    patterns: [
      /help desk|support team|security team|administrator|school office|bank fraud|account team/i,
      /student account|school account|your account|cuenta|compte/i,
      /dear customer|dear user|dear student|estimado cliente|cher client/i,
      /unusual (?:activity|sign[- ]?in)|we detected/i
    ],
    explain: "The message borrows a trusted identity while giving you little independently verifiable context."
  },
  {
    id: "payment",
    label: "Payment or reward bait",
    icon: "card",
    weight: 24,
    patterns: [
      /gift card|wire transfer|bitcoin|crypto|payment|refund|invoice|prize|reward|cash|fee|tarjeta regalo|carte cadeau/i,
      /send (?:me|us)|purchase|buy now/i
    ],
    explain: "Unexpected money, refunds, prizes, and payment demands are common social-engineering hooks."
  },
  {
    id: "secrecy",
    label: "Secrecy or isolation",
    icon: "lock",
    weight: 16,
    patterns: [
      /do not tell|keep this confidential|keep (?:this )?private|don't share|between us|private matter/i,
      /avoid contacting|do not call|reply only/i
    ],
    explain: "A request to hide the conversation or avoid normal support channels removes people who could help verify it."
  }
];

const URL_PATTERN = /https?:\/\/[^\s<>()]+/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/i;
const SHORTENER_HOSTS = new Set(["bit.ly", "tinyurl.com", "t.co", "rb.gy", "is.gd", "ow.ly"]);
const SUSPICIOUS_TLDS = new Set([".zip", ".mov", ".top", ".click", ".cam", ".work"]);
const BRAND_DOMAINS = {
  microsoft: ["microsoft.com", "office.com", "live.com"],
  google: ["google.com", "gmail.com"],
  apple: ["apple.com"],
  paypal: ["paypal.com"],
  amazon: ["amazon.com"],
  fedex: ["fedex.com"],
  ups: ["ups.com"],
  chase: ["chase.com"],
  school: [".edu"]
};

function cleanText(value, limit = 4000) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, limit) : "";
}

function cleanRaw(value, limit = 12000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, limit) : "";
}

function normalizeInput(rawInput) {
  const raw = typeof rawInput === "string" ? { message: rawInput } : rawInput || {};
  return {
    message: cleanText(raw.message),
    sender: cleanText(raw.sender, 160),
    claimedBrand: cleanText(raw.claimedBrand, 80),
    headers: cleanRaw(raw.headers),
    qrValue: cleanText(raw.qrValue, 2000),
    channel: ["Email", "Text message", "Chat", "Other"].includes(raw.channel) ? raw.channel : "Email",
    profile: ["Student", "Parent / caregiver", "School staff", "General user"].includes(raw.profile) ? raw.profile : "Student"
  };
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0];
  }
  return "";
}

function rootDomain(host) {
  const pieces = host.toLowerCase().split(".").filter(Boolean);
  return pieces.length < 2 ? host.toLowerCase() : pieces.slice(-2).join(".");
}

function getSenderDomain(sender) {
  const match = sender.match(EMAIL_PATTERN);
  return match?.[1]?.toLowerCase() || "";
}

function brandKey(value) {
  const lowered = value.toLowerCase();
  return Object.keys(BRAND_DOMAINS).find((key) => lowered.includes(key)) || "";
}

function domainFitsBrand(domain, brand) {
  if (!domain || !brand) return true;
  return BRAND_DOMAINS[brand].some((expected) => expected.startsWith(".") ? domain.endsWith(expected) : domain === expected || domain.endsWith(`.${expected}`));
}

export function parseEmailHeaders(rawHeaders) {
  const source = cleanRaw(rawHeaders);
  if (!source) return { provided: false, checks: [], from: "", replyTo: "", caveat: "No email headers were supplied." };
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const checks = [];
  const addCheck = (name, status, detail) => checks.push({
    name,
    status,
    detail: `${detail} Reported by pasted headers; PhishLens does not independently verify authentication.`
  });
  const authText = lines.filter((line) => /^(authentication-results|received-spf|arc-authentication-results):/i.test(line)).join(" ");
  for (const name of ["spf", "dkim", "dmarc"]) {
    const match = authText.match(new RegExp(`${name}\\s*=\\s*(pass|fail|softfail|neutral|none|temperror|permerror)`, "i"));
    if (match) addCheck(name.toUpperCase(), match[1].toLowerCase(), `The header reports ${name.toUpperCase()} ${match[1].toLowerCase()}.`);
  }
  const dkimPresent = lines.some((line) => /^dkim-signature:/i.test(line));
  if (!checks.some((check) => check.name === "DKIM") && dkimPresent) addCheck("DKIM", "present", "A DKIM-Signature header is present, but no result was supplied.");
  const from = lines.find((line) => /^from:/i.test(line))?.replace(/^from:\s*/i, "") || "";
  const replyTo = lines.find((line) => /^reply-to:/i.test(line))?.replace(/^reply-to:\s*/i, "") || "";
  const fromDomain = getSenderDomain(from);
  const replyDomain = getSenderDomain(replyTo);
  if (fromDomain && replyDomain && rootDomain(fromDomain) !== rootDomain(replyDomain)) {
    addCheck("Reply-To", "review", `Reply-To domain ${replyDomain} differs from From domain ${fromDomain}.`);
  }
  return {
    provided: true,
    checks,
    from,
    replyTo,
    caveat: "Authentication results are evidence reported by the mail system that supplied the headers, not an independent guarantee of sender identity."
  };
}

function encodedDestination(raw, parsed) {
  const authority = raw.match(/^https?:\/\/([^/?#]+)/i)?.[1] || "";
  const rawHost = authority.replace(/^[^@]*@/, "").split(":")[0].replace(/^\[|\]$/g, "");
  return Boolean(
    parsed.username ||
    parsed.password ||
    /%(?:25|2f|2e|3a|40|5c)/i.test(raw) ||
    /[^\x00-\x7f]/.test(rawHost)
  );
}

function extractUrls(text) {
  return [...text.matchAll(URL_PATTERN)].map((match) => {
    const raw = match[0].replace(/[.,!?;:]+$/, "");
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      const flags = [];
      if (parsed.protocol !== "https:") flags.push("not encrypted");
      if (SHORTENER_HOSTS.has(host)) flags.push("link shortener hides the destination");
      if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) flags.push("numeric host address");
      if (host.includes("xn--")) flags.push("look-alike domain encoding");
      if ([...SUSPICIOUS_TLDS].some((tld) => host.endsWith(tld))) flags.push("uncommon high-risk domain ending");
      if (host.split(".").length >= 5) flags.push("unusually deep subdomain chain");
      if (parsed.port && !["80", "443"].includes(parsed.port)) flags.push(`unusual port ${parsed.port}`);
      if (encodedDestination(raw, parsed)) flags.push("encoded or deceptive destination syntax");
      return {
        raw,
        host,
        port: parsed.port || (parsed.protocol === "https:" ? "443" : "80"),
        rootDomain: rootDomain(host),
        flags,
        verdict: flags.length ? "Review before opening" : "Parsed only — not opened"
      };
    } catch {
      return { raw, host: "Unrecognized link", rootDomain: "", flags: ["invalid URL format"], verdict: "Do not open" };
    }
  });
}

function severityFor(score) {
  if (score >= 65) return { label: "High risk", tone: "high", summary: "Several social-engineering signals reinforce one another. Verify through an independent channel." };
  if (score >= 35) return { label: "Needs review", tone: "medium", summary: "There are enough warning signs to pause and verify this outside the message." };
  return { label: "Lower risk", tone: "low", summary: "No strong cluster of scam signals was observed. Stay cautious with unexpected requests." };
}

function caseId(input) {
  const source = `${input.sender}|${input.claimedBrand}|${input.message}`;
  let hash = 5381;
  for (let index = 0; index < source.length; index += 1) hash = (hash * 33) ^ source.charCodeAt(index);
  return `PL-${(hash >>> 0).toString(36).toUpperCase().padStart(6, "0")}`;
}

function redactForReport(text) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/\b\d{6,}\b/g, "[number redacted]");
}

function safeSteps(signalIds, urls, profile) {
  const steps = [
    "Do not click message links or reply with personal information.",
    "Open the organization’s official app or type its known website yourself.",
    "Verify the request through a contact method you already trust."
  ];
  if (signalIds.includes("payment")) steps.unshift("Do not send money, gift cards, codes, or cryptocurrency because of this message.");
  if (signalIds.includes("credential")) steps.unshift("Never share a password or one-time code from a message link.");
  if (profile === "Student") steps.push("Ask a trusted adult, teacher, or school IT contact before taking action.");
  if (profile === "School staff") steps.push("Preserve a redacted copy for your school’s designated IT or security contact.");
  if (urls.length) steps.push("If reporting it, copy the message as evidence without opening the links.");
  return [...new Set(steps)].slice(0, 4);
}

function resilienceSignals(signals) {
  const labels = signals.map((signal) => signal.label);
  const tactics = [];
  if (signals.some((signal) => signal.id === "urgency")) tactics.push("Urgency persists even if a scam is rewritten politely or shortened into a text message.");
  if (signals.some((signal) => signal.id === "credential")) tactics.push("A request for credentials remains risky even when the fake brand or wording changes.");
  if (signals.some((signal) => signal.id === "link" || signal.id === "sender-mismatch")) tactics.push("Identity and destination mismatches survive cosmetic changes to the message wording.");
  if (!tactics.length) tactics.push("No high-risk tactic cluster was found. The safest resilience test is still an independent verification channel.");
  return { observed: labels.slice(0, 3), tactics: tactics.slice(0, 3) };
}

export function analyzePayload(rawInput) {
  const input = normalizeInput(rawInput);
  if (!input.message) throw new Error("Paste a message before scanning.");

  const analysisText = [input.message, input.qrValue ? `QR code contents: ${input.qrValue}` : ""].filter(Boolean).join("\n");
  const urls = extractUrls(analysisText);
  const signals = [];
  let score = 4;

  for (const definition of SIGNAL_DEFINITIONS) {
    const evidence = firstMatch(analysisText, definition.patterns);
    if (!evidence) continue;
    score += definition.weight;
    signals.push({ ...definition, evidence });
  }

  const senderDomain = getSenderDomain(input.sender);
  const brand = brandKey(input.claimedBrand || analysisText);
  if (input.claimedBrand && senderDomain && !domainFitsBrand(senderDomain, brand)) {
    score += 22;
    signals.push({
      id: "sender-mismatch",
      label: "Sender / claimed-brand mismatch",
      icon: "at",
      weight: 22,
      evidence: `${input.claimedBrand} ↔ ${senderDomain}`,
      explain: "The claimed organization does not match the sender domain you supplied. This is a prompt to verify, not proof of fraud."
    });
  }

  for (const url of urls) {
    const urlBrand = brandKey(input.claimedBrand || analysisText);
    if (urlBrand && !domainFitsBrand(url.host, urlBrand)) url.flags.push(`does not match claimed ${urlBrand} domain`);
    if (senderDomain && url.rootDomain && rootDomain(senderDomain) !== url.rootDomain) url.flags.push("destination differs from the sender domain");
    url.flags = [...new Set(url.flags)];
    if (url.flags.length) {
      const highRiskDestination = url.flags.some((flag) => /numeric host|look-alike|high-risk domain|encoded|unusual port/.test(flag));
      const weight = highRiskDestination ? 32 : 16;
      score += weight;
      signals.push({
        id: "link",
        label: "Link needs inspection",
        icon: "link",
        weight,
        evidence: url.host,
        explain: `PhishLens parsed this link locally and did not open it. ${url.flags.join("; ")}.`
      });
    }
  }

  const headerAnalysis = parseEmailHeaders(input.headers);
  for (const check of headerAnalysis.checks) {
    if (!["fail", "softfail", "permerror", "temperror", "review"].includes(check.status)) continue;
    const weight = check.name === "Reply-To" ? 34 : 16;
    score += weight;
    signals.push({
      id: "header-authentication",
      label: `${check.name} header needs review`,
      icon: "mail",
      weight,
      evidence: `${check.name}: ${check.status}`,
      explain: check.detail
    });
  }

  score = Math.min(98, score);
  const severity = severityFor(score);
  const signalIds = signals.map((signal) => signal.id);
  const observedFactors = signals.length;
  const reply = signalIds.includes("credential")
    ? "Thanks — I’ll verify this through the organization’s official app or a known contact channel. I won’t use a link from this message."
    : "Thanks for the note. I’ll verify this independently through an official channel before taking action.";

  return {
    version: "0.4.0",
    input: { ...input, senderDomain },
    caseId: caseId(input),
    score,
    severity,
    signals,
    urls,
    headers: headerAnalysis,
    qr: input.qrValue ? { provided: true, value: input.qrValue, linksFound: extractUrls(input.qrValue).length } : { provided: false, value: "", linksFound: 0 },
    evidenceCoverage: {
      observedFactors,
      label: `${observedFactors} observed factor${observedFactors === 1 ? "" : "s"}`,
      note: "This is an evidence count, not a probability or an accuracy claim."
    },
    triageNotice: "PhishLens is a safety triage tool. It recommends safer verification; it does not prove that a message is fraudulent. Header results are reported evidence, not independent verification.",
    safeSteps: safeSteps(signalIds, urls, input.profile),
    safeReply: reply,
    resilience: resilienceSignals(signals),
    report: {
      title: `PhishLens safety report ${caseId(input)}`,
      destination: input.profile === "Student" ? "a trusted adult, teacher, or school IT contact" : "a trusted security or support contact",
      redactedMessage: redactForReport(input.message)
    },
    scan: {
      characters: input.message.length,
      linksFound: urls.length,
      linksOpened: 0,
      stored: false,
      mode: "Explainable local evidence engine"
    },
    generatedAt: new Date().toISOString()
  };
}

export function reportText(result) {
  const context = result.input;
  const evidence = result.signals.length
    ? result.signals.map((signal) => `- ${signal.label}: ${signal.evidence}`).join("\n")
    : "- No strong scam-signal cluster observed.";
  return [
    "PHISHLENS SAFETY REPORT",
    `Case: ${result.caseId}`,
    `Assessment: ${result.severity.label} (${result.score}/100 evidence score)`,
    `Channel: ${context.channel}`,
    `Sender supplied: ${context.sender || "Not provided"}`,
    `Claimed organization: ${context.claimedBrand || "Not provided"}`,
    `Email headers supplied: ${result.headers?.provided ? "Yes" : "No"}`,
    "",
    "SUMMARY",
    result.severity.summary,
    "",
    "OBSERVED EVIDENCE",
    evidence,
    "",
    "RECOMMENDED NEXT STEPS",
    ...result.safeSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "REDACTED MESSAGE COPY",
    result.report.redactedMessage,
    ...(result.qr?.provided ? ["", "QR CONTENT (provided locally)", redactForReport(result.qr.value)] : []),
    "",
    "SAFETY NOTE",
    "This local report was generated for verification and reporting support. It does not prove fraud and does not send anything automatically."
  ].join("\n");
}

export const EVALUATION_SCENARIOS = [
  { id: "school-credential", expected: "High risk", input: { profile: "Student", channel: "Email", sender: "security@accounts-verify.example", claimedBrand: "School", message: "URGENT: Your student account is suspended. Verify your password within 10 minutes at https://accounts-verify.example/login. Do not tell anyone." } },
  { id: "package-shortener", expected: "Needs review", input: { channel: "Text message", message: "Delivery update: pay the $2.19 fee at http://bit.ly/track-4821 before 6 PM today." } },
  { id: "voice-clone-money", expected: "Needs review", input: { channel: "Text message", message: "I need you to send $250 in gift cards right now. Please keep this private until I can explain." } },
  { id: "fake-bank", expected: "High risk", input: { channel: "Email", sender: "alerts@chase-notice.example", claimedBrand: "Chase", message: "Final notice: unusual activity was detected. Confirm your account details immediately at https://chase-login.example." } },
  { id: "safe-library", expected: "Lower risk", input: { channel: "Chat", message: "The library study room is reserved for our group at 3 PM tomorrow." } },
  { id: "safe-class", expected: "Lower risk", input: { channel: "Email", sender: "teacher@westfield.edu", claimedBrand: "School", message: "Reminder: our class will meet in room 204 after lunch." } },
  { id: "fake-prize", expected: "High risk", input: { channel: "Email", message: "Congratulations, you won a cash prize. Send your account information immediately to claim it today." } },
  { id: "safe-calendar", expected: "Lower risk", input: { channel: "Chat", message: "I added the robotics club meeting to the shared calendar." } },
  { id: "shortened-login", expected: "High risk", input: { channel: "Text message", message: "Security check: reset your password now at http://tinyurl.com/reset-school or lose access." } },
  { id: "safe-club", expected: "Lower risk", input: { channel: "Chat", message: "Thanks for volunteering at the school science fair this Saturday." } },
  { id: "invoice-bait", expected: "Needs review", input: { channel: "Email", message: "Invoice overdue. Pay the fee before it is too late to avoid a service interruption." } },
  { id: "lookalike-domain", expected: "Needs review", input: { channel: "Email", message: "Review the document at https://xn--microsft-7ya.example/signin when you have a moment." } },
  { id: "safe-homework", expected: "Lower risk", input: { channel: "Chat", message: "The homework rubric is in the course folder, and the quiz is next Wednesday." } },
  { id: "support-impersonation", expected: "High risk", input: { channel: "Email", message: "Dear student, the help desk needs your one-time code immediately to restore your account." } },
  { id: "safe-transport", expected: "Lower risk", input: { channel: "Text message", message: "The bus will leave the west entrance at 4:15 PM." } },
  { id: "crypto-scam", expected: "Needs review", input: { channel: "Chat", message: "Private opportunity: send crypto today and we will double it by tomorrow. Don't share this offer." } },
  { id: "safe-team", expected: "Lower risk", input: { channel: "Chat", message: "Can everyone bring a laptop charger to our project meeting?" } },
  { id: "sender-mismatch", expected: "High risk", input: { channel: "Email", sender: "support@account-help.example", claimedBrand: "Microsoft", message: "Your Microsoft account needs a security check. Sign in immediately to avoid suspension." } },
  { id: "safe-art", expected: "Lower risk", input: { channel: "Chat", message: "Your art club poster draft looks great. Let’s review it after school." } },
  { id: "gift-card-request", expected: "Needs review", input: { channel: "Email", message: "Can you purchase gift cards for me? Reply only to this email because I am in a meeting." } },
  { id: "safe-news", expected: "Lower risk", input: { channel: "Email", sender: "newsletter@westfield.edu", claimedBrand: "School", message: "This week's school newsletter is available in the parent portal." } },
  { id: "ip-link", expected: "Needs review", input: { channel: "Text message", message: "Your package needs attention: http://192.0.2.12/track" } },
  { id: "safe-study", expected: "Lower risk", input: { channel: "Chat", message: "Would you like to study for biology together after practice?" } },
  { id: "payment-credential", expected: "High risk", input: { channel: "Email", message: "Urgent refund confirmation: verify your account and password immediately to receive payment." } }
];

export const ADVERSARIAL_SCENARIOS = [
  { id: "polite-rewrite", expected: "Needs review", input: { channel: "Email", message: "When convenient, could you verify your student account information through this sign-in request?" } },
  { id: "misspelled-urgency", expected: "Needs review", input: { channel: "Text message", message: "URGNT: act n0w to verify your p@ssw0rd or lose access." } },
  { id: "unicode-lookalike", expected: "Needs review", input: { channel: "Email", message: "Please review the secure notice at https://xn--paypa1-9za.example/login." } },
  { id: "encoded-path", expected: "Needs review", input: { channel: "Text message", message: "Open the account notice at https://example.com/%2f%2flogin%2fverify." } },
  { id: "unusual-port", expected: "Needs review", input: { channel: "Email", message: "Your document is waiting at https://school.example:8443/verify." } },
  { id: "spanish-credential", expected: "High risk", input: { channel: "Text message", message: "URGENTE: verifica la contraseña de tu cuenta inmediatamente o perderás el acceso." } },
  { id: "french-payment", expected: "High risk", input: { channel: "Chat", message: "Cher client, envoyez une carte cadeau maintenant pour recevoir votre remboursement." } },
  { id: "voice-clone-rewrite", expected: "Needs review", input: { channel: "Text message", message: "I sound like your coach, but please buy gift cards right now and keep this private." } },
  { id: "image-ocr-login", expected: "High risk", input: { channel: "Other", message: "Screenshot OCR: security team detected unusual sign-in. Verify your password immediately at https://account.example/login." } },
  { id: "benign-encoded-text", expected: "Lower risk", input: { channel: "Chat", message: "The art club poster uses a QR code for the room map; ask the organizer if you need help." } },
  { id: "header-failure", expected: "High risk", input: { channel: "Email", sender: "alerts@school.example", claimedBrand: "School", headers: "Authentication-Results: mx; spf=fail dkim=fail dmarc=fail", message: "Please review the new attendance notice in the portal." } },
  { id: "reply-to-divergence", expected: "Needs review", input: { channel: "Email", headers: "From: Office <office@school.example>\nReply-To: help@external.example", message: "Please reply to confirm the meeting time." } }
];

export function runScenarioEvaluation() {
  const cases = EVALUATION_SCENARIOS.map((scenario) => {
    const result = analyzePayload(scenario.input);
    return {
      id: scenario.id,
      expected: scenario.expected,
      actual: result.severity.label,
      passed: scenario.expected === result.severity.label,
      observedFactors: result.evidenceCoverage.observedFactors
    };
  });
  return {
    label: "24-case deterministic safety regression suite",
    passed: cases.filter((item) => item.passed).length,
    total: cases.length,
    cases,
    note: "These are curated behavior checks, not a real-world accuracy benchmark or a claim of model performance."
  };
}

function safeMetric(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(3)) : null;
}

export function runDatasetEvaluation() {
  const scenarios = [...EVALUATION_SCENARIOS, ...ADVERSARIAL_SCENARIOS];
  const cases = scenarios.map((scenario) => {
    const result = analyzePayload(scenario.input);
    return {
      id: scenario.id,
      expected: scenario.expected,
      actual: result.severity.label,
      passed: scenario.expected === result.severity.label,
      observedFactors: result.evidenceCoverage.observedFactors
    };
  });
  const truePositive = cases.filter((item) => item.expected !== "Lower risk" && item.actual !== "Lower risk").length;
  const trueNegative = cases.filter((item) => item.expected === "Lower risk" && item.actual === "Lower risk").length;
  const falsePositive = cases.filter((item) => item.expected === "Lower risk" && item.actual !== "Lower risk").length;
  const falseNegative = cases.filter((item) => item.expected !== "Lower risk" && item.actual === "Lower risk").length;
  const positiveExpected = truePositive + falseNegative;
  return {
    label: `${cases.length}-case deterministic safety dataset`,
    passed: cases.filter((item) => item.passed).length,
    total: cases.length,
    accuracy: safeMetric(truePositive + trueNegative, cases.length),
    precision: safeMetric(truePositive, truePositive + falsePositive),
    recall: safeMetric(truePositive, positiveExpected),
    falsePositiveRate: safeMetric(falsePositive, trueNegative + falsePositive),
    confusion: { truePositive, trueNegative, falsePositive, falseNegative },
    cases,
    note: "This is a transparent synthetic/adversarial behavior dataset. It is not a consented real-world accuracy benchmark and should not be reported as one."
  };
}

export function compareReviews(result, review = {}) {
  const deterministicIds = result?.signals?.map((signal) => signal.id) || [];
  const allowed = new Set(["urgency", "credential", "impersonation", "payment", "secrecy", "link", "sender-mismatch", "header-authentication"]);
  const supplied = Array.isArray(review.signalIds) ? review.signalIds.filter((id) => allowed.has(id)) : [];
  const text = [review.summary, ...(review.observations || [])].filter(Boolean).join(" ").toLowerCase();
  const keywordMap = {
    urgency: ["urgent", "urgency", "pressure", "immediately", "deadline"],
    credential: ["password", "credential", "account", "sign in", "verification"],
    impersonation: ["impersonat", "trusted identity", "support team", "fake brand"],
    payment: ["payment", "gift card", "money", "refund", "prize"],
    secrecy: ["private", "secret", "isolation", "do not tell"],
    link: ["link", "domain", "destination", "url"],
    "sender-mismatch": ["sender", "domain mismatch", "identity mismatch"],
    "header-authentication": ["spf", "dkim", "dmarc", "header"]
  };
  const derived = Object.entries(keywordMap).filter(([, words]) => words.some((word) => text.includes(word))).map(([id]) => id);
  const aiIds = [...new Set(supplied.length ? supplied : derived)];
  const deterministic = [...new Set(deterministicIds)];
  const sharedSignals = deterministic.filter((id) => aiIds.includes(id));
  const deterministicOnly = deterministic.filter((id) => !aiIds.includes(id));
  const aiOnly = aiIds.filter((id) => !deterministic.includes(id));
  const agreement = sharedSignals.length && !deterministicOnly.length && !aiOnly.length
    ? "Aligned"
    : sharedSignals.length
      ? "Partially aligned"
      : "Different signal emphasis";
  return {
    agreement,
    deterministicSignals: deterministic,
    aiSignals: aiIds,
    sharedSignals,
    deterministicOnly,
    aiOnly,
    note: "The deterministic engine remains the primary safety trace. AI output is a second opinion and is never treated as a verdict."
  };
}

export const PILOT_PROTOCOL = {
  title: "PhishLens consent-first pilot",
  consentRequired: true,
  rawMessagesStored: false,
  measures: [
    "time to first safety decision",
    "whether the participant chooses independent verification",
    "understanding of the evidence trail",
    "false-alarm or missed-warning feedback"
  ],
  protocol: "Use only synthetic or participant-provided messages with explicit consent. Record anonymous event timings and ratings locally, then export a summary for review. Do not collect names, contact details, or original messages."
};
