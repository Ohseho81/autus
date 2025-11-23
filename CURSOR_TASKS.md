# Cursor Development Tasks

**Total Estimate**: 6-10 hours

**Goal**: Automate repetitive, pattern-based work

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 CATEGORY 1: TEST CODE GENERATION (2-3h)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1.1 Protocol Integration Tests

### Memory OS Integration Tests

**File**: `tests/protocols/memory/test_memory_integration.py`

**Prompt**:

```
Create comprehensive integration tests for protocols/memory/memory_os.py:

- Test full workflow: initialize → store → search → export

- Test with 100+ preferences

- Test with 1000+ patterns

- Test concurrent access

- Test memory limits

- Test error recovery

- Use pytest fixtures for setup/teardown
```

### Identity Integration Tests

**File**: `tests/protocols/identity/test_identity_integration.py`

**Prompt**:

```
Create integration tests for Zero Identity protocol:

- Test IdentityCore → IdentitySurface → PatternTracker workflow

- Test surface evolution over 100+ patterns

- Test context-based representations

- Test export/import cycle

- Test memory integration

- Test workflow integration
```

### Auth Integration Tests

**File**: `tests/protocols/auth/test_auth_integration.py`

**Prompt**:

```
Create integration tests for Zero Auth protocol:

- Test QR code generation → scan → sync cycle

- Test multi-device sync (3+ devices)

- Test conflict resolution scenarios

- Test sync history tracking

- Test offline mode

- Test network failures
```

### Workflow Integration Tests

**File**: `tests/protocols/workflow/test_workflow_integration.py`

**Prompt**:

```
Create integration tests for Workflow Graph:

- Test complex DAG execution (10+ nodes)

- Test parallel execution

- Test error handling and recovery

- Test node dependencies

- Test validation edge cases
```

## 1.2 ARMP Risk Tests

### All Risk Tests

**File**: `tests/armp/test_all_risks.py`

**Prompt**:

```
Generate tests for ALL 30 ARMP risks in core/armp/:

- Test each risk's prevent() method

- Test each risk's detect() method

- Test each risk's respond() method

- Test each risk's recover() method

- Mock file system operations

- Mock network operations

- Use parametrized tests for efficiency
```

### ARMP Enforcer Tests

**File**: `tests/armp/test_enforcer_advanced.py`

**Prompt**:

```
Create advanced enforcer tests:

- Test registering 30 risks

- Test prevent_all() with all risks

- Test detect_violations() with multiple violations

- Test concurrent detection

- Test incident logging

- Test error handling for failed risks
```

### ARMP Monitor Tests

**File**: `tests/armp/test_monitor_advanced.py`

**Prompt**:

```
Create monitor tests:

- Test monitoring loop

- Test metric collection

- Test violation handling

- Test start/stop lifecycle

- Test thread safety

- Test long-running scenarios (simulate hours)
```

## 1.3 Performance Tests

### Benchmark Suite

**File**: `tests/performance/test_benchmarks.py`

**Prompt**:

```
Create benchmark tests using pytest-benchmark:

- Benchmark memory store operations (insert, query, search)

- Benchmark vector search (100, 1000, 10000 items)

- Benchmark identity evolution

- Benchmark workflow execution

- Benchmark QR generation/scanning

- Target: <100ms for basic ops, <1s for complex
```

### Load Tests

**File**: `tests/performance/test_load.py`

**Prompt**:

```
Create load tests:

- Test with 10,000 memory entries

- Test with 1,000 workflows

- Test with 100 concurrent identity evolutions

- Test with 50 simultaneous device syncs

- Measure memory usage

- Measure CPU usage

- Assert performance budgets
```

## 1.4 Edge Case Tests

### Edge Cases per Protocol

**Files**:

- `tests/protocols/memory/test_edge_cases.py`

- `tests/protocols/identity/test_edge_cases.py`

- `tests/protocols/auth/test_edge_cases.py`

- `tests/protocols/workflow/test_edge_cases.py`

**Prompt**:

```
For each protocol, create edge case tests:

- Empty inputs

- Null values

- Extremely large inputs (1MB+ strings)

- Special characters (unicode, emojis, control chars)

- Malformed data

- Concurrent modifications

- Resource exhaustion scenarios

- Network timeouts

- File system errors
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 CATEGORY 2: REFACTORING (2-3h)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2.1 Code Quality Improvements

### Remove Code Duplication

**Prompt**:

```
Analyze and refactor ALL files in core/ and protocols/:

- Find duplicated code blocks (3+ lines)

- Extract common patterns into utility functions

- Create base classes for similar patterns

- Move to core/utils/ or appropriate location

- Maintain backward compatibility

- Update all imports
```

### Add Type Hints

**Prompt**:

```
Add complete type hints to ALL Python files:

- Function arguments

- Return types

- Class attributes

- Use typing.* for complex types

- Add Optional, Union, List, Dict as needed

- Use from __future__ import annotations

- Run mypy to verify
```

### Improve Docstrings

**Prompt**:

```
Enhance ALL docstrings to Google style:

- Add detailed descriptions

- Document all parameters

- Document return values

- Add usage examples

- Include exceptions raised

- Add "See Also" sections

- Format consistently
```

### Error Handling

**Prompt**:

```
Improve error handling throughout codebase:

- Replace generic Exception with specific types

- Add custom exception classes in core/exceptions.py

- Add try-except blocks where missing

- Add proper error messages

- Add logging for errors

- Add error recovery hints
```

## 2.2 Specific Refactorings

### Pack Runner Refactoring

**File**: `core/pack/runner.py`

**Prompt**:

```
Refactor PackRunner:

- Extract validation logic into separate validator class

- Extract execution logic into executor class

- Remove code duplication in error handling

- Add builder pattern for pack configuration

- Improve type safety

- Add comprehensive logging
```

### Memory Store Refactoring

**File**: `protocols/memory/store.py`

**Prompt**:

```
Refactor MemoryStore:

- Extract query building into separate class

- Create query builder pattern

- Separate concerns: storage, validation, export

- Add connection pooling

- Improve transaction handling

- Add batch operations
```

### Identity Surface Refactoring

**File**: `protocols/identity/surface.py`

**Prompt**:

```
Refactor IdentitySurface:

- Extract evolution algorithms into strategies

- Add strategy pattern for different evolution types

- Separate visualization from logic

- Add builder for surface configuration

- Improve hash calculations
```

### ARMP Enforcer Refactoring

**File**: `core/armp/enforcer.py`

**Prompt**:

```
Refactor Enforcer:

- Add plugin system for risk registration

- Improve risk discovery (auto-load from directory)

- Add risk priority queue

- Implement observer pattern for incidents

- Add risk correlation detection

- Improve thread safety
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛠️ CATEGORY 3: BOILERPLATE CODE (1-2h)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 3.1 CLI Commands

### ARMP CLI Commands

**File**: `core/cli/armp_commands.py`

**Prompt**:

```
Create CLI commands for ARMP management:

- armp status - Show all risks and their status

- armp check - Run all risk detections

- armp prevent - Run all preventions

- armp monitor start/stop - Control monitor

- armp metrics - Show collected metrics

- armp incidents - List all incidents

- armp reset - Clear incident history

Use Click library, add help text, progress bars
```

### Protocol CLI Commands

**File**: `core/cli/protocol_commands.py`

**Prompt**:

```
Create CLI commands for protocols:

- protocol list - List all protocols and status

- protocol info <name> - Show protocol details

- protocol validate <name> - Validate protocol

- protocol export <name> - Export protocol data

- protocol import <name> <file> - Import data

Add rich formatting, tables, colors
```

### Memory CLI Commands

**File**: `core/cli/memory_commands.py`

**Prompt**:

```
Create CLI commands for memory:

- memory search <query> - Search memory

- memory stats - Show memory statistics

- memory export <file> - Export to YAML

- memory import <file> - Import from YAML

- memory clear - Clear all memory

- memory backup <file> - Create backup

Add confirmation prompts for destructive operations
```

## 3.2 Utility Functions

### File Utilities

**File**: `core/utils/file_utils.py`

**Prompt**:

```
Create comprehensive file utilities:

- safe_read(path) - Read with error handling

- safe_write(path, data) - Write with backup

- atomic_write(path, data) - Atomic file operations

- ensure_directory(path) - Create if not exists

- safe_delete(path) - Delete with confirmation

- calculate_checksum(path) - SHA256 checksum

- compress_file(path) - Compress with gzip

- decompress_file(path) - Decompress

Add proper error handling and logging
```

### JSON Utilities

**File**: `core/utils/json_utils.py`

**Prompt**:

```
Create JSON utilities:

- safe_load(path) - Load JSON with validation

- safe_dump(path, data) - Save JSON with formatting

- merge_json(dict1, dict2) - Deep merge

- validate_json(data, schema) - Schema validation

- minify_json(data) - Remove whitespace

- prettify_json(data) - Format for humans

Handle datetime, Path objects, custom encoders
```

### Hash Utilities

**File**: `core/utils/hash_utils.py`

**Prompt**:

```
Create hashing utilities:

- hash_string(s) - SHA256 hash

- hash_file(path) - File hash

- hash_object(obj) - Object hash (stable)

- generate_id() - UUID generation

- short_hash(s, length=8) - Shortened hash

- verify_hash(data, hash) - Verify integrity

Add salt support, different algorithms
```

### Logging Utilities

**File**: `core/utils/logging_utils.py`

**Prompt**:

```
Create logging utilities:

- setup_logging(level, file) - Configure logging

- get_logger(name) - Get configured logger

- log_performance(func) - Decorator for timing

- log_errors(func) - Decorator for error logging

- StructuredLogger - JSON logging

- add_context(**kwargs) - Add context to logs

Support rotating file handlers, colors
```

## 3.3 Helper Classes

### Configuration Manager

**File**: `core/config/manager.py`

**Prompt**:

```
Create configuration manager:

- Load from multiple sources (env, file, defaults)

- Merge configurations with priority

- Validate configuration schema

- Hot reload support

- Get/set with dot notation (config.get("db.host"))

- Environment variable expansion

- Secret management integration
```

### Cache Manager

**File**: `core/cache/manager.py`

**Prompt**:

```
Create simple cache manager:

- In-memory LRU cache

- File-based cache with TTL

- Cache decorators (@cached)

- Cache invalidation

- Cache statistics

- Thread-safe operations
```

### Event System

**File**: `core/events/system.py`

**Prompt**:

```
Create simple event system:

- Event emitter/listener pattern

- Subscribe/unsubscribe

- Event filtering

- Async event handling

- Event history

- Event replay
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 CATEGORY 4: DOCUMENTATION (1-2h)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 4.1 API Reference

### Auto-generate API Docs

**Files**: `docs/api/*.md`

**Prompt**:

```
Generate API reference documentation from docstrings:

- Use pdoc or sphinx to extract docstrings

- Create one .md file per module

- Include:

  - Module overview

  - All classes with methods

  - All functions

  - Usage examples

  - Type information

- Format in Markdown

- Add navigation links

Generate for: protocols/, core/armp/, core/pack/
```

## 4.2 Usage Examples

### Protocol Examples

**File**: `docs/examples/protocols.md`

**Prompt**:

```
Create comprehensive usage examples:

- Memory OS: store, search, export workflow

- Zero Identity: create, evolve, sync workflow

- Zero Auth: QR sync between devices

- Workflow Graph: complex workflow example

Include:

- Complete working code

- Expected output

- Common patterns

- Error handling

- Best practices
```

### ARMP Examples

**File**: `docs/examples/armp.md`

**Prompt**:

```
Create ARMP usage examples:

- Basic risk detection

- Custom risk creation

- Monitor setup

- Handling violations

- Integration with CI/CD

- Dashboard setup (if implemented)

Include complete code samples
```

### Pack Examples

**File**: `docs/examples/packs.md`

**Prompt**:

```
Create Pack system examples:

- Creating a custom pack

- Running packs

- Chaining packs

- Pack development workflow

- Testing packs

Include step-by-step tutorials
```

## 4.3 Guides

### Migration Guide

**File**: `docs/guides/migration.md`

**Prompt**:

```
Create migration guide:

- From v1.0 to v2.0

- Breaking changes

- Step-by-step migration

- Code examples (before/after)

- Common issues and solutions

- Deprecation timeline
```

### Troubleshooting Guide

**File**: `docs/guides/troubleshooting.md`

**Prompt**:

```
Create troubleshooting guide from:

- Common error messages

- Solutions for each error

- Performance issues

- Installation problems

- Integration issues

- FAQ format

Include code examples and screenshots
```

### Best Practices

**File**: `docs/guides/best_practices.md`

**Prompt**:

```
Create best practices guide:

- Protocol usage patterns

- Performance optimization

- Security considerations

- Testing strategies

- Production deployment

- Monitoring and observability

Include dos and don'ts
```

### Architecture Guide

**File**: `docs/guides/architecture.md`

**Prompt**:

```
Create architecture documentation:

- System overview diagram

- Component interactions

- Data flow diagrams

- Protocol layer architecture

- Extension points

- Design decisions

Use Mermaid for diagrams
```

## 4.4 Auto-generated Docs

### Changelog

**File**: `CHANGELOG.md`

**Prompt**:

```
Generate CHANGELOG.md from git commits:

- Group by version

- Categorize: Added, Changed, Fixed, Removed

- Include commit hashes

- Link to PRs (if any)

- Follow Keep a Changelog format

Parse git log since project start
```

### API Coverage Report

**File**: `docs/api_coverage.md`

**Prompt**:

```
Generate API coverage report:

- List all public classes and functions

- Check if documented (has docstring)

- Check if tested (has test file)

- Generate coverage percentage

- List undocumented/untested items

- Create TODO list
```

### Dependency Graph

**File**: `docs/dependency_graph.md`

**Prompt**:

```
Generate dependency documentation:

- List all Python dependencies

- Show version requirements

- Explain why each is needed

- Mark optional dependencies

- Show dependency tree

- Security advisories (if any)

Use pipdeptree or similar
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 PRIORITY MATRIX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HIGH Priority (Do First):

1. ✅ Protocol Integration Tests (1h)

2. ✅ ARMP Risk Tests (1h)

3. ✅ Add Type Hints (1h)

4. ✅ Error Handling (30m)

MEDIUM Priority (Do Second):

5. ✅ Remove Code Duplication (1h)

6. ✅ Improve Docstrings (30m)

7. ✅ Performance Tests (30m)

8. ✅ Auto-generate API Docs (30m)

9. ✅ Usage Examples (1h)

LOW Priority (Nice to Have):

10. ✅ CLI Commands (1h)

11. ✅ Utility Functions (1h)

12. ✅ Helper Classes (30m)

13. ✅ Guides (1h)

14. ✅ Edge Case Tests (30m)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ TIME ESTIMATES

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Category 1: Tests (2-3h)

├─ Protocol Integration: 1h

├─ ARMP Tests: 1h

├─ Performance Tests: 30m

└─ Edge Cases: 30m

Category 2: Refactoring (2-3h)

├─ Type Hints: 1h

├─ Duplication Removal: 1h

├─ Error Handling: 30m

└─ Specific Refactorings: 30m

Category 3: Boilerplate (1-2h)

├─ CLI Commands: 1h

├─ Utilities: 30m

└─ Helpers: 30m

Category 4: Documentation (1-2h)

├─ API Docs: 30m

├─ Examples: 1h

└─ Guides: 30m

TOTAL: 6-10 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 EXECUTION STRATEGY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Day 1: Tests (3h)

- Morning: Protocol integration tests

- Afternoon: ARMP risk tests

- Evening: Performance tests

## Day 2: Quality (3h)

- Morning: Add type hints everywhere

- Afternoon: Remove code duplication

- Evening: Improve error handling

## Day 3: Extensions (2h)

- Morning: CLI commands

- Afternoon: Utility functions

## Day 4: Documentation (2h)

- Morning: Auto-generate API docs

- Afternoon: Usage examples and guides

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ CHECKLIST

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tests:

□ Protocol integration tests

□ ARMP risk tests (all 30)

□ Performance benchmarks

□ Edge case tests

□ Load tests

Refactoring:

□ Type hints (all files)

□ Remove duplication

□ Improve docstrings

□ Better error handling

□ Specific refactorings

Boilerplate:

□ ARMP CLI commands

□ Protocol CLI commands

□ File utilities

□ JSON utilities

□ Hash utilities

□ Logging utilities

□ Config manager

□ Cache manager

□ Event system

Documentation:

□ API reference

□ Usage examples

□ Migration guide

□ Troubleshooting

□ Best practices

□ Architecture docs

□ Changelog

□ API coverage report

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Cursor for Scale"

Automate the repeatable,

Perfect the patterns.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
