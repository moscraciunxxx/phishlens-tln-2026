import test from "node:test";
import assert from "node:assert/strict";
import {
  ADVERSARIAL_SCENARIOS,
  analyzePayload,
  compareReviews,
  parseEmailHeaders,
  reportText,
  runDatasetEvaluation,
  runScenarioEvaluation
} from "../src/analysis.mjs";

test("high-risk credential scam produces traceable evidence without opening links", () => {
  const result = analyzePayload({
    profile: "Student",
    sender: "security@verify-school.example",
    claimedBrand: "School",
    message: "URGENT: verify your password within 10 minutes at https://verify-school.example/login. Do not tell anyone."
  });
  assert.equal(result.severity.label, "High risk");
  assert.equal(result.scan.linksOpened, 0);
  assert.equal(result.scan.stored, false);
  assert.ok(result.signals.some((signal) => signal.id === "credential"));
  assert.match(reportText(result), /PHISHLENS SAFETY REPORT/);
});

test("sender-brand mismatch is visible evidence, not a hidden score", () => {
  const result = analyzePayload({
    sender: "account@security-help.example",
    claimedBrand: "Microsoft",
    message: "Your account needs a security check. Sign in immediately."
  });
  assert.ok(result.signals.some((signal) => signal.id === "sender-mismatch"));
});

test("curated regression suite keeps expected scenario behavior", () => {
  const evaluation = runScenarioEvaluation();
  assert.equal(evaluation.total, 24);
  assert.equal(evaluation.passed, evaluation.total, JSON.stringify(evaluation.cases.filter((item) => !item.passed)));
});

test("URL inspection surfaces ports and deceptive encoding without opening destinations", () => {
  const result = analyzePayload({ message: "Review https://example.com:8443/%2f%2flogin%2fverify" });
  assert.equal(result.scan.linksOpened, 0);
  assert.ok(result.urls[0].flags.some((flag) => /unusual port/.test(flag)));
  assert.ok(result.urls[0].flags.includes("encoded or deceptive destination syntax"));
  assert.ok(result.signals.some((signal) => signal.id === "link"));
});

test("pasted authentication headers are explained with verification limits", () => {
  const rawHeaders = "Authentication-Results: mx; spf=fail dkim=pass dmarc=fail\nFrom: Support <support@school.example>\nReply-To: help@external.example";
  const headers = parseEmailHeaders(rawHeaders);
  assert.equal(headers.provided, true);
  assert.ok(headers.checks.some((check) => check.name === "SPF" && check.status === "fail"));
  assert.ok(headers.checks.some((check) => check.name === "Reply-To" && check.status === "review"));
  assert.match(headers.caveat, /not an independent guarantee/i);
  const result = analyzePayload({ headers: rawHeaders, message: "Please review the meeting notice." });
  assert.ok(result.signals.some((signal) => signal.id === "header-authentication"));
});

test("adversarial dataset reports honest behavior metrics", () => {
  const evaluation = runDatasetEvaluation();
  assert.equal(evaluation.total, 24 + ADVERSARIAL_SCENARIOS.length);
  assert.equal(evaluation.passed, evaluation.total, JSON.stringify(evaluation.cases.filter((item) => !item.passed)));
  assert.equal(evaluation.accuracy, 1);
  assert.equal(evaluation.falsePositiveRate, 0);
  assert.match(evaluation.note, /not a consented real-world accuracy benchmark/i);
});

test("AI comparison keeps the deterministic engine primary", () => {
  const result = analyzePayload({ message: "URGENT: verify your password immediately at https://example.com/login" });
  const comparison = compareReviews(result, {
    signalIds: ["credential", "link"],
    summary: "The password request and destination link are risky."
  });
  assert.equal(comparison.agreement, "Partially aligned");
  assert.deepEqual(comparison.sharedSignals.sort(), ["credential"]);
  assert.deepEqual(comparison.aiOnly.sort(), ["link"]);
  assert.match(comparison.note, /primary safety trace/i);
});
