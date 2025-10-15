# Branch Protection Setup

This document explains how to configure branch protection rules for the `main` branch to ensure all PRs are properly validated before merging.

## Required Status Checks

The following checks must pass before a PR can be merged to `main`:

1. **Run Tests** - Validates frontend and backend builds and tests
2. **Validate Docker Builds** - Ensures Docker images can be built successfully

## Setting Up Branch Protection

### Step 1: Navigate to Branch Protection Settings

1. Go to your GitHub repository
2. Click **Settings** → **Branches**
3. Under "Branch protection rules", click **Add rule** or edit existing rule for `main`

### Step 2: Configure Protection Rules

Configure the following settings:

#### Basic Settings
- **Branch name pattern**: `main`

#### Protect matching branches
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1` (recommended)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (if you have CODEOWNERS file)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - **Status checks that are required:**
    - `Run Tests`
    - `Validate Docker Builds`

- ✅ **Require conversation resolution before merging**

- ✅ **Do not allow bypassing the above settings**
  - This prevents even admins from bypassing these rules

#### Optional but Recommended
- ✅ **Require linear history** - Prevents merge commits, enforces rebase or squash
- ✅ **Include administrators** - Apply rules to repository administrators too
- ✅ **Restrict who can push to matching branches** - Limit to specific teams/users

### Step 3: Save Changes

Click **Create** or **Save changes** to apply the branch protection rules.

## Status Checks Explained

### Run Tests
This job runs:
- Frontend linting (`yarn lint`)
- Frontend build (`yarn build`)
- Backend build (`dotnet build`)
- Backend tests (`dotnet test`)

**Runs on**: Every PR to `main`
**Approximate duration**: 2-5 minutes

### Validate Docker Builds
This job validates:
- Backend Docker image can be built
- Frontend Docker image can be built
- Builds only for `linux/amd64` platform (for speed)
- Does NOT push images to Docker Hub

**Runs on**: Every PR to `main` (after tests pass)
**Approximate duration**: 5-10 minutes

## Workflow File

The PR checks are defined in:
```
.github/workflows/pr-checks.yml
```

## Testing the Checks Locally

### Frontend Build
```bash
cd services-dashboard-frontend
yarn install
yarn lint
yarn build
```

### Backend Build and Tests
```bash
cd ServicesDashboard
dotnet restore
dotnet build --configuration Release
cd ../ServicesDashboard.Tests
dotnet test --configuration Release
```

### Docker Builds
```bash
# Backend
docker build -f ServicesDashboard/Dockerfile -t servicesdashboard-backend:test ServicesDashboard/

# Frontend (after building frontend with yarn)
docker build -f services-dashboard-frontend/Dockerfile.prod -t servicesdashboard-frontend:test services-dashboard-frontend/
```

## Troubleshooting

### Status checks not appearing
- Make sure you've pushed the PR checks workflow file to the `main` branch
- The workflow must run at least once before it appears in branch protection settings
- Create a test PR to trigger the workflow

### Status checks failing
- Check the Actions tab to see detailed logs
- Ensure your changes pass local tests before pushing
- Common issues:
  - Linting errors in frontend code
  - Type errors in TypeScript
  - Failed unit tests
  - Docker build failures

### Bypassing checks (emergency only)
If you absolutely need to bypass checks:
1. You must have admin permissions
2. Temporarily disable "Do not allow bypassing the above settings"
3. Merge the PR
4. **Immediately re-enable** the setting
5. Create a follow-up PR to fix the issues

**Note**: This should only be done in emergencies and is not recommended.

## Additional Resources

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
