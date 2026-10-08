#!/usr/bin/env node
"use strict";
// Read Playwright JSON evidence; never creates/updates the accepted findings.
// Usage: node scripts/a11y-report.cjs report.json [report.json ...]
const fs = require("node:fs");
const path = require("node:path");
function readReport(file) {
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  const audits = [],
    failures = [],
    blockedWorkflows = [],
    dependencyStates = [];
  function walk(suite) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        const result = test.results.at(-1);
        if (
          test.status === "unexpected" ||
          (result?.status !== "passed" && result?.status !== "skipped")
        ) {
          failures.push({
            title: spec.title,
            project: test.projectName,
            status: result?.status,
            outcome: test.status,
            expectedStatus: test.expectedStatus,
            errors: result?.errors?.map((error) =>
              error.message.replace(/\x1b\[[0-9;]*m/g, ""),
            ),
          });
        }
        for (const attachment of result?.attachments ?? []) {
          if (
            ![
              "a11y-result",
              "a11y-blocked-workflow",
              "a11y-dependencies",
            ].includes(attachment.name)
          )
            continue;
          const body = attachment.body
            ? Buffer.from(attachment.body, "base64").toString()
            : fs.readFileSync(
                path.resolve(path.dirname(file), attachment.path),
                "utf8",
              );
          const evidence = { ...JSON.parse(body), testStatus: result.status };
          if (attachment.name === "a11y-dependencies")
            dependencyStates.push(evidence);
          else if (attachment.name === "a11y-blocked-workflow")
            blockedWorkflows.push(evidence);
          else audits.push(evidence);
        }
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  }
  for (const suite of report.suites) walk(suite);
  const counts = { serious: 0, critical: 0 },
    rules = {},
    routes = new Set(),
    keys = new Set();
  for (const audit of audits) {
    if (keys.has(audit.key)) throw Error(`Duplicate audit key: ${audit.key}`);
    keys.add(audit.key);
    routes.add(audit.route);
    for (const fingerprint of audit.fingerprints) {
      counts[fingerprint.impact]++;
      rules[fingerprint.rule] = (rules[fingerprint.rule] ?? 0) + 1;
    }
  }
  return {
    file: path.basename(file),
    stats: report.stats,
    globalErrors: report.errors ?? [],
    evidenceErrors: [
      ...(audits.length ? [] : ["No accessibility audit attachments found"]),
      ...(report.stats?.unexpected > 0
        ? [`Playwright reports ${report.stats.unexpected} unexpected tests`]
        : []),
    ],
    completedAudits: audits.length,
    blockedWorkflows,
    dependencyStates,
    distinctRoutes: routes.size,
    nodeOccurrences: counts,
    rules,
    failures,
    audits: audits.map((audit) => ({
      key: audit.key,
      route: audit.route,
      role: audit.role,
      viewport: audit.viewport,
      state: audit.state,
      recording: audit.recording,
      engine: audit.engine,
      testStatus: audit.testStatus,
      fingerprints: audit.fingerprints,
      allImpactCounts: audit.allImpactCounts,
      incomplete: audit.incomplete,
      apiCalls: audit.apiCalls,
    })),
  };
}
if (require.main === module) {
  const files = process.argv.slice(2);
  if (files.length < 1) {
    console.error(
      "Usage: node scripts/a11y-report.cjs report.json [report.json ...]",
    );
    process.exit(2);
  }
  const reports = files.map(readReport);
  console.log(JSON.stringify(reports, null, 2));
  if (
    reports.some(
      (report) =>
        report.failures.length ||
        report.globalErrors.length ||
        report.evidenceErrors.length,
    )
  )
    process.exitCode = 1;
}
module.exports = { readReport };
