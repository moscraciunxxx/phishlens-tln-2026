import test from "node:test";
import assert from "node:assert/strict";
import { analyzePayload, reportText, runScenarioEvaluation } from "../src/analysis.mjs";

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
