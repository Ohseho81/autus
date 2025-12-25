// AUTUS Module: Responsibility Tracing
// slug: responsibility_tracing
// contract: init(ctx) -> step(input) -> eval() -> export()
export type Theta = { confidence:number; info:number; risk:number };
export type Ledger = { push:(e:any)=>void; list:()=>any[] };
export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };
export type Signal = Record<string, any>;
export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };

export class ResponsibilityTracing {
  private ctx!: Ctx;
  private last: Result = { ok:false, score:0, tags:[], out:{} };
  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'init'}); }
  step(input: Signal): Result {
    const { theta } = this.ctx;
    const score = this.computeScore(input, theta);
    const ok = score >= 0.6;
    const tags = ok ? ['PASS'] : ['ALT'];
    const out = { score, ok, input_hint: Object.keys(input).slice(0,3) };
    this.last = { ok, score, tags, out };
    this.ctx.ledger.push({t:this.ctx.now(), m:'step', score, ok});
    return this.last;
  }
  eval(): Result { return this.last; }
  export() { return { module: this.constructor.name, last: this.last }; }
  private computeScore(input: Signal, theta: Theta): number {
    const c = Number(input.confidence ?? 0.5);
    const i = Number(input.info ?? 0.5);
    const r = Number(input.risk ?? 0.5);
    const base = (c + i + (1 - r)) / 3;
    const gate = (theta.confidence + theta.info + (1 - theta.risk)) / 3;
    return Math.max(0, Math.min(1, 0.5 * base + 0.5 * gate));
  }
}

// ui-mapping: Decision ⦿, Alternate=dashed, Loop=round, Exit=gray
// physics: ALT => Time↑ Energy↓ Friction↑ SuccessP↑
// eof
