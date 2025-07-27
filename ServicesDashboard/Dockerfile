FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy the project file (now from current directory since context is ServicesDashboard/)
COPY ["ServicesDashboard.csproj", "."]
RUN dotnet restore "./ServicesDashboard.csproj"

# Copy all source files
COPY . .
WORKDIR "/src/."
RUN dotnet build "ServicesDashboard.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "ServicesDashboard.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ServicesDashboard.dll"]