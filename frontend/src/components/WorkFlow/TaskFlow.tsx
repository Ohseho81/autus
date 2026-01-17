/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Task Flow (React Flow)
 * 노드 생성, 연결, 드래그 앤 드롭 일체화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeProps,
  Handle,
  Position,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useNodeStore, NodeData } from '../../stores/nodeStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Custom Node Types
// ═══════════════════════════════════════════════════════════════════════════════

interface TaskNodeData {
  nodeData: NodeData;
  onEliminate: () => void;
  onMerge: (targetId: string) => void;
}

function TaskNode({ data, selected }: NodeProps<TaskNodeData>) {
  const { nodeData, onEliminate } = data;
  const isEliminationCandidate = nodeData.automationLevel >= 0.95;
  const isHighRisk = nodeData.k < 0.8;
  
  const borderColor = isEliminationCandidate 
    ? 'border-red-500' 
    : isHighRisk 
    ? 'border-orange-500'
    : selected 
    ? 'border-cyan-500' 
    : 'border-slate-600';
  
  return (
    <motion.div
      className={`bg-slate-800 rounded-lg border-2 ${borderColor} p-3 min-w-[180px] shadow-lg`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-cyan-500" />
      
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-white font-bold text-sm">{nodeData.code}</div>
          <div className="text-slate-400 text-xs">{nodeData.name}</div>
        </div>
        {isEliminationCandidate && (
          <motion.div
            className="w-2 h-2 bg-red-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </div>
      
      {/* KIR Bars */}
      <div className="space-y-1.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-3">K</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${(nodeData.k / 2) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-green-400 w-8 text-right">{nodeData.k.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-3">I</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${((nodeData.i + 1) / 2) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-blue-400 w-8 text-right">{nodeData.i.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 w-3">A</span>
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-purple-500"
              initial={{ width: 0 }}
              animate={{ width: `${nodeData.automationLevel * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-purple-400 w-8 text-right">{(nodeData.automationLevel * 100).toFixed(0)}%</span>
        </div>
      </div>
      
      {/* Actions */}
      {isEliminationCandidate && (
        <button
          onClick={onEliminate}
          className="w-full py-1 bg-red-600 hover:bg-red-700 rounded text-white text-xs transition-colors"
        >
          🗑️ 삭제 (자동화 완료)
        </button>
      )}
      
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </motion.div>
  );
}

// Merge Node (드롭 타겟)
function MergeNode({ data, selected }: NodeProps<{ label: string }>) {
  return (
    <motion.div
      className={`bg-purple-900/50 rounded-xl border-2 border-dashed ${selected ? 'border-purple-400' : 'border-purple-600'} p-4 min-w-[120px] text-center`}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-500" />
      <div className="text-purple-300 text-sm">🌀 {data.label}</div>
      <div className="text-purple-400 text-xs mt-1">드래그하여 병합</div>
    </motion.div>
  );
}

const nodeTypes = {
  task: TaskNode,
  merge: MergeNode,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function TaskFlow() {
  const storeNodes = useNodeStore(state => state.nodes);
  const eliminateNode = useNodeStore(state => state.eliminateNode);
  const mergeNodes = useNodeStore(state => state.mergeNodes);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  
  // Convert store nodes to ReactFlow nodes
  const initialNodes: Node[] = useMemo(() => {
    const activeNodes = Object.values(storeNodes).filter(n => n.status === 'active');
    
    // 도메인별 그룹핑
    const domains = [...new Set(activeNodes.map(n => n.domain))];
    
    const flowNodes: Node[] = [];
    
    domains.forEach((domain, domainIdx) => {
      const domainNodes = activeNodes.filter(n => n.domain === domain);
      
      domainNodes.forEach((node, nodeIdx) => {
        flowNodes.push({
          id: node.id,
          type: 'task',
          position: { 
            x: domainIdx * 250, 
            y: nodeIdx * 160 
          },
          data: {
            nodeData: node,
            onEliminate: () => eliminateNode(node.id),
            onMerge: (targetId: string) => mergeNodes([node.id], targetId),
          },
        });
      });
    });
    
    // Merge target node
    flowNodes.push({
      id: 'merge-target',
      type: 'merge',
      position: { x: domains.length * 250 / 2 - 60, y: -100 },
      data: { label: '병합 타겟' },
    });
    
    return flowNodes;
  }, [storeNodes, eliminateNode, mergeNodes]);
  
  // Convert connections to edges
  const initialEdges: Edge[] = useMemo(() => {
    const connections = useNodeStore.getState().connections;
    return connections
      .filter(conn => 
        storeNodes[conn.source]?.status === 'active' && 
        storeNodes[conn.target]?.status === 'active'
      )
      .map(conn => ({
        id: conn.id,
        source: conn.source,
        target: conn.target,
        animated: conn.type === 'flow',
        style: { 
          stroke: conn.type === 'merge' ? '#ef4444' : '#64748b',
          strokeWidth: conn.strength * 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: conn.type === 'merge' ? '#ef4444' : '#64748b',
        },
      }));
  }, [storeNodes]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#22d3ee' },
    }, eds)),
    [setEdges]
  );
  
  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodes(nodes.map(n => n.id));
  }, []);
  
  // Merge selected nodes
  const handleMergeSelected = useCallback(() => {
    if (selectedNodes.length < 2) return;
    
    const targetId = selectedNodes[0];
    const sourceIds = selectedNodes.slice(1);
    
    mergeNodes(sourceIds, targetId);
    
    // Remove merged nodes from flow
    setNodes(nds => nds.filter(n => !sourceIds.includes(n.id)));
    setSelectedNodes([]);
  }, [selectedNodes, mergeNodes, setNodes]);
  
  return (
    <div className="w-full h-full bg-slate-900">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-slate-900"
        selectNodesOnDrag={true}
        selectionOnDrag={true}
      >
        <Background color="#334155" gap={20} />
        <Controls className="!bg-slate-800 !border-slate-700" />
        <MiniMap 
          className="!bg-slate-800 !border-slate-700"
          nodeColor={(node) => {
            const data = node.data as TaskNodeData;
            if (!data?.nodeData) return '#64748b';
            if (data.nodeData.automationLevel >= 0.95) return '#ef4444';
            if (data.nodeData.k < 0.8) return '#f59e0b';
            return '#22d3ee';
          }}
        />
      </ReactFlow>
      
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 rounded-lg p-3 border border-slate-700 flex gap-3">
        <button
          onClick={handleMergeSelected}
          disabled={selectedNodes.length < 2}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded text-white text-sm transition-colors"
        >
          🔗 선택 노드 병합 ({selectedNodes.length})
        </button>
        <button
          onClick={() => {
            const candidates = Object.values(storeNodes).filter(n => n.automationLevel >= 0.95);
            candidates.forEach(n => eliminateNode(n.id));
            setNodes(nds => nds.filter(n => !candidates.some(c => c.id === n.id)));
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-sm transition-colors"
        >
          🗑️ 자동화 완료 일괄 삭제
        </button>
      </div>
      
      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-3 border border-slate-700 text-xs text-slate-400">
        <div>🖱️ 드래그: 노드 이동</div>
        <div>⌘/Ctrl + 클릭: 다중 선택</div>
        <div>🔗 연결: 핸들 드래그</div>
      </div>
    </div>
  );
}

export default TaskFlow;
