// AUTUS Module: Entropy Engine
// slug: entropy_engine
export type Theta = { confidence:number; info:number; risk:number };
export type Ledger = { push:(e:any)=>void; list:()=>any[] };
export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };
export type Signal = Record<string, any>;
export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };

export class EntropyEngine {
  private ctx!: Ctx;
  private last: Result = { ok:false, score:0, tags:[], out:{} };
  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'entropy:init'}); }
  step(input: Signal): Result {
    const keys = Object.keys(input); const n = keys.length || 1;
    const missing = keys.filter(k => input[k]==null).length / n;
    const vol = Math.max(0, Math.min(1, Number(input.delta ?? Math.abs(Number(input.change ?? 0)))));
    const r = Math.max(0, Math.min(1, Number(input.risk ?? this.ctx.theta.risk ?? 0.5)));
    const entropy = Math.max(0, Math.min(1, 0.45*missing + 0.35*vol + 0.20*r));
    const ok = entropy <= 0.6;
    const tags = ok ? ['STABLE'] : ['ENTROPY_HIGH','ALT'];
    const out = { entropy, missing, vol, risk:r };
    this.last = { ok, score: 1 - entropy, tags, out };
    this.ctx.ledger.push({t:this.ctx.now(), m:'entropy:step', entropy, ok});
    return this.last;
  }
  eval(): Result { return this.last; }
  export() { return { module:'EntropyEngine', last:this.last }; }
  recommend(theta = this.ctx.theta) {
    const e = Number(this.last.out.entropy ?? 1);
    const alt = e > 0.6 || theta.info < 0.6 || theta.confidence < 0.6 || theta.risk > 0.6;
    return { activate_alternate: alt, reason: alt ? 'ALT_LINE' : 'NORMAL_LINE' };
  }
}

// ui: Decision ⦿ / Alternate dashed / Loop round / Exit gray
// physics: entropy↑ => Time↑ Energy↓ Friction↑ SuccessP↑
// contract: init/step/eval/export
// eof


