#!/bin/bash
#
# Validation Script for Find a Fourth
# Run this after making changes to verify everything works.
# Exit code 0 = all passed, non-zero = failures found
#
# Usage:
#   ./scripts/validate.sh              # Full validation (requires deps installed)
#   ./scripts/validate.sh --quick      # Syntax checks only (no deps needed)
#   ./scripts/validate.sh --install    # Install deps first, then validate
#

set -e  # Exit on first error

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

# Parse arguments
QUICK_MODE=false
INSTALL_DEPS=false
for arg in "$@"; do
    case $arg in
        --quick|-q)
            QUICK_MODE=true
            ;;
        --install|-i)
            INSTALL_DEPS=true
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=()

print_header() {
    echo ""
    echo "=============================================="
    echo " $1"
    echo "=============================================="
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_failure() {
    echo -e "${RED}✗ $1${NC}"
    FAILURES+=("$1")
}

print_warning() {
    echo -e "${YELLOW}! $1${NC}"
}

# ============================================
# Backend Validation
# ============================================

validate_backend_syntax() {
    print_header "Backend: Python Syntax Check"
    cd "$BACKEND_DIR"

    if python3 -m py_compile server.py 2>&1; then
        print_success "server.py syntax valid"
    else
        print_failure "server.py has syntax errors"
        return 1
    fi

    # Check all Python files if backend is modularized
    if [ -d "routers" ]; then
        for f in routers/*.py models/*.py services/*.py utils/*.py; do
            if [ -f "$f" ]; then
                if python3 -m py_compile "$f" 2>&1; then
                    print_success "$f syntax valid"
                else
                    print_failure "$f has syntax errors"
                    return 1
                fi
            fi
        done
    fi
}

validate_backend_imports() {
    print_header "Backend: Import Check"
    cd "$BACKEND_DIR"

    # Try to import the main module
    if python3 -c "import server" 2>&1; then
        print_success "Backend imports successfully"
    else
        print_failure "Backend import failed"
        return 1
    fi
}

validate_backend_startup() {
    print_header "Backend: Startup Check"
    cd "$BACKEND_DIR"

    # Start server in background, wait for startup, then kill
    timeout 10 python3 -c "
import asyncio
from server import app
print('App created successfully')
" 2>&1

    if [ $? -eq 0 ]; then
        print_success "Backend app initializes"
    else
        print_failure "Backend failed to initialize"
        return 1
    fi
}

validate_backend_tests() {
    print_header "Backend: Tests"
    cd "$ROOT_DIR"

    if [ -d "tests" ] && [ -n "$(ls -A tests/*.py 2>/dev/null)" ]; then
        if python3 -m pytest tests/ -v --tb=short 2>&1; then
            print_success "Backend tests passed"
        else
            print_failure "Backend tests failed"
            return 1
        fi
    else
        print_warning "No backend tests found (skipping)"
    fi
}

# ============================================
# Frontend Validation
# ============================================

validate_frontend_deps() {
    print_header "Frontend: Dependencies Check"
    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ] || [ "$INSTALL_DEPS" = true ]; then
        echo "Installing dependencies..."
        # Use --legacy-peer-deps to handle peer dependency conflicts
        if npm install --legacy-peer-deps 2>&1; then
            print_success "Dependencies installed"
        else
            print_failure "Failed to install dependencies"
            return 1
        fi
    else
        print_success "Dependencies already installed"
    fi
}

install_backend_deps() {
    print_header "Backend: Dependencies Check"
    cd "$BACKEND_DIR"

    if [ -f "requirements.txt" ]; then
        echo "Installing Python dependencies..."
        if pip3 install -r requirements.txt -q 2>&1; then
            print_success "Python dependencies installed"
        else
            print_failure "Failed to install Python dependencies"
            return 1
        fi
    fi
}

validate_frontend_build() {
    print_header "Frontend: Build Check"
    cd "$FRONTEND_DIR"

    # Use CI=true to treat warnings as non-fatal
    if CI=true npm run build 2>&1; then
        print_success "Frontend builds successfully"
    else
        print_failure "Frontend build failed"
        return 1
    fi
}

validate_frontend_lint() {
    print_header "Frontend: Lint Check"
    cd "$FRONTEND_DIR"

    # Check if eslint is configured
    if [ -f ".eslintrc.js" ] || [ -f ".eslintrc.json" ] || [ -f "eslint.config.js" ]; then
        if npm run lint 2>&1 || npx eslint src/ --max-warnings=0 2>&1; then
            print_success "No lint errors"
        else
            print_warning "Lint warnings found (non-blocking)"
        fi
    else
        print_warning "ESLint not configured (skipping)"
    fi
}

validate_frontend_tests() {
    print_header "Frontend: Tests"
    cd "$FRONTEND_DIR"

    # Check if tests exist
    if find src -name "*.test.js" -o -name "*.test.tsx" 2>/dev/null | grep -q .; then
        if CI=true npm test -- --watchAll=false --passWithNoTests 2>&1; then
            print_success "Frontend tests passed"
        else
            print_failure "Frontend tests failed"
            return 1
        fi
    else
        print_warning "No frontend tests found (skipping)"
    fi
}

# ============================================
# Environment Validation
# ============================================

validate_env_vars() {
    print_header "Environment: Required Variables"

    # Check for .env.example and validate
    if [ -f "$BACKEND_DIR/.env.example" ]; then
        print_success ".env.example exists for backend"
    else
        print_warning "No .env.example for backend"
    fi

    if [ -f "$FRONTEND_DIR/.env.example" ]; then
        print_success ".env.example exists for frontend"
    else
        print_warning "No .env.example for frontend"
    fi
}

# ============================================
# Git Status
# ============================================

check_git_status() {
    print_header "Git: Status"
    cd "$ROOT_DIR"

    echo "Branch: $(git branch --show-current)"
    echo ""

    if [ -n "$(git status --porcelain)" ]; then
        echo "Uncommitted changes:"
        git status --short
    else
        print_success "Working directory clean"
    fi
}

# ============================================
# Summary
# ============================================

print_summary() {
    print_header "VALIDATION SUMMARY"

    if [ ${#FAILURES[@]} -eq 0 ]; then
        echo -e "${GREEN}"
        echo "  ╔═══════════════════════════════════════╗"
        echo "  ║     ALL VALIDATIONS PASSED            ║"
        echo "  ╚═══════════════════════════════════════╝"
        echo -e "${NC}"
        return 0
    else
        echo -e "${RED}"
        echo "  ╔═══════════════════════════════════════╗"
        echo "  ║     FAILURES DETECTED                 ║"
        echo "  ╚═══════════════════════════════════════╝"
        echo -e "${NC}"
        echo ""
        echo "Failed checks:"
        for failure in "${FAILURES[@]}"; do
            echo -e "  ${RED}✗ $failure${NC}"
        done
        echo ""
        echo "Please fix the above issues and run validation again."
        return 1
    fi
}

# ============================================
# Main Execution
# ============================================

main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║        FIND A FOURTH - VALIDATION SCRIPT                 ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    echo "Root directory: $ROOT_DIR"
    echo "Started at: $(date)"

    if [ "$QUICK_MODE" = true ]; then
        echo "Mode: QUICK (syntax checks only)"
    elif [ "$INSTALL_DEPS" = true ]; then
        echo "Mode: INSTALL (install deps + full validation)"
    else
        echo "Mode: FULL (requires deps pre-installed)"
    fi

    # Run all validations (continue on failure to collect all issues)
    set +e

    # Quick mode: syntax checks only
    if [ "$QUICK_MODE" = true ]; then
        validate_backend_syntax
        check_git_status
        print_summary
        exit $?
    fi

    # Install dependencies if requested
    if [ "$INSTALL_DEPS" = true ]; then
        install_backend_deps
        validate_frontend_deps
    fi

    # Backend checks
    validate_backend_syntax
    validate_backend_imports
    validate_backend_startup
    validate_backend_tests

    # Frontend checks (skip dep install if not in install mode)
    if [ "$INSTALL_DEPS" != true ]; then
        validate_frontend_deps
    fi
    validate_frontend_build
    validate_frontend_lint
    validate_frontend_tests

    # Environment checks
    validate_env_vars

    # Git status
    check_git_status

    # Print summary and exit with appropriate code
    print_summary
    exit $?
}

# Run main function
main "$@"
