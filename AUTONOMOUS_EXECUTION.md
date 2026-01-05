# Autonomous Execution Instructions

## Overview

This document provides instructions for Claude Code to autonomously implement all phases from `IMPLEMENTATION_PLAN.md` with minimal human interaction.

**Goal:** Complete all 6 phases, validate after each change, self-fix any issues, and commit only when all validations pass.

---

## Execution Protocol

### Before Starting Each Task

1. Read the current task from `IMPLEMENTATION_PLAN.md`
2. Understand what files need to be modified
3. Read those files before making changes

### After Each File Change

1. Run the validation script:
   ```bash
   ./scripts/validate.sh
   ```

2. If validation **FAILS**:
   - Read the error output carefully
   - Fix the issue in the relevant file
   - Run validation again
   - Repeat until validation passes

3. If validation **PASSES**:
   - Continue to the next task

### After Completing Each Phase

1. Run full validation: `./scripts/validate.sh`
2. If all checks pass:
   - Commit all changes with a descriptive message
   - Update the todo list to mark phase complete
   - Continue to next phase
3. If checks fail:
   - Fix all issues before committing
   - Do not proceed to next phase until current phase validates

---

## Phase Execution Order

Execute phases in this exact order:

```
Phase 1: Critical Security & Dependencies
    ↓ (validate & commit)
Phase 2: Error Handling & User Experience
    ↓ (validate & commit)
Phase 3: Performance Optimization
    ↓ (validate & commit)
Phase 4: Code Quality & Architecture
    ↓ (validate & commit)
Phase 5: Security Hardening
    ↓ (validate & commit)
Phase 6: Testing Foundation
    ↓ (validate & commit)
DONE: Push all changes
```

---

## Commit Guidelines

### Commit Message Format

```
Phase X.Y: Brief description of changes

- Bullet point of specific change 1
- Bullet point of specific change 2
```

### Example Commits

```
Phase 1.1: Remove hardcoded JWT secret fallback

- Require JWT_SECRET environment variable
- Add startup validation for required env vars
- App now fails fast if JWT_SECRET not set
```

```
Phase 3.1: Fix N+1 queries in list_crews endpoint

- Replace loop queries with MongoDB aggregation pipeline
- Reduce database calls from N+2 to 1
```

---

## Self-Fix Protocol

When encountering errors, follow this decision tree:

```
Error Type: Syntax Error
→ Read the file with the error
→ Find the exact line mentioned
→ Fix the syntax issue
→ Validate again

Error Type: Import Error
→ Check if module/file exists
→ Check for typos in import path
→ Check if dependency is installed
→ Fix and validate again

Error Type: Build Error (Frontend)
→ Read the full error message
→ Common causes:
   - Missing imports
   - JSX syntax errors
   - Undefined variables
→ Fix the component and validate again

Error Type: Test Failure
→ Read the test output
→ Determine if test is wrong or implementation is wrong
→ Fix the appropriate file
→ Validate again

Error Type: Runtime Error
→ Check the stack trace
→ Find the originating file/line
→ Fix the logic error
→ Validate again
```

---

## Task Checklist Format

Use the TodoWrite tool to track progress. Format:

```
Phase 1: Critical Security & Dependencies
├── [x] 1.1.1 Remove hardcoded JWT secret
├── [x] 1.1.2 Sanitize regex input
├── [ ] 1.1.3 Lock down CORS (in progress)
├── [ ] 1.1.4 Add input validation
└── [ ] 1.2.1 Add missing dependencies
```

---

## Validation Checkpoints

### Checkpoint 1: After Phase 1
```bash
./scripts/validate.sh
# Expected: All syntax checks pass, backend starts without JWT_SECRET error
```

### Checkpoint 2: After Phase 2
```bash
./scripts/validate.sh
# Expected: Frontend builds, no console.error without user feedback
```

### Checkpoint 3: After Phase 3
```bash
./scripts/validate.sh
# Expected: All performance fixes in place, no new errors
```

### Checkpoint 4: After Phase 4
```bash
./scripts/validate.sh
# Expected: Backend modularized, all imports work, frontend components split
```

### Checkpoint 5: After Phase 5
```bash
./scripts/validate.sh
# Expected: Security middleware in place, rate limiting works
```

### Checkpoint 6: After Phase 6
```bash
./scripts/validate.sh
# Expected: All tests pass, coverage report generated
```

---

## Final Validation

After all phases complete:

```bash
# 1. Run full validation
./scripts/validate.sh

# 2. Check git status
git status

# 3. Ensure all changes committed
git log --oneline -10

# 4. Push to remote
git push -u origin claude/analyze-codebase-jKZ8D
```

---

## Human Interaction Points

Human review is only needed at:

1. **Start**: Approve this plan
2. **End**: Review final PR with all changes

No human interaction needed during execution.

---

## Error Recovery

If stuck in a loop (same error 3+ times):

1. Document the error and attempted fixes
2. Skip the problematic task temporarily
3. Continue with other tasks in the phase
4. Return to problematic task after other context is in place
5. If still stuck, mark as "needs human review" and continue

---

## Quick Reference Commands

```bash
# Quick validation (syntax only, no deps needed)
./scripts/validate.sh --quick

# Full validation with dependency installation
./scripts/validate.sh --install

# Full validation (deps must be pre-installed)
./scripts/validate.sh

# Backend only - quick syntax check
python3 -m py_compile backend/server.py

# Frontend only - quick build check
cd frontend && npm run build

# Run backend tests
python3 -m pytest tests/ -v

# Run frontend tests
cd frontend && npm test -- --watchAll=false

# Check current git status
git status

# Commit current phase
git add -A && git commit -m "Phase X: Description"

# Push changes
git push -u origin claude/analyze-codebase-jKZ8D
```

## Validation Modes

| Mode | Command | When to Use |
|------|---------|-------------|
| Quick | `./scripts/validate.sh --quick` | After code changes, before full validation |
| Install | `./scripts/validate.sh --install` | First run, or after dependency changes |
| Full | `./scripts/validate.sh` | When deps are already installed |

---

## Start Command

To begin autonomous execution, use this prompt:

```
Execute all phases from IMPLEMENTATION_PLAN.md following the protocol in AUTONOMOUS_EXECUTION.md.

For each task:
1. Make the required changes
2. Run ./scripts/validate.sh
3. If validation fails, fix issues and re-validate
4. Continue until all phases complete and validate

Commit after each phase with descriptive messages.
Push to remote when all phases are done.

Do not ask for human input unless completely blocked.
```
