# GitHub Actions CI/CD Workflows

## CI Pipeline

The CI pipeline (`ci.yml`) runs on every push and pull request to `main` and `develop` branches.

### Jobs

1. **Lint & Test** (Matrix Strategy)
   - Runs for both `backend` and `frontend` projects
   - Steps:
     - Checkout code
     - Setup Node.js 20
     - Install dependencies (`npm ci`)
     - Run linter (`npm run lint`)
     - Run tests with coverage (`npm run test:coverage`)
     - Upload coverage to Codecov
     - Upload coverage artifacts

2. **Coverage Summary**
   - Generates a summary of coverage reports
   - Downloads coverage artifacts
   - Creates a summary in GitHub Actions

### Coverage Thresholds

- **Backend**: 75% (branches, functions, lines, statements)
- **Frontend**: 80% (branches, functions, lines, statements)

### Codecov Integration

To enable Codecov integration:

1. Sign up at [codecov.io](https://codecov.io)
2. Add your repository
3. Get your Codecov token
4. Add it as a GitHub secret: `CODECOV_TOKEN`

The workflow will automatically upload coverage reports to Codecov.

### Manual Coverage Reports

You can also generate coverage reports locally:

```bash
# Backend
cd backend && npm run test:coverage

# Frontend
cd frontend && npm run test:coverage
```

Coverage reports will be generated in:
- Backend: `backend/coverage/`
- Frontend: `frontend/coverage/`

