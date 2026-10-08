/** Bounded summaries only. Visibility/focus are observable; attention is unknown. */
export class StudyClock {
  private last: number;
  private state: "focusedMs" | "hiddenMs" | "unknownMs";
  private totals = { focusedMs: 0, hiddenMs: 0, unknownMs: 0, buttons: 0 };
  constructor(now: number, visible: boolean, focused: boolean) {
    this.last = now;
    this.state = !visible ? "hiddenMs" : focused ? "focusedMs" : "unknownMs";
  }
  tick(now: number, visible: boolean, focused: boolean) {
    if (!Number.isFinite(now) || now < this.last) {
      // Retain the monotonic high-water mark; the following interval is unknown.
      this.state = "unknownMs";
      return;
    }
    // Long suspension is unknown; do not count a sleeping phone as focused work.
    const delta = Math.max(0, Math.min(now - this.last, 1800000));
    const key = delta > 15000 ? "unknownMs" : this.state;
    this.totals[key] = Math.min(1800000, this.totals[key] + delta);
    this.last = now;
    this.state = !visible ? "hiddenMs" : focused ? "focusedMs" : "unknownMs";
  }
  button() {
    this.totals.buttons = Math.min(100, this.totals.buttons + 1);
  }
  summary() {
    // performance.now() uses fractional milliseconds. Keep the raw sums internally;
    // transmit conservative whole milliseconds accepted by the server contract.
    return {
      focusedMs: Math.floor(this.totals.focusedMs),
      hiddenMs: Math.floor(this.totals.hiddenMs),
      unknownMs: Math.floor(this.totals.unknownMs),
      buttons: this.totals.buttons,
    };
  }
}
