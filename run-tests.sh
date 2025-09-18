#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 ServicesDashboard Test Runner${NC}"
echo "=========================================="

# Function to run tests with proper filtering
run_unit_tests() {
    echo -e "${BLUE}📋 Running Unit Tests (excluding Integration tests)...${NC}"
    
    dotnet test \
        --configuration Release \
        --filter "FullyQualifiedName!~Integration" \
        --logger "console;verbosity=detailed" \
        --collect:"XPlat Code Coverage" \
        --results-directory ./TestResults
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ All unit tests passed!${NC}"
    else
        echo -e "${RED}❌ Some unit tests failed. Exit code: $exit_code${NC}"
    fi
    
    return $exit_code
}

# Function to run integration tests (optional, may fail)
run_integration_tests() {
    echo -e "${YELLOW}⚠️  Running Integration Tests (may fail due to configuration)...${NC}"
    
    dotnet test \
        --configuration Release \
        --filter "FullyQualifiedName~Integration" \
        --logger "console;verbosity=detailed" \
        --results-directory ./IntegrationTestResults || true
        
    echo -e "${YELLOW}ℹ️  Integration test failures are expected and don't affect the build${NC}"
}

# Function to show test coverage
show_coverage() {
    if [ -d "./TestResults" ]; then
        echo -e "${BLUE}📊 Test Coverage Information:${NC}"
        find ./TestResults -name "coverage.cobertura.xml" -exec echo "Coverage report: {}" \;
    fi
}

# Main execution
main() {
    echo -e "${BLUE}🔧 Restoring packages...${NC}"
    dotnet restore
    
    echo -e "${BLUE}🏗️  Building solution...${NC}"
    dotnet build --no-restore --configuration Release
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build failed!${NC}"
        exit 1
    fi
    
    # Run unit tests (required)
    run_unit_tests
    local unit_test_result=$?
    
    # Run integration tests (optional)
    if [ "$1" == "--include-integration" ]; then
        run_integration_tests
    fi
    
    # Show coverage info
    show_coverage
    
    # Summary
    echo "=========================================="
    if [ $unit_test_result -eq 0 ]; then
        echo -e "${GREEN}🎉 Build and Unit Tests Successful!${NC}"
        
        # Count tests
        if command -v grep &> /dev/null && [ -d "./TestResults" ]; then
            local test_count=$(find ./TestResults -name "*.trx" -exec grep -o "total=\"[0-9]*\"" {} \; 2>/dev/null | head -1 | grep -o "[0-9]*" || echo "Unknown")
            echo -e "${BLUE}📈 Total Unit Tests: $test_count${NC}"
        fi
    else
        echo -e "${RED}💥 Unit Tests Failed - Please fix before pushing!${NC}"
        exit 1
    fi
}

# Check if script arguments
if [ "$1" == "--help" ]; then
    echo "Usage: $0 [--include-integration] [--help]"
    echo ""
    echo "Options:"
    echo "  --include-integration    Also run integration tests (may fail)"
    echo "  --help                   Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                       Run unit tests only (recommended)"
    echo "  $0 --include-integration Run all tests including integration tests"
    exit 0
fi

# Run main function
main "$@"