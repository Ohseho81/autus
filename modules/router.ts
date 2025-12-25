// AUTUS Module: Graph Router — connects RouteAdvisor.edge to JSON Graph execution
import { EntropyEngine, Ctx as ECtx } from './entropy_engine';
import { DecisionMemoryLedger } from './decision_memory_ledger';
import { RouteAdvisor, Ctx as RCtx } from './route_advisor';

export type Station = { id:string; type:'START'|'DECISION'|'DRAFT'|'RESEARCH'|'DROP'|'END' };
export type Edge = { from:string; to:string; type:'NORMAL'|'ALTERNATE'|'EXIT'|'LOOP'; cond?:string };
export type Graph = { stations:Station[]; edges:Edge[] };
export type Signal = Record<string, any>;

export class GraphRouter {
  private entropy = new EntropyEngine();
  private ledger = new DecisionMemoryLedger();
  private advisor = new RouteAdvisor();
  private graph!: Graph; private current!: string;
  init(graph: Graph, theta = { confidence:0.6, info:0.6, risk:0.6 }) {
    this.graph = graph; const now = () => Date.now();
    this.ledger.init({ theta, now });
    const ctx: RCtx = { theta, ledger:this.ledger.ledger(), now };
    this.entropy.init(ctx); this.advisor.init(ctx);
    this.current = graph.stations.find(s => s.type==='START')?.id ?? graph.stations[0]?.id ?? '';
  }
  step(input: Signal): { station:string; edge:Edge|null; result:any } {
    const eRes = this.entropy.step(input);
    const aRes = this.advisor.step({ ...input, entropy: eRes.out.entropy });
    this.ledger.step({ station:this.current, choice:aRes.out.edge==='EXIT'?'NO':'RESEARCH', tags:aRes.tags });
    const edge = this.graph.edges.find(e => e.from===this.current && e.type===aRes.out.edge) ??
                 this.graph.edges.find(e => e.from===this.current);
    if (edge) this.current = edge.to;
    return { station:this.current, edge:edge??null, result:{ entropy:eRes, advisor:aRes } };
  }
  eval() { return { entropy:this.entropy.eval(), advisor:this.advisor.eval(), ledger:this.ledger.eval() }; }
  export() { return { current:this.current, modules:[this.entropy.export(),this.ledger.export(),this.advisor.export()] }; }
  getCurrent() { return this.current; }
  getStation(id:string) { return this.graph.stations.find(s => s.id===id); }
  getEdges(from:string) { return this.graph.edges.filter(e => e.from===from); }
}

// integration: GraphRouter.step() => RouteAdvisor.out.edge => Edge selection => next Station
// ui: highlight active Station, animate Edge transition (dashed=ALT, gray=EXIT, round=LOOP)
// eof


