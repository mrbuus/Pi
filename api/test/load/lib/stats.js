'use strict';

// Хүсэлтийн хугацааны түүврийг цуглуулж p50/p95/p99 тооцно.
class Recorder {
  constructor(name) {
    this.name = name;
    this.samples = [];
    this.errors = 0;
    this.count = 0;
    this.statusCounts = new Map();
  }

  record(ms, ok, status) {
    this.count += 1;
    if (!ok) this.errors += 1;
    this.samples.push(ms);
    if (status !== undefined) {
      this.statusCounts.set(status, (this.statusCounts.get(status) ?? 0) + 1);
    }
  }

  summary() {
    const s = [...this.samples].sort((a, b) => a - b);
    const pct = (p) => {
      if (s.length === 0) return 0;
      const idx = Math.min(s.length - 1, Math.floor((p / 100) * s.length));
      return Math.round(s[idx] * 10) / 10;
    };
    return {
      name: this.name,
      count: this.count,
      errors: this.errors,
      errorRate: this.count ? this.errors / this.count : 0,
      p50: pct(50),
      p95: pct(95),
      p99: pct(99),
      min: s.length ? Math.round(s[0] * 10) / 10 : 0,
      max: s.length ? Math.round(s[s.length - 1] * 10) / 10 : 0,
      mean: s.length ? Math.round((s.reduce((a, b) => a + b, 0) / s.length) * 10) / 10 : 0,
      statusCounts: Object.fromEntries(this.statusCounts),
    };
  }
}

module.exports = { Recorder };
