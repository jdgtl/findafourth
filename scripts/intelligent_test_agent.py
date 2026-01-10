#!/usr/bin/env python3
"""
Intelligent Test Agent powered by Claude

This agent:
1. Analyzes git diff to find changed files
2. Uses Claude to determine which features are affected
3. Selects and runs relevant tests
4. Analyzes failures and can attempt fixes
5. Reports results
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Optional
from datetime import datetime

try:
    import anthropic
except ImportError:
    print("Installing anthropic package...")
    subprocess.run([sys.executable, "-m", "pip", "install", "anthropic"], check=True)
    import anthropic


# Feature to test file mapping
FEATURE_TEST_MAP = {
    "auth": {
        "e2e": ["e2e/auth.spec.js"],
        "unit": [],
        "files": ["pages/Login.js", "pages/Signup.js", "contexts/AuthContext.js"],
    },
    "profile": {
        "e2e": ["e2e/profile.spec.js"],
        "unit": ["__tests__/PTIHistoryChart.test.js"],
        "files": ["pages/Profile.js", "pages/CompleteProfile.js", "components/PTIHistoryChart.js"],
    },
    "clubs": {
        "e2e": ["e2e/clubs.spec.js"],
        "unit": [],
        "files": ["pages/ClubList.js", "pages/ClubDetail.js"],
    },
    "requests": {
        "e2e": ["e2e/requests.spec.js"],
        "unit": [],
        "files": ["pages/CreateRequest.js", "pages/RequestDetail.js", "pages/Home.js"],
    },
    "utils": {
        "e2e": [],
        "unit": ["__tests__/utils.test.js"],
        "files": ["lib/utils.js", "lib/api.js"],
    },
    "crews": {
        "e2e": [],
        "unit": [],
        "files": ["pages/Crews.js", "pages/CrewDetail.js", "pages/CreateCrew.js"],
    },
}


def get_git_diff(base_ref: str = "HEAD~1") -> str:
    """Get the git diff for changed files."""
    try:
        result = subprocess.run(
            ["git", "diff", "--name-only", base_ref],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        # Fallback: get staged files
        result = subprocess.run(
            ["git", "diff", "--name-only", "--cached"],
            capture_output=True,
            text=True,
        )
        return result.stdout.strip()


def get_file_diff(file_path: str, base_ref: str = "HEAD~1") -> str:
    """Get the actual diff content for a file."""
    try:
        result = subprocess.run(
            ["git", "diff", base_ref, "--", file_path],
            capture_output=True,
            text=True,
        )
        return result.stdout[:5000]  # Limit size
    except Exception:
        return ""


def determine_affected_features(changed_files: list[str]) -> list[str]:
    """Determine which features are affected by the changed files."""
    affected = set()

    for changed_file in changed_files:
        for feature, config in FEATURE_TEST_MAP.items():
            for pattern in config["files"]:
                if pattern in changed_file:
                    affected.add(feature)
                    break

    return list(affected)


def analyze_with_claude(
    client: anthropic.Anthropic,
    changed_files: list[str],
    diffs: dict[str, str],
    feature_map: dict,
) -> dict:
    """Use Claude to analyze changes and determine test strategy."""

    prompt = f"""You are an intelligent test agent. Analyze the following code changes and determine the optimal testing strategy.

## Changed Files:
{json.dumps(changed_files, indent=2)}

## Feature to Test Mapping:
{json.dumps(feature_map, indent=2)}

## File Diffs (summarized):
{json.dumps({k: v[:1000] for k, v in diffs.items()}, indent=2)}

Based on these changes, provide a JSON response with:
1. "affected_features": List of feature areas affected
2. "e2e_tests": List of E2E test files to run
3. "unit_tests": List of unit test files to run
4. "risk_level": "low", "medium", or "high" based on change impact
5. "test_priority": Ordered list of most important tests
6. "reasoning": Brief explanation of your analysis
7. "custom_scenarios": Any edge cases that should be manually tested

Respond ONLY with valid JSON, no markdown or explanation.
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        # Extract JSON from response if wrapped
        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        raise


def run_tests(test_type: str, test_files: list[str], frontend_dir: Path) -> dict:
    """Run specified tests and return results."""
    results = {"passed": [], "failed": [], "errors": []}

    if not test_files:
        return results

    os.chdir(frontend_dir)

    if test_type == "e2e":
        for test_file in test_files:
            try:
                result = subprocess.run(
                    ["npx", "playwright", "test", test_file, "--reporter=json"],
                    capture_output=True,
                    text=True,
                    timeout=300,
                )
                if result.returncode == 0:
                    results["passed"].append(test_file)
                else:
                    results["failed"].append({
                        "file": test_file,
                        "output": result.stdout[-2000:] if result.stdout else result.stderr[-2000:],
                    })
            except subprocess.TimeoutExpired:
                results["errors"].append({"file": test_file, "error": "Timeout"})
            except Exception as e:
                results["errors"].append({"file": test_file, "error": str(e)})

    elif test_type == "unit":
        for test_file in test_files:
            try:
                result = subprocess.run(
                    ["yarn", "test", "--watchAll=false", "--testPathPattern", test_file],
                    capture_output=True,
                    text=True,
                    timeout=120,
                )
                if result.returncode == 0:
                    results["passed"].append(test_file)
                else:
                    results["failed"].append({
                        "file": test_file,
                        "output": result.stdout[-2000:] if result.stdout else result.stderr[-2000:],
                    })
            except subprocess.TimeoutExpired:
                results["errors"].append({"file": test_file, "error": "Timeout"})
            except Exception as e:
                results["errors"].append({"file": test_file, "error": str(e)})

    return results


def analyze_failure_and_suggest_fix(
    client: anthropic.Anthropic,
    test_file: str,
    error_output: str,
    source_files: list[str],
) -> dict:
    """Use Claude to analyze test failure and suggest fixes."""

    prompt = f"""A test has failed. Analyze the failure and suggest a fix.

## Failed Test:
{test_file}

## Error Output:
{error_output}

## Related Source Files:
{json.dumps(source_files, indent=2)}

Provide a JSON response with:
1. "root_cause": What caused the failure
2. "fix_type": "test_fix" (test is wrong) or "code_fix" (code is wrong) or "both"
3. "suggested_fix": Description of how to fix
4. "confidence": 0-100 confidence in the diagnosis
5. "file_to_modify": Which file needs changes
6. "code_changes": Specific code changes if confidence > 80

Respond ONLY with valid JSON.
"""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        return json.loads(response.content[0].text)
    except json.JSONDecodeError:
        text = response.content[0].text
        start = text.find("{")
        end = text.rfind("}") + 1
        if start != -1 and end > start:
            return json.loads(text[start:end])
        return {"error": "Failed to parse response"}


def generate_report(
    analysis: dict,
    unit_results: dict,
    e2e_results: dict,
    failure_analysis: list[dict],
) -> str:
    """Generate a markdown report of the test run."""

    report = f"""# Intelligent Test Agent Report
Generated: {datetime.now().isoformat()}

## Analysis Summary
- **Risk Level**: {analysis.get('risk_level', 'unknown')}
- **Affected Features**: {', '.join(analysis.get('affected_features', []))}

### Reasoning
{analysis.get('reasoning', 'N/A')}

## Test Results

### Unit Tests
- Passed: {len(unit_results['passed'])}
- Failed: {len(unit_results['failed'])}
- Errors: {len(unit_results['errors'])}

### E2E Tests
- Passed: {len(e2e_results['passed'])}
- Failed: {len(e2e_results['failed'])}
- Errors: {len(e2e_results['errors'])}

"""

    if failure_analysis:
        report += "## Failure Analysis\n\n"
        for fa in failure_analysis:
            report += f"""### {fa.get('test_file', 'Unknown')}
- **Root Cause**: {fa.get('root_cause', 'Unknown')}
- **Fix Type**: {fa.get('fix_type', 'Unknown')}
- **Confidence**: {fa.get('confidence', 0)}%
- **Suggested Fix**: {fa.get('suggested_fix', 'N/A')}

"""

    if analysis.get("custom_scenarios"):
        report += "## Manual Testing Recommended\n\n"
        for scenario in analysis["custom_scenarios"]:
            report += f"- {scenario}\n"

    return report


def main():
    parser = argparse.ArgumentParser(description="Intelligent Test Agent")
    parser.add_argument("--base-ref", default="HEAD~1", help="Git ref to compare against")
    parser.add_argument("--fix", action="store_true", help="Attempt to fix failures")
    parser.add_argument("--max-retries", type=int, default=3, help="Max fix attempts")
    parser.add_argument("--skip-e2e", action="store_true", help="Skip E2E tests")
    parser.add_argument("--skip-unit", action="store_true", help="Skip unit tests")
    parser.add_argument("--output", default="test-report.md", help="Report output file")
    args = parser.parse_args()

    # Get API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("Error: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    # Determine project paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    frontend_dir = project_root / "frontend"

    # Get changed files
    print("🔍 Analyzing git changes...")
    changed_files_str = get_git_diff(args.base_ref)
    if not changed_files_str:
        print("No changes detected. Exiting.")
        sys.exit(0)

    changed_files = changed_files_str.split("\n")
    print(f"Found {len(changed_files)} changed files")

    # Get diffs for analysis
    diffs = {}
    for f in changed_files[:10]:  # Limit to first 10 files
        diffs[f] = get_file_diff(f, args.base_ref)

    # Analyze with Claude
    print("🤖 Analyzing changes with Claude...")
    try:
        analysis = analyze_with_claude(client, changed_files, diffs, FEATURE_TEST_MAP)
        print(f"Risk level: {analysis.get('risk_level', 'unknown')}")
        print(f"Affected features: {analysis.get('affected_features', [])}")
    except Exception as e:
        print(f"Claude analysis failed: {e}")
        # Fallback to rule-based analysis
        affected = determine_affected_features(changed_files)
        analysis = {
            "affected_features": affected,
            "e2e_tests": [],
            "unit_tests": [],
            "risk_level": "medium",
            "reasoning": "Fallback analysis based on file patterns",
        }
        for feature in affected:
            config = FEATURE_TEST_MAP.get(feature, {})
            analysis["e2e_tests"].extend(config.get("e2e", []))
            analysis["unit_tests"].extend(config.get("unit", []))

    # Run tests
    unit_results = {"passed": [], "failed": [], "errors": []}
    e2e_results = {"passed": [], "failed": [], "errors": []}
    failure_analysis = []

    if not args.skip_unit and analysis.get("unit_tests"):
        print(f"\n🧪 Running {len(analysis['unit_tests'])} unit tests...")
        unit_results = run_tests("unit", analysis["unit_tests"], frontend_dir)
        print(f"Unit tests: {len(unit_results['passed'])} passed, {len(unit_results['failed'])} failed")

    if not args.skip_e2e and analysis.get("e2e_tests"):
        print(f"\n🎭 Running {len(analysis['e2e_tests'])} E2E tests...")
        e2e_results = run_tests("e2e", analysis["e2e_tests"], frontend_dir)
        print(f"E2E tests: {len(e2e_results['passed'])} passed, {len(e2e_results['failed'])} failed")

    # Analyze failures
    all_failures = unit_results["failed"] + e2e_results["failed"]
    if all_failures:
        print(f"\n🔬 Analyzing {len(all_failures)} failures...")
        for failure in all_failures[:5]:  # Limit analysis
            try:
                fa = analyze_failure_and_suggest_fix(
                    client,
                    failure["file"],
                    failure.get("output", ""),
                    changed_files,
                )
                fa["test_file"] = failure["file"]
                failure_analysis.append(fa)
            except Exception as e:
                print(f"Failed to analyze {failure['file']}: {e}")

    # Generate report
    print("\n📝 Generating report...")
    report = generate_report(analysis, unit_results, e2e_results, failure_analysis)

    report_path = project_root / args.output
    with open(report_path, "w") as f:
        f.write(report)
    print(f"Report saved to {report_path}")

    # Exit with appropriate code
    total_failures = len(unit_results["failed"]) + len(e2e_results["failed"])
    total_errors = len(unit_results["errors"]) + len(e2e_results["errors"])

    if total_failures > 0 or total_errors > 0:
        print(f"\n❌ Tests failed: {total_failures} failures, {total_errors} errors")
        sys.exit(1)
    else:
        print("\n✅ All tests passed!")
        sys.exit(0)


if __name__ == "__main__":
    main()
