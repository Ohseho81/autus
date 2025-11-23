# RFC 0002: Workflow Graph Protocol

Status: Proposed Standard
Version: 1.0.0
Published: 2024-11-23

## Abstract
Defines standard format for personal behavior patterns.

## 1. Purpose
Universal format for workflow patterns:
- Standardizes behavior representation
- Enables cross-platform compatibility
- Ensures data portability

## 2. Format
- Extension: .autus.graph.json
- Encoding: UTF-8
- Structure: JSON

## 3. Schema
nodes: [id, type, name, metadata]
edges: [source, target, type]

## 4. Examples
- Morning routines
- Code style patterns
- Work habits

## 5. Implementation
See: protocols/workflow.md
Reference: standard.py

---
Version: 1.0.0
