"use client";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗺️ Page 6: Relationship Map - 노드 관계 시각화 (D3)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1-12-144 구조 시각화
 */

import { useEffect, useRef, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { ledger } from "@/lib/ledger";
import { Card } from "@/components/cards";
import * as d3 from "d3";

const TIER_COLORS: Record<number, string> = {
  1: "#22c55e", // 핵심 (green)
  2: "#3b82f6", // 중요 (blue)
  3: "#64748b", // 확장 (slate)
};

const KIND_SHAPES: Record<string, string> = {
  person: "circle",
  org: "rect",
  asset: "diamond",
  power: "star",
};

export default function MapPage() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodes = useLiveQuery(() => ledger.nodes.toArray(), []);
  const motions = useLiveQuery(() => ledger.motions.toArray(), []);

  // D3 데이터 변환
  const graphData = useMemo(() => {
    if (!nodes) return { nodes: [], links: [] };

    const d3Nodes = nodes.map((n) => ({
      id: n.node_id,
      label: n.label,
      kind: n.kind,
      tier: n.tier ?? 3,
      r: n.tier === 1 ? 24 : n.tier === 2 ? 16 : 12,
    }));

    // 간단한 링크 생성 (Tier 1 → Tier 2, Tier 2 → Tier 3)
    const d3Links: { source: string; target: string }[] = [];
    const tier1 = d3Nodes.filter((n) => n.tier === 1);
    const tier2 = d3Nodes.filter((n) => n.tier === 2);
    const tier3 = d3Nodes.filter((n) => n.tier === 3);

    tier2.forEach((n) => {
      if (tier1[0]) {
        d3Links.push({ source: tier1[0].id, target: n.id });
      }
    });

    tier3.forEach((n, i) => {
      const parent = tier2[i % tier2.length];
      if (parent) {
        d3Links.push({ source: parent.id, target: n.id });
      }
    });

    // Motion 기반 링크 추가
    motions?.forEach((m) => {
      if (nodes.find((n) => n.node_id === m.source_node_id) && 
          nodes.find((n) => n.node_id === m.target_node_id)) {
        d3Links.push({
          source: m.source_node_id,
          target: m.target_node_id,
        });
      }
    });

    return { nodes: d3Nodes, links: d3Links };
  }, [nodes, motions]);

  // D3 렌더링
  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 500;
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    // 시뮬레이션
    const simulation = d3
      .forceSimulation(graphData.nodes as any)
      .force(
        "link",
        d3
          .forceLink(graphData.links as any)
          .id((d: any) => d.id)
          .distance(120)
      )
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => d.r + 10));

    // 링크
    const link = svg
      .append("g")
      .selectAll("line")
      .data(graphData.links)
      .enter()
      .append("line")
      .attr("stroke", "#334155")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.6);

    // 노드 그룹
    const node = svg
      .append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .enter()
      .append("g")
      .style("cursor", "pointer");

    // 노드 원
    node
      .append("circle")
      .attr("r", (d: any) => d.r)
      .attr("fill", (d: any) => TIER_COLORS[d.tier] || TIER_COLORS[3])
      .attr("fill-opacity", 0.8)
      .attr("stroke", (d: any) => TIER_COLORS[d.tier] || TIER_COLORS[3])
      .attr("stroke-width", 2);

    // 라벨
    const label = svg
      .append("g")
      .selectAll("text")
      .data(graphData.nodes)
      .enter()
      .append("text")
      .text((d: any) => d.label)
      .attr("font-size", 11)
      .attr("fill", "#94a3b8")
      .attr("text-anchor", "middle")
      .attr("dy", (d: any) => d.r + 16);

    // 시뮬레이션 업데이트
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);

      label.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);
    });

    // 드래그
    node.call(
      d3
        .drag()
        .on("start", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any
    );

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  return (
    <div className="space-y-6">
      <Card
        title="Relationship Map"
        subtitle="1-12-144 구조 시각화 · 드래그로 노드 이동"
      >
        <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-2">
          <svg ref={svgRef} className="w-full h-[500px]" />
        </div>
      </Card>

      {/* 범례 */}
      <Card title="범례">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-green-500" />
            <span className="text-sm">Tier 1 (핵심)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-blue-500" />
            <span className="text-sm">Tier 2 (중요)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-slate-500" />
            <span className="text-sm">Tier 3 (확장)</span>
          </div>
        </div>
        <div className="mt-4 text-xs text-slate-500">
          노드: {nodes?.length ?? 0}개 / 모션: {motions?.length ?? 0}개
        </div>
      </Card>

      {/* 노드 목록 */}
      <Card title="노드 목록">
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto scrollbar-thin">
          {nodes?.map((n) => (
            <div
              key={n.node_id}
              className="rounded-lg border border-slate-800 p-3"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: TIER_COLORS[n.tier ?? 3] }}
                />
                <span className="text-sm truncate">{n.label}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {n.kind} · T{n.tier ?? 3}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
