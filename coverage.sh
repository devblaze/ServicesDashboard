#!/bin/bash

# Install coverlet if not already installed
dotnet tool install -g coverlet.console

# Run tests with coverage
dotnet test ServicesDashboard.Tests/ServicesDashboard.Tests.csproj \
    --collect:"XPlat Code Coverage" \
    --results-directory ./TestResults \
    --logger trx \
    --logger "console;verbosity=detailed"

# Generate coverage report in multiple formats for SonarQube
dotnet test ServicesDashboard.Tests/ServicesDashboard.Tests.csproj \
    /p:CollectCoverage=true \
    /p:CoverletOutputFormat=opencover \
    /p:CoverletOutput=./TestResults/coverage.opencover.xml \
    /p:ExcludeByFile="**/Program.cs"

echo "Tests completed. Coverage reports generated in ./TestResults/"
