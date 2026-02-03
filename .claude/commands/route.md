# Route Task

## Variables
TASK_DESCRIPTION: $ARGUMENTS

## Instructions
Analyze the following task and determine the optimal 6-agent chain.

Task: "$TASK_DESCRIPTION"

Use the AUTUS Task Router:
1. Extract signals (location, type, needs, output)
2. Score each agent (Trigger×0.3 + Capability×0.5 + Constraint×0.2)
3. Build chain (Entry → Primary → Support → Auto-add)

Output:
```
📍 Chain: [emoji] Agent(role) → [emoji] Agent(role) → ...
📋 Plan:
  1. [Primary action]
  2. [Support action]
  3. [Verify/Notify]
🔍 Signal: location=X, type=Y, needs=[...], output=[...]
```

If I (Claude Code) am Primary → proceed with execution.
If another agent is Primary → explain what to do and where.
