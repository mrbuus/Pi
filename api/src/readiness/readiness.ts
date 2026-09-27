import { READINESS_WEIGHTS, TOPIC_TITLES } from './readiness-weights';

export type ReadinessAttempt = {
  id?: string;
  problemId?: string;
  topic: string;
  at: Date;
  correct: boolean | null;
};
export type ReadinessTopic = {
  topic: string;
  title: string;
  mastery: number | null;
  measured: boolean;
  weight: number;
  attempts: number;
  effectiveAttempts: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
};
export type ReadinessResult = {
  index: number;
  low: number;
  high: number;
  dataPoints: number;
  effectiveDataPoints: number;
  coverage: number;
  topics: ReadinessTopic[];
  nextBestTopics: ReadinessTopic[];
  weeklyHistory: { week: string; index: number; coverage: number }[];
};

const DAY = 86_400_000;
const ULAANBAATAR_OFFSET_MS = 8 * 60 * 60 * 1000;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const round = (n: number) => Math.round(n);

/** Convert an instant to the UTC date value representing its Ulaanbaatar calendar day. */
export function ulaanbaatarDateOnly(instant: Date): Date {
  const local = new Date(instant.getTime() + ULAANBAATAR_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

function recencyWeight(item: ReadinessAttempt, now: Date) {
  const ageDays = Math.max(0, (now.getTime() - item.at.getTime()) / DAY);
  return Math.pow(0.5, ageDays / 30);
}

function weighted(attempts: ReadinessAttempt[], now: Date) {
  let correct = 0;
  let total = 0;
  for (const item of attempts) {
    if (item.correct === null) continue;
    const weight = recencyWeight(item, now);
    total += weight;
    if (item.correct) correct += weight;
  }
  return { correct, total, mastery: (correct + 2) / (total + 4) };
}

function effectiveSampleSize(attempts: ReadinessAttempt[], now: Date) {
  const clusterWeights = new Map<string, number>();
  let totalEventWeight = 0;
  for (const [index, item] of attempts.entries()) {
    if (item.correct === null) continue;
    const weight = recencyWeight(item, now);
    const cluster = item.problemId ?? item.id ?? `input-${index}`;
    clusterWeights.set(cluster, (clusterWeights.get(cluster) ?? 0) + weight);
    totalEventWeight += weight;
  }
  if (!clusterWeights.size || totalEventWeight === 0) return 0;
  const sumClusterWeights = [...clusterWeights.values()].reduce((sum, value) => sum + value, 0);
  const sumSquared = [...clusterWeights.values()].reduce((sum, value) => sum + value * value, 0);
  const kishCount = (sumClusterWeights * sumClusterWeights) / sumSquared;
  // Discount old evidence in addition to the dependence penalty from repeats.
  return kishCount * (totalEventWeight / attempts.filter((item) => item.correct !== null).length);
}

function score(attempts: ReadinessAttempt[], now: Date) {
  const grouped = new Map<string, ReadinessAttempt[]>();
  const seen = new Set<string>();
  for (const [index, attempt] of attempts.entries()) {
    if (attempt.correct === null) continue;
    const key = attempt.topic.toUpperCase();
    if (!Object.hasOwn(READINESS_WEIGHTS, key)) continue;
    const dedupeKey = `${attempt.id ?? `input-${index}`}:${key}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const topicAttempts = grouped.get(key) ?? [];
    topicAttempts.push(attempt);
    grouped.set(key, topicAttempts);
  }

  const totalWeight = Object.values(READINESS_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
  const measuredWeight = [...grouped.keys()].reduce((sum, topic) => sum + READINESS_WEIGHTS[topic], 0);
  const topics: ReadinessTopic[] = Object.keys(READINESS_WEIGHTS).map((topic) => {
    const values = grouped.get(topic) ?? [];
    if (!values.length) {
      return { topic, title: TOPIC_TITLES[topic] ?? topic, mastery: null, measured: false, weight: READINESS_WEIGHTS[topic], attempts: 0, effectiveAttempts: 0, trend: 'FLAT' };
    }
    const recent = values.filter((value) => now.getTime() - value.at.getTime() <= 30 * DAY);
    const prior = values.filter((value) => now.getTime() - value.at.getTime() > 30 * DAY);
    const trendDelta = weighted(recent, now).mastery - weighted(prior, new Date(now.getTime() - 30 * DAY)).mastery;
    const distinctProblems = (items: ReadinessAttempt[]) => new Set(items.map((item) => item.problemId ?? item.id)).size;
    const hasTrendEvidence = distinctProblems(recent) >= 2 && distinctProblems(prior) >= 2;
    return {
      topic, title: TOPIC_TITLES[topic] ?? topic, mastery: round(weighted(values, now).mastery * 100), measured: true,
      weight: READINESS_WEIGHTS[topic], attempts: values.length, effectiveAttempts: round(effectiveSampleSize(values, now) * 10) / 10,
      trend: !hasTrendEvidence ? 'FLAT' : trendDelta > 0.07 ? 'UP' : trendDelta < -0.07 ? 'DOWN' : 'FLAT',
    };
  });

  const index = measuredWeight
    ? round(topics.reduce((sum, topic) => sum + (topic.mastery ?? 0) * topic.weight, 0) / measuredWeight)
    : 0;
  const mappedAttempts = [...grouped.values()].flat();
  const dataPoints = new Set(mappedAttempts.map((attempt, i) => attempt.id ?? `input-${i}`)).size;
  const effectiveDataPoints = effectiveSampleSize(mappedAttempts, now);
  const coverage = round((measuredWeight / totalWeight) * 100);
  // Effective N collapses retries of the same problem and discounts old events.
  // Missing syllabus coverage further widens the range rather than imputing an
  // unobserved topic as average mastery.
  const coverageFraction = measuredWeight / totalWeight;
  const evidence = effectiveDataPoints * coverageFraction;
  const margin = evidence > 0 ? clamp(round(30 / Math.sqrt(evidence)), 5, 50) : 50;
  return {
    index,
    low: effectiveDataPoints > 0 ? clamp(index - margin, 0, 100) : 0,
    high: effectiveDataPoints > 0 ? clamp(index + margin, 0, 100) : 100,
    dataPoints, effectiveDataPoints: round(effectiveDataPoints * 10) / 10, coverage, topics,
  };
}

export function calculateReadiness(input: ReadinessAttempt[], asOf = new Date()): ReadinessResult {
  const asOfDate = ulaanbaatarDateOnly(asOf);
  const currentCutoff = asOfDate.getTime() - 60 * DAY;
  const current = input.filter((item) => item.at.getTime() >= currentCutoff && item.at.getTime() <= asOfDate.getTime());
  const base = score(current, asOfDate);
  const topics = base.topics.sort((a, b) => a.topic.localeCompare(b.topic));
  const nextBestTopics = [...topics]
    .sort((a, b) => (b.weight * (1 - (b.mastery ?? 50) / 100)) - (a.weight * (1 - (a.mastery ?? 50) / 100)))
    .slice(0, 3);
  const weeklyHistory = Array.from({ length: 8 }, (_, index) => {
    const weekEnd = new Date(asOfDate.getTime() - (7 - index) * 7 * DAY);
    const windowStart = weekEnd.getTime() - 60 * DAY;
    const snapshot = score(input.filter((attempt) => attempt.at.getTime() >= windowStart && attempt.at.getTime() <= weekEnd.getTime()), weekEnd);
    return { week: weekEnd.toISOString().slice(0, 10), index: snapshot.index, coverage: snapshot.coverage };
  });
  return { ...base, topics, nextBestTopics, weeklyHistory };
}
