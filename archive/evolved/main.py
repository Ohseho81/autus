#!/usr/bin/env python3
"""
Docker Fix Main Module

A tool for diagnosing and fixing common Docker issues automatically.
"""

import argparse
import sys
import logging
from typing import List, Optional, Dict, Any
from pathlib import Path

from docker_fix.diagnostics import DockerDiagnostics
from docker_fix.fixes import DockerFixes
from docker_fix.utils import setup_logging, check_docker_installed


class DockerFixCLI:
    """Command-line interface for Docker Fix tool."""
    
    def __init__(self) -> None:
        """Initialize the CLI."""
        self.diagnostics = DockerDiagnostics()
        self.fixes = DockerFixes()
        self.logger = logging.getLogger(__name__)
    
    def create_parser(self) -> argparse.ArgumentParser:
        """
        Create and configure argument parser.
        
        Returns:
            Configured ArgumentParser instance
        """
        parser = argparse.ArgumentParser(
            description="Docker Fix - Diagnose and fix common Docker issues",
            formatter_class=argparse.RawDescriptionHelpFormatter
        )
        
        parser.add_argument(
            "--diagnose",
            action="store_true",
            help="Run diagnostics only without applying fixes"
        )
        
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Apply fixes for detected issues"
        )
        
        parser.add_argument(
            "--verbose", "-v",
            action="store_true",
            help="Enable verbose logging"
        )
        
        parser.add_argument(
            "--log-file",
            type=Path,
            help="Log file path (default: docker_fix.log)"
        )
        
        parser.add_argument(
            "--check",
            choices=["all", "daemon", "permissions", "network", "storage"],
            default="all",
            help="Specify which checks to run"
        )
        
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force apply fixes without confirmation"
        )
        
        return parser
    
    def run_diagnostics(self, check_type: str = "all") -> Dict[str, Any]:
        """
        Run diagnostic checks.
        
        Args:
            check_type: Type of checks to run
            
        Returns:
            Dictionary containing diagnostic results
            
        Raises:
            RuntimeError: If diagnostics fail
        """
        try:
            self.logger.info(f"Running diagnostics: {check_type}")
            
            results = {}
            
            if check_type in ["all", "daemon"]:
                results["daemon"] = self.diagnostics.check_daemon_status()
            
            if check_type in ["all", "permissions"]:
                results["permissions"] = self.diagnostics.check_permissions()
            
            if check_type in ["all", "network"]:
                results["network"] = self.diagnostics.check_network_issues()
            
            if check_type in ["all", "storage"]:
                results["storage"] = self.diagnostics.check_storage_issues()
            
            return results
            
        except Exception as e:
            self.logger.error(f"Diagnostics failed: {e}")
            raise RuntimeError(f"Failed to run diagnostics: {e}")
    
    def apply_fixes(self, issues: Dict[str, Any], force: bool = False) -> bool:
        """
        Apply fixes for detected issues.
        
        Args:
            issues: Dictionary of detected issues
            force: Whether to apply fixes without confirmation
            
        Returns:
            True if fixes were applied successfully
            
        Raises:
            RuntimeError: If fixes fail to apply
        """
        try:
            if not issues:
                self.logger.info("No issues detected, no fixes needed")
                return True
            
            self.logger.info("Applying fixes for detected issues")
            
            # Get list of fixes to apply
            fixes_to_apply = self.fixes.get_applicable_fixes(issues)
            
            if not fixes_to_apply:
                self.logger.info("No applicable fixes found")
                return True
            
            # Show fixes and ask for confirmation if not forced
            if not force:
                print("\nThe following fixes will be applied:")
                for fix in fixes_to_apply:
                    print(f"  - {fix['description']}")
                
                response = input("\nProceed with fixes? [y/N]: ").strip().lower()
                if response not in ['y', 'yes']:
                    self.logger.info("Fixes cancelled by user")
                    return False
            
            # Apply fixes
            success_count = 0
            for fix in fixes_to_apply:
                try:
                    if self.fixes.apply_fix(fix):
                        success_count += 1
                        self.logger.info(f"Successfully applied fix: {fix['name']}")
                    else:
                        self.logger.warning(f"Failed to apply fix: {fix['name']}")
                except Exception as e:
                    self.logger.error(f"Error applying fix {fix['name']}: {e}")
            
            self.logger.info(f"Applied {success_count}/{len(fixes_to_apply)} fixes")
            return success_count == len(fixes_to_apply)
            
        except Exception as e:
            self.logger.error(f"Failed to apply fixes: {e}")
            raise RuntimeError(f"Failed to apply fixes: {e}")
    
    def print_results(self, results: Dict[str, Any]) -> None:
        """
        Print diagnostic results in a user-friendly format.
        
        Args:
            results: Dictionary containing diagnostic results
        """
        print("\n" + "="*60)
        print("DOCKER DIAGNOSTICS RESULTS")
        print("="*60)
        
        for check_name, result in results.items():
            status = "✓ PASS" if result.get("status") == "ok" else "✗ FAIL"
            print(f"\n{check_name.upper()}: {status}")
            
            if result.get("message"):
                print(f"  {result['message']}")
            
            if result.get("issues"):
                print("  Issues found:")
                for issue in result["issues"]:
                    print(f"    - {issue}")
            
            if result.get("recommendations"):
                print("  Recommendations:")
                for rec in result["recommendations"]:
                    print(f"    - {rec}")
    
    def main(self, args: Optional[List[str]] = None) -> int:
        """
        Main entry point for the CLI.
        
        Args:
            args: Command line arguments (defaults to sys.argv)
            
        Returns:
            Exit code (0 for success, non-zero for failure)
        """
        parser = self.create_parser()
        parsed_args = parser.parse_args(args)
        
        try:
            # Setup logging
            setup_logging(
                verbose=parsed_args.verbose,
                log_file=parsed_args.log_file
            )
            
            self.logger.info("Docker Fix tool started")
            
            # Check if Docker is installed
            if not check_docker_installed():
                print("Error: Docker is not installed or not accessible")
                return 1
            
            # Default to diagnose if no action specified
            if not parsed_args.diagnose and not parsed_args.fix:
                parsed_args.diagnose = True
            
            # Run diagnostics
            results = self.run_diagnostics(parsed_args.check)
            
            if parsed_args.diagnose:
                self.print_results(results)
            
            # Apply fixes if requested
            if parsed_args.fix:
                # Extract issues from results
                issues = {}
                for check_name, result in results.items():
                    if result.get("status") != "ok":
                        issues[check_name] = result
                
                if self.apply_fixes(issues, parsed_args.force):
                    print("\n✓ Fixes applied successfully")
                else:
                    print("\n✗ Some fixes failed to apply")
                    return 1
            
            self.logger.info("Docker Fix tool completed successfully")
            return 0
            
        except KeyboardInterrupt:
            print("\nOperation cancelled by user")
            return 130
        except Exception as e:
            self.logger.error(f"Unexpected error: {e}")
            print(f"Error: {e}")
            return 1


def main() -> int:
    """Entry point for the docker-fix command."""
    cli = DockerFixCLI()
    return cli.main()


if __name__ == "__main__":
    sys.exit(main())
