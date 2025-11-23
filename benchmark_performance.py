#!/usr/bin/env python3
"""AUTUS Performance Benchmark"""
import time
from protocols.identity.core import IdentityCore
from standard import WorkflowGraph
from core.pack.loader import list_packs
import secrets

print("🚀 AUTUS 성능 벤치마크")
print("=" * 60)

# Identity Protocol
print("\n📊 Identity Protocol:")
start = time.time()
for _ in range(1000):
    identity = IdentityCore(secrets.token_bytes(32))
duration = time.time() - start
print(f"   1000 identities: {duration:.3f}s ({1000/duration:.0f} ops/sec)")

# Workflow Graph  
print("\n📊 Workflow Graph:")
start = time.time()
for _ in range(1000):
    nodes = [{'id': f'{i}', 'type': 'action'} for i in range(10)]
    edges = [{'source': f'{i}', 'target': f'{i+1}'} for i in range(9)]
    graph = WorkflowGraph(nodes, edges)
duration = time.time() - start
print(f"   1000 graphs: {duration:.3f}s ({1000/duration:.0f} ops/sec)")

# Pack Loading
print("\n📊 Pack System:")
start = time.time()
for _ in range(100):
    packs = list_packs()
duration = time.time() - start
print(f"   100 loads: {duration:.3f}s ({100/duration:.0f} ops/sec)")

print("\n✅ 벤치마크 완료!")
