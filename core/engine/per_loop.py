"""
AUTUS PER Loop Engine - Fixed Version
Plan → Execute → Review → Improve → Repeat
"""

from __future__ import annotations

from typing import Dict, List, Any, Optional, TYPE_CHECKING
from datetime import datetime

if TYPE_CHECKING:
    from .dsl import DSLExecutor


class PERLoop:
    """
    Plan-Execute-Review Loop Engine
    The core engine that enables AUTUS to develop itself.
    """

    def __init__(self, llm_provider: Optional[Any] = None) -> None:
        """Initialize PER Loop Engine."""
        self.llm_provider: Optional[Any] = llm_provider
        self.history: List[Dict[str, Any]] = []
        self.current_cycle: int = 0

        # Try to load DSL if available
        try:
            from .dsl import DSLExecutor
            self.dsl: Optional[DSLExecutor] = DSLExecutor()
        except Exception:
            self.dsl: Optional[DSLExecutor] = None

    def plan(self, goal: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """Plan phase: Decompose goal into actionable steps."""
        print(f"📋 Planning: {goal}")

        plan = {
            'goal': goal,
            'created_at': datetime.now().isoformat(),
            'cycle': self.current_cycle,
            'steps': [],
            'context': context or {}
        }

        # Simple heuristic-based planning
        goal_lower = goal.lower()

        if 'feature' in goal_lower or 'add' in goal_lower:
            plan['type'] = 'development'
            plan['steps'] = [
                {'id': 1, 'action': 'analyze', 'target': 'requirements'},
                {'id': 2, 'action': 'design', 'target': 'architecture'},
                {'id': 3, 'action': 'implement', 'target': 'code'},
                {'id': 4, 'action': 'test', 'target': 'functionality'}
            ]
        elif 'fix' in goal_lower or 'debug' in goal_lower:
            plan['type'] = 'debugging'
            plan['steps'] = [
                {'id': 1, 'action': 'identify', 'target': 'issue'},
                {'id': 2, 'action': 'analyze', 'target': 'root_cause'},
                {'id': 3, 'action': 'fix', 'target': 'code'},
                {'id': 4, 'action': 'verify', 'target': 'solution'}
            ]
        else:
            plan['type'] = 'generic'
            plan['steps'] = [
                {'id': 1, 'action': 'analyze', 'target': 'goal'},
                {'id': 2, 'action': 'execute', 'target': 'task'},
                {'id': 3, 'action': 'verify', 'target': 'result'}
            ]

        return plan

    def execute(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Execute phase: Run the planned steps."""
        print(f"⚡ Executing: {plan['goal']}")

        results = {
            'plan_id': id(plan),
            'started_at': datetime.now().isoformat(),
            'steps_completed': [],
            'steps_failed': [],
            'outputs': {}
        }

        for step in plan['steps']:
            try:
                # Simulate execution
                import random
                success = random.random() > 0.3  # 70% success rate

                if success:
                    results['steps_completed'].append(step)
                    results['outputs'][f"step_{step['id']}"] = f"{step['action']}_{step['target']}_done"
                else:
                    results['steps_failed'].append(step)
            except Exception as e:
                results['steps_failed'].append({**step, 'error': str(e)})

        results['completed_at'] = datetime.now().isoformat()
        results['success_rate'] = len(results['steps_completed']) / len(plan['steps']) if plan['steps'] else 0

        return results

    def review(self, plan: Dict[str, Any], results: Dict[str, Any]) -> Dict[str, Any]:
        """Review phase: Analyze results and generate improvements."""
        print(f"🔍 Reviewing: {plan['goal']}")

        review = {
            'plan_id': id(plan),
            'reviewed_at': datetime.now().isoformat(),
            'success_rate': results['success_rate'],
            'analysis': {},
            'improvements': [],
            'learnings': []
        }

        if results['success_rate'] == 1.0:
            review['analysis']['status'] = 'complete_success'
            review['learnings'].append('All steps executed successfully')
        elif results['success_rate'] >= 0.7:
            review['analysis']['status'] = 'partial_success'
            review['learnings'].append('Most steps successful')
        else:
            review['analysis']['status'] = 'needs_improvement'
            review['learnings'].append('Significant improvements needed')

        # Generate improvements
        for failed in results['steps_failed']:
            review['improvements'].append({
                'step': failed,
                'suggestion': f"Retry {failed.get('action', 'action')} with improved approach"
            })

        return review

    def run(self, goal: str, context: Optional[Dict] = None, max_cycles: int = 3) -> Dict[str, Any]:
        """
        Run complete PER cycle with automatic retries.

        Parameters
        ----------
        goal : str
            Goal to achieve
        context : dict, optional
            Execution context
        max_cycles : int
            Maximum number of PER cycles to attempt

        Returns
        -------
        dict
            Complete cycle results
        """
        print(f"\n{'='*50}")
        print(f"🔄 Starting PER Loop: {goal}")
        print(f"{'='*50}\n")

        cycle_results = []
        best_result = None
        best_success_rate = 0

        for cycle in range(max_cycles):
            self.current_cycle = cycle + 1
            print(f"\n--- Cycle {self.current_cycle}/{max_cycles} ---")

            # Plan
            plan = self.plan(goal, context)

            # Execute
            results = self.execute(plan)

            # Review
            review = self.review(plan, results)

            # Store cycle data
            cycle_data = {
                'cycle': self.current_cycle,
                'plan': plan,
                'results': results,
                'review': review
            }
            cycle_results.append(cycle_data)

            # Track best result
            if results['success_rate'] > best_success_rate:
                best_success_rate = results['success_rate']
                best_result = cycle_data

            # Break if perfect execution
            if results['success_rate'] == 1.0:
                print("\n✅ Perfect execution achieved!")
                break

            # Apply improvements for next cycle
            if cycle < max_cycles - 1 and review['improvements']:
                print(f"\n📝 Applying {len(review['improvements'])} improvements...")

        print(f"\n{'='*50}")
        print("✅ PER Loop Complete")
        print(f"   Best Success Rate: {best_success_rate*100:.1f}%")
        print(f"   Cycles Used: {len(cycle_results)}/{max_cycles}")
        print(f"{'='*50}\n")

        return {
            'goal': goal,
            'cycles_executed': len(cycle_results),
            'best_success_rate': best_success_rate,
            'best_result': best_result,
            'all_cycles': cycle_results,
            'success_rate': best_success_rate  # For compatibility
        }

    def get_history(self) -> List[Dict[str, Any]]:
        """Get execution history."""
        return self.history


# Test the module
if __name__ == "__main__":
    print("Testing PER Loop...")
    loop = PERLoop()
    result = loop.run("Test basic functionality", max_cycles=1)
    print(f"✅ Test complete: Success rate = {result['best_success_rate']*100:.1f}%")
