/**
 * Calls `tick` every `ms` from a worker, whose timer is not throttled in
 * background tabs the way page timers are; falls back to a page interval.
 */
export class TickClock {
  private worker: Worker | null = null;
  private fallback: number | null = null;

  constructor(
    private readonly ms: number,
    private readonly tick: () => void
  ) {}

  start() {
    if (this.worker || this.fallback !== null) return;
    try {
      const source =
        "let t;onmessage=e=>{clearInterval(t);if(e.data>0)t=setInterval(()=>postMessage(0),e.data)}";
      this.worker = new Worker(
        URL.createObjectURL(new Blob([source], { type: "text/javascript" }))
      );
      this.worker.onmessage = () => this.tick();
      this.worker.postMessage(this.ms);
    } catch {
      this.fallback = window.setInterval(() => this.tick(), this.ms);
    }
  }

  stop() {
    this.worker?.postMessage(0);
    this.worker?.terminate();
    this.worker = null;
    if (this.fallback !== null) window.clearInterval(this.fallback);
    this.fallback = null;
  }
}
