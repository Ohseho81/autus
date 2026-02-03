# Direct Agent Command

## Variables
AGENT_AND_TASK: $ARGUMENTS

## Instructions
Parse first word = agent, rest = task:
- chrome <task> → Chrome agent instructions
- cowork <task> → Cowork instructions
- moltbot <task> → 몰트봇 action
- web <task> → claude.ai action
- code / cc <task> → Execute directly (that's me)

For other agents, output clear instructions for user to follow in that tool.
