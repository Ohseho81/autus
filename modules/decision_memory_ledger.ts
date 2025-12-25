// AUTUS Module: Decision Memory Ledger
// slug: decision_memory_ledger
// contract: init(ctx) -> step(input) -> eval() -> export() -> ledger()
export type Theta = { confidence:number; info:number; risk:number };
export type Entry = { t:number; station:string; choice:'YES'|'NO'|'RESEARCH'; why?:string; tags?:string[]; out?:any };
export type Ledger = { push:(e:Entry)=>void; list:()=>Entry[]; find:(q:{station?:string; tag?:string})=>Entry[] };
export type Ctx = { theta:Theta; now:()=>number };
export type Signal = Record<string, any>;
export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };

export class DecisionMemoryLedger {
  private ctx!: Ctx; private buf: Entry[] = []; private cap = 500;
  private last: Result = { ok:true, score:1, tags:['READY'], out:{} };
  init(ctx: Ctx) { this.ctx = ctx; this.add({t:ctx.now(), station:'SYSTEM', choice:'YES', why:'init'}); }
  step(input: Signal): Result {
    const e: Entry = { t:this.ctx.now(), station:String(input.station ?? 'Decision ⦿'),
      choice:(input.choice ?? 'RESEARCH'), why:input.why, tags:input.tags, out:input.out };
    this.add(e);
    const sims = this.find({ station:e.station, tag:(e.tags?.[0] ?? undefined) }).slice(0,3);
    this.last = { ok:true, score:1, tags:['LOGGED'], out:{ entry:e, similar:sims } };
    return this.last;
  }
  eval(): Result { return this.last; }
  export() { return { module:'DecisionMemoryLedger', size:this.buf.length, last:this.last }; }
  ledger(): Ledger { return { push:(e)=>this.add(e), list:()=>[...this.buf], find:(q)=>this.find(q) }; }
  private add(e: Entry) { this.buf.push(e); if (this.buf.length > this.cap) this.buf.shift(); }
  private find(q:{station?:string; tag?:string}) {
    return this.buf.filter(e => (!q.station || e.station===q.station) && (!q.tag || (e.tags||[]).includes(q.tag)));
  }
  clear() { this.buf = []; }
  count() { return this.buf.length; }
}

// purpose: replayable decision audit + similarity recall
// integrates: Decision Station ⦿ / Research Loop / Exit Line
// ui-mapping: LOGGED->green, RESEARCH->yellow, NO->red
// physics: memory_recall => faster_decision
// eof


