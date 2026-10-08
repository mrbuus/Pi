#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function routePattern(route) {
  let pattern = '^';
  for (const part of route.split('/').filter(Boolean)) {
    if (/^\[\[\.\.\./.test(part)) {
      // Next optional catch-all routes match the parent path as well as descendants.
      pattern += '(?:/.*)?';
    } else {
      pattern += '/' + (/^\[\.\.\./.test(part) ? '.+' : /^\[.+\]$/.test(part) ? '[^/]+' : escape(part));
    }
  }
  return new RegExp(pattern + '/?$');
}
const app = path.join(root, 'src/app');
const routes = walk(app).filter(file => /\/(page|route)\.(tsx?|jsx?)$/.test(file)).map(file => '/' + path.relative(app, path.dirname(file)).split(path.sep).filter(p => p && !/^\(.*\)$/.test(p) && !p.startsWith('@')).join('/'));
const patterns = routes.map(routePattern);
const allowed = fs.readFileSync(path.join(root, 'scripts/check-links.allow.txt'), 'utf8').split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).map(line => {
  const [route, ...reason] = line.trim().split(/\s+/);
  if (!reason.length) throw new Error('Allowlist entries need a reason: ' + route);
  return { route, pattern: routePattern(route), reason: reason.join(' ') };
});
let checked = 0, skippedDynamic = 0, failures = 0;
const computedHrefs = [];
for (const file of walk(path.join(root, 'src')).filter(f => /\.[jt]sx?$/.test(f))) {
  const source = fs.readFileSync(file, 'utf8');
  // These hrefs are runtime values, so report them for a separate runtime review
  // instead of pretending to validate them or failing on legitimate dynamic URLs.
  const computedHrefRe = /\bhref\s*=\s*\{\s*([^"'`][^}]*)\}/g;
  for (const match of source.matchAll(computedHrefRe)) {
    computedHrefs.push(`${path.relative(root, file)}:${source.slice(0, match.index).split('\n').length}`);
  }
  // Literal href props/properties and router calls. Runtime-computed hrefs require runtime tests.
  const re = /(?:\bhref\s*(?:=\s*\{?\s*|:\s*)|\b(?:router\.(?:push|replace)|redirect)\s*\(\s*)(["'`])([\s\S]*?)\1/g;
  for (const match of source.matchAll(re)) {
    const raw = match[2];
    if (!raw.startsWith('/') || raw.startsWith('//') || /^\/api(?:\/|$)/.test(raw)) continue;
    const cleaned = raw.replace(/\$\{[^}]*\}/g, '__param__').split(/[?#]/)[0];
    const line = source.slice(0, match.index).split('\n').length;
    if (cleaned.includes('${')) { skippedDynamic++; continue; }
    checked++;
    const staticAsset = path.join(root, 'public', cleaned.slice(1));
    // If a template picks a whole path, verify the known prefix against real routes.
    const dynamic = cleaned.includes('__param__');
    const candidate = dynamic ? routePattern(cleaned.replaceAll('__param__', '[param]')) : null;
    const exists = patterns.some(p => p.test(cleaned)) || (dynamic && routes.some(route => candidate.test(route.replace(/\[.*?\]/g, '__param__'))));
    if (exists || fs.existsSync(staticAsset) && fs.statSync(staticAsset).isFile() || allowed.some(a => a.pattern.test(cleaned))) continue;
    console.error(`${path.relative(root, file)}:${line}: unknown route ${raw}`);
    failures++;
  }
}
const computedSummary = computedHrefs.length
  ? ` ${computedHrefs.length} computed href expressions not route-checked (locations: ${computedHrefs.join(', ')}).`
  : ' 0 computed href expressions.';
console.log(`${checked} internal links checked against ${routes.length} routes; ${failures} broken; ${skippedDynamic} complex templates require runtime review.${computedSummary}`);
process.exitCode = failures ? 1 : 0;
