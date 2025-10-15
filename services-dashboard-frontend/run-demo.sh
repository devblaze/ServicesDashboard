#!/bin/bash

#######################################
# Services Dashboard Demo Video Generator
#######################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    echo -e "${2}${1}${NC}"
}

# Print section header
print_header() {
    echo ""
    echo "======================================"
    print_message "$1" "$BLUE"
    echo "======================================"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main script
main() {
    print_header "Services Dashboard Demo Video Generator"

    # Check if yarn is installed
    if ! command_exists yarn; then
        print_message "Error: yarn is not installed" "$RED"
        exit 1
    fi

    # Check if Playwright is installed
    if [ ! -d "node_modules/@playwright/test" ]; then
        print_message "Playwright not found. Installing dependencies..." "$YELLOW"
        yarn install
        print_message "Installing Playwright browsers..." "$YELLOW"
        yarn playwright:install
    fi

    # Create directories for outputs
    print_message "Creating output directories..." "$GREEN"
    mkdir -p screenshots
    mkdir -p videos
    mkdir -p test-results

    # Clean previous results if requested
    if [ "$1" == "--clean" ]; then
        print_message "Cleaning previous test results..." "$YELLOW"
        rm -rf test-results/*
        rm -rf screenshots/*
        rm -rf videos/*
    fi

    # Run demo tests
    print_header "Running Demo Tests"
    print_message "This will generate videos and screenshots..." "$GREEN"
    print_message "Videos will be saved to: test-results/" "$BLUE"
    print_message "Screenshots will be saved to: screenshots/" "$BLUE"

    # Set demo mode for slower animations
    export DEMO_MODE=true

    # Run the tests
    if yarn demo:record; then
        print_message "✓ Demo tests completed successfully!" "$GREEN"
    else
        print_message "✗ Some demo tests failed, but videos may still be generated" "$YELLOW"
    fi

    # Organize videos
    print_header "Organizing Videos"

    # Move videos from test-results to videos folder with better names
    if [ -d "test-results" ]; then
        video_count=0
        for dir in test-results/*/; do
            if [ -d "$dir" ]; then
                for video in "$dir"video.webm "$dir"*.webm; do
                    if [ -f "$video" ]; then
                        # Extract test name from directory
                        test_name=$(basename "$(dirname "$video")")
                        # Create a friendly name
                        friendly_name=$(echo "$test_name" | sed 's/-chromium$//' | sed 's/demo-spec-ts-//' | sed 's/-/ /g')
                        # Copy video with sequential number and friendly name
                        ((video_count++))
                        cp "$video" "videos/demo-${video_count}-${test_name}.webm"
                        print_message "✓ Saved: demo-${video_count}-${test_name}.webm" "$GREEN"
                    fi
                done
            fi
        done

        if [ $video_count -eq 0 ]; then
            print_message "No videos found in test-results" "$YELLOW"
        else
            print_message "✓ Organized $video_count videos" "$GREEN"
        fi
    fi

    # Count screenshots
    if [ -d "screenshots" ]; then
        screenshot_count=$(find screenshots -name "*.png" 2>/dev/null | wc -l | tr -d ' ')
        if [ "$screenshot_count" -gt 0 ]; then
            print_message "✓ Generated $screenshot_count screenshots" "$GREEN"
        fi
    fi

    # Summary
    print_header "Demo Generation Complete!"
    echo ""
    print_message "📁 Output Locations:" "$BLUE"
    echo "   • Videos:      ./videos/"
    echo "   • Screenshots: ./screenshots/"
    echo "   • Test Report: ./playwright-report/"
    echo ""
    print_message "📺 To view the HTML test report:" "$BLUE"
    echo "   yarn playwright show-report"
    echo ""
    print_message "💡 Tips:" "$YELLOW"
    echo "   • Videos are in WebM format"
    echo "   • Convert to MP4: ffmpeg -i input.webm output.mp4"
    echo "   • Use --clean flag to remove previous results"
    echo ""
}

# Run main function
main "$@"
