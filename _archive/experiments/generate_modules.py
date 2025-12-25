from pathlib import Path
import shutil

MODULES = [
  ("entropy_engine","Entropy Engine","TOP"),
  ("decision_memory_ledger","Decision Memory Ledger","TOP"),
  ("route_advisor","AI Co-Pilot (Route Advisor)","TOP"),
  ("threshold_auto_tuning","Threshold Auto-Tuning","SKEL"),
  ("outcome_probability_model","Outcome Probability Model","SKEL"),
  ("counterfactual_replay","Counterfactual Replay","SKEL"),
  ("cross_project_pattern_mining","Cross-Project Pattern Mining","SKEL"),
  ("multi_scale_navigation","Multi-Scale Navigation","SKEL"),
  ("temporal_slider","Temporal Slider","SKEL"),
  ("cognitive_load_meter","Cognitive Load Meter","SKEL"),
  ("role_based_view_filter","Role-Based View Filter","SKEL"),
  ("consensus_gradient","Consensus Gradient","SKEL"),
  ("responsibility_tracing","Responsibility Tracing","SKEL"),
  ("auto_generated_research_tasks","Auto-Generated Research Tasks","SKEL"),
  ("llm_explainability_layer","LLM Explainability Layer","SKEL"),
  ("policy_regulation_mapper","Policy / Regulation Mapper","SKEL"),
  ("market_shock_overlay","Market Shock Overlay","SKEL"),
  ("vendor_partner_graph","Vendor / Partner Graph","SKEL"),
  ("audit_ready_timeline","Audit-Ready Timeline","SKEL"),
  ("fail_safe_exit_protocol","Fail-Safe Exit Protocol","SKEL"),
  ("graph_as_a_service","Graph-as-a-Service (GaaS)","SKEL"),
  ("template_marketplace","Template Marketplace","SKEL"),
  ("outcome_based_pricing_engine","Outcome-Based Pricing Engine","SKEL"),
]

def class_name(slug: str) -> str:
  return "".join([p.capitalize() for p in slug.split("_")])

def skel_38(slug: str, title: str) -> list[str]:
  CN = class_name(slug)
  return [
    f"// AUTUS Module: {title}",
    f"// slug: {slug}",
    "// contract: init(ctx) -> step(input) -> eval() -> export()",
    "export type Theta = { confidence:number; info:number; risk:number };",
    "export type Ledger = { push:(e:any)=>void; list:()=>any[] };",
    "export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };",
    "export type Signal = Record<string, any>;",
    "export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };",
    "",
    f"export class {CN} " + "{",
    "  private ctx!: Ctx;",
    "  private last: Result = { ok:false, score:0, tags:[], out:{} };",
    "  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'init'}); }",
    "  step(input: Signal): Result {",
    "    const { theta } = this.ctx;",
    "    const score = this.computeScore(input, theta);",
    "    const ok = score >= 0.6;",
    "    const tags = ok ? ['PASS'] : ['ALT'];",
    "    const out = { score, ok, input_hint: Object.keys(input).slice(0,3) };",
    "    this.last = { ok, score, tags, out };",
    "    this.ctx.ledger.push({t:this.ctx.now(), m:'step', score, ok});",
    "    return this.last;",
    "  }",
    "  eval(): Result { return this.last; }",
    "  export() { return { module: this.constructor.name, last: this.last }; }",
    "  private computeScore(input: Signal, theta: Theta): number {",
    "    const c = Number(input.confidence ?? 0.5);",
    "    const i = Number(input.info ?? 0.5);",
    "    const r = Number(input.risk ?? 0.5);",
    "    const base = (c + i + (1 - r)) / 3;",
    "    const gate = (theta.confidence + theta.info + (1 - theta.risk)) / 3;",
    "    return Math.max(0, Math.min(1, 0.5 * base + 0.5 * gate));",
    "  }",
    "}",
    "",
    "// ui-mapping: Decision ⦿, Alternate=dashed, Loop=round, Exit=gray",
    "// physics: ALT => Time↑ Energy↓ Friction↑ SuccessP↑",
    "// eof",
  ]

def top_entropy_38() -> list[str]:
  return [
    "// AUTUS Module: Entropy Engine",
    "// slug: entropy_engine",
    "export type Theta = { confidence:number; info:number; risk:number };",
    "export type Ledger = { push:(e:any)=>void; list:()=>any[] };",
    "export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };",
    "export type Signal = Record<string, any>;",
    "export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };",
    "",
    "export class EntropyEngine {",
    "  private ctx!: Ctx;",
    "  private last: Result = { ok:false, score:0, tags:[], out:{} };",
    "  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'entropy:init'}); }",
    "  step(input: Signal): Result {",
    "    const keys = Object.keys(input); const n = keys.length || 1;",
    "    const missing = keys.filter(k => input[k]==null).length / n;",
    "    const vol = Math.max(0, Math.min(1, Number(input.delta ?? Math.abs(Number(input.change ?? 0)))));",
    "    const r = Math.max(0, Math.min(1, Number(input.risk ?? this.ctx.theta.risk ?? 0.5)));",
    "    const entropy = Math.max(0, Math.min(1, 0.45*missing + 0.35*vol + 0.20*r));",
    "    const ok = entropy <= 0.6;",
    "    const tags = ok ? ['STABLE'] : ['ENTROPY_HIGH','ALT'];",
    "    const out = { entropy, missing, vol, risk:r };",
    "    this.last = { ok, score: 1 - entropy, tags, out };",
    "    this.ctx.ledger.push({t:this.ctx.now(), m:'entropy:step', entropy, ok});",
    "    return this.last;",
    "  }",
    "  eval(): Result { return this.last; }",
    "  export() { return { module:'EntropyEngine', last:this.last }; }",
    "  recommend(theta = this.ctx.theta) {",
    "    const e = Number(this.last.out.entropy ?? 1);",
    "    const alt = e > 0.6 || theta.info < 0.6 || theta.confidence < 0.6 || theta.risk > 0.6;",
    "    return { activate_alternate: alt, reason: alt ? 'ALT_LINE' : 'NORMAL_LINE' };",
    "  }",
    "}",
    "",
    "// ui: Decision ⦿ / Alternate dashed / Loop round / Exit gray",
    "// physics: entropy↑ => Time↑ Energy↓ Friction↑ SuccessP↑",
    "// contract: init/step/eval/export",
    "// eof",
  ]

def top_ledger_38() -> list[str]:
  return [
    "// AUTUS Module: Decision Memory Ledger",
    "// slug: decision_memory_ledger",
    "// contract: init(ctx) -> step(input) -> eval() -> export() -> ledger()",
    "export type Theta = { confidence:number; info:number; risk:number };",
    "export type Entry = { t:number; station:string; choice:'YES'|'NO'|'RESEARCH'; why?:string; tags?:string[]; out?:any };",
    "export type Ledger = { push:(e:Entry)=>void; list:()=>Entry[]; find:(q:{station?:string; tag?:string})=>Entry[] };",
    "export type Ctx = { theta:Theta; now:()=>number };",
    "export type Signal = Record<string, any>;",
    "export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };",
    "",
    "export class DecisionMemoryLedger {",
    "  private ctx!: Ctx; private buf: Entry[] = []; private cap = 500;",
    "  private last: Result = { ok:true, score:1, tags:['READY'], out:{} };",
    "  init(ctx: Ctx) { this.ctx = ctx; this.add({t:ctx.now(), station:'SYSTEM', choice:'YES', why:'init'}); }",
    "  step(input: Signal): Result {",
    "    const e: Entry = { t:this.ctx.now(), station:String(input.station ?? 'Decision ⦿'),",
    "      choice:(input.choice ?? 'RESEARCH'), why:input.why, tags:input.tags, out:input.out };",
    "    this.add(e);",
    "    const sims = this.find({ station:e.station, tag:(e.tags?.[0] ?? undefined) }).slice(0,3);",
    "    this.last = { ok:true, score:1, tags:['LOGGED'], out:{ entry:e, similar:sims } };",
    "    return this.last;",
    "  }",
    "  eval(): Result { return this.last; }",
    "  export() { return { module:'DecisionMemoryLedger', size:this.buf.length, last:this.last }; }",
    "  ledger(): Ledger { return { push:(e)=>this.add(e), list:()=>[...this.buf], find:(q)=>this.find(q) }; }",
    "  private add(e: Entry) { this.buf.push(e); if (this.buf.length > this.cap) this.buf.shift(); }",
    "  private find(q:{station?:string; tag?:string}) {",
    "    return this.buf.filter(e => (!q.station || e.station===q.station) && (!q.tag || (e.tags||[]).includes(q.tag)));",
    "  }",
    "  clear() { this.buf = []; }",
    "  count() { return this.buf.length; }",
    "}",
    "",
    "// purpose: replayable decision audit + similarity recall",
    "// integrates: Decision Station ⦿ / Research Loop / Exit Line",
    "// ui-mapping: LOGGED->green, RESEARCH->yellow, NO->red",
    "// physics: memory_recall => faster_decision",
    "// eof",
  ]

def top_advisor_38() -> list[str]:
  return [
    "// AUTUS Module: AI Co-Pilot (Route Advisor)",
    "// slug: route_advisor",
    "// contract: init(ctx) -> step(input) -> eval() -> export()",
    "export type Theta = { confidence:number; info:number; risk:number };",
    "export type Ledger = { push:(e:any)=>void; list:()=>any[] };",
    "export type Ctx = { theta:Theta; ledger:Ledger; now:()=>number };",
    "export type Signal = Record<string, any>;",
    "export type Route = { edge:'NORMAL'|'ALTERNATE'|'EXIT'|'LOOP'; station:string; note:string };",
    "export type Result = { ok:boolean; score:number; tags:string[]; out:Record<string,any> };",
    "",
    "export class RouteAdvisor {",
    "  private ctx!: Ctx; private last: Result = { ok:true, score:1, tags:['READY'], out:{} };",
    "  init(ctx: Ctx) { this.ctx = ctx; this.ctx.ledger.push({t:ctx.now(), m:'advisor:init'}); }",
    "  step(input: Signal): Result {",
    "    const t = this.ctx.theta;",
    "    const c = Number(input.confidence ?? t.confidence ?? 0.5);",
    "    const i = Number(input.info ?? t.info ?? 0.5);",
    "    const r = Number(input.risk ?? t.risk ?? 0.5);",
    "    const entropy = Number(input.entropy ?? (1 - (c + i + (1 - r)) / 3));",
    "    const exit = input.decision === 'NO';",
    "    const alt = !exit && (c < 0.6 || i < 0.6 || r > 0.6 || entropy > 0.6);",
    "    const edge: Route['edge'] = exit ? 'EXIT' : (alt ? 'ALTERNATE' : 'NORMAL');",
    "    const station = exit ? 'Drop Station' : (alt ? 'Research Station' : 'Draft Station');",
    "    const note = exit ? 'resource_recover' : (alt ? 'need_more_info' : 'approve_flow');",
    "    const score = Math.max(0, Math.min(1, 1 - entropy));",
    "    const out = { edge, station, note, c, i, r, entropy };",
    "    this.last = { ok: edge !== 'EXIT', score, tags:[edge], out };",
    "    this.ctx.ledger.push({t:this.ctx.now(), m:'advisor:route', edge, station, score});",
    "    return this.last;",
    "  }",
    "  eval(): Result { return this.last; }",
    "  export() { return { module:'RouteAdvisor', last:this.last }; }",
    "}",
    "",
    "// mapping: Decision ⦿ -> {EXIT, ALTERNATE(Research Loop), NORMAL(Approval Line)}",
    "// ui: Alternate dashed, Loop round, Exit gray",
    "// physics: route_decision => edge_selection",
    "// eof",
  ]

def main():
  out_dir = Path("modules"); out_dir.mkdir(parents=True, exist_ok=True)
  backup = (Path(".") / "modules.bak")
  if out_dir.exists() and (Path.cwd() / "BACKUP").exists():
    if backup.exists(): shutil.rmtree(backup)
    shutil.copytree(out_dir, backup)
  seen = set()
  for slug, title, kind in MODULES:
    if slug in seen: raise ValueError(f"dup slug: {slug}")
    seen.add(slug)
    if kind == "TOP" and slug == "entropy_engine": lines = top_entropy_38()
    elif kind == "TOP" and slug == "decision_memory_ledger": lines = top_ledger_38()
    elif kind == "TOP" and slug == "route_advisor": lines = top_advisor_38()
    else: lines = skel_38(slug, title)
    if len(lines) != 38: raise ValueError(f"{slug} lines={len(lines)}")
    (out_dir / f"{slug}.ts").write_text("\n".join(lines) + "\n", encoding="utf-8")
  print(f"OK: generated {len(MODULES)} modules into ./modules (each 38 lines).")

if __name__ == "__main__":
  main()


