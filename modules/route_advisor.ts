// AUTUS Module: AI Co-Pilot (Route Advisor)
// slug: route_advisor
// contract: init(ctx) -> step(input) -> eval() -> export()
export type Theta = { confidence:number; info:number; risk:number };
export type Ledger = { push:(e:any)=>void; list:()=>any[] };
export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };
export type Signal = Record<string, any>;
export type Route = { edge:'NORMAL'|'ALTERNATE'|'EXIT'|'LOOP'; station:string; note:string };
export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };

export class RouteAdvisor {
  private ctx!: Ctx; private last: Result = { ok:true, score:1, tags:['READY'], out:{} };
  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'advisor:init'}); }
  step(input: Signal): Result {
    const t = this.ctx.theta;
    const c = Number(input.confidence ?? t.confidence ?? 0.5);
    const i = Number(input.info ?? t.info ?? 0.5);
    const r = Number(input.risk ?? t.risk ?? 0.5);
    const entropy = Number(input.entropy ?? (1 - (c + i + (1 - r)) / 3));
    const exit = input.decision === 'NO';
    const alt = !exit && (c < 0.6 || i < 0.6 || r > 0.6 || entropy > 0.6);
    const edge: Route['edge'] = exit ? 'EXIT' : (alt ? 'ALTERNATE' : 'NORMAL');
    const station = exit ? 'Drop Station' : (alt ? 'Research Station' : 'Draft Station');
    const note = exit ? 'resource_recover' : (alt ? 'need_more_info' : 'approve_flow');
    const score = Math.max(0, Math.min(1, 1 - entropy));
    const out = { edge, station, note, c, i, r, entropy };
    this.last = { ok: edge !== 'EXIT', score, tags:[edge], out };
    this.ctx.ledger.push({t:this.ctx.now(), m:'advisor:route', edge, station, score});
    return this.last;
  }
  eval(): Result { return this.last; }
  export() { return { module:'RouteAdvisor', last:this.last }; }
}

// mapping: Decision ⦿ -> {EXIT, ALTERNATE(Research Loop), NORMAL(Approval Line)}
// ui: Alternate dashed, Loop round, Exit gray
// physics: route_decision => edge_selection
// eof


