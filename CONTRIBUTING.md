# Contributing to Happy Observatory

Thank you for your interest in contributing to Happy Observatory! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

1. **Clear title and description**
2. **Steps to reproduce**
3. **Expected behavior**
4. **Actual behavior**
5. **Screenshots** (if applicable)
6. **System information**:
   - OS and version
   - Node.js version
   - Browser and version
   - Package versions

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

1. **Use a clear and descriptive title**
2. **Provide a detailed description** of the suggested enhancement
3. **Explain why** this enhancement would be useful
4. **List any alternatives** you've considered

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Follow our coding standards** (see below)
3. **Include tests** for new functionality
4. **Update documentation** as needed
5. **Ensure all tests pass**
6. **Submit a pull request** with a clear description

## Development Setup

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or higher
- Git

### Getting Started

1. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/happy-observatory.git
   cd happy-observatory/apps/web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Run tests**:
   ```bash
   npm test
   ```

## Coding Standards

### TypeScript

- **Strict mode** enabled
- **No `any` types** without justification
- **Explicit return types** for public methods
- **Interface over type** for object shapes
- **Enums** for fixed sets of values

### Code Style

- **ESLint** and **Prettier** for formatting
- **100 character** line limit
- **2 spaces** for indentation
- **Single quotes** for strings
- **Trailing commas** in multi-line structures
- **No semicolons** (enforced by Prettier)

### Naming Conventions

- **Components**: PascalCase (e.g., `ProjectDashboard`)
- **Files**: kebab-case (e.g., `project-dashboard.tsx`)
- **Functions/Variables**: camelCase (e.g., `handleSubmit`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `MAX_RETRIES`)
- **Types/Interfaces**: PascalCase with descriptive names

### Component Structure

```typescript
// Imports - external first, then internal
import React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { useProjects } from '@/hooks/use-projects'

// Types
interface ProjectListProps {
  showArchived?: boolean
  onSelect?: (project: Project) => void
}

// Component
export function ProjectList({ showArchived = false, onSelect }: ProjectListProps) {
  // Hooks first
  const router = useRouter()
  const { projects, loading } = useProjects()

  // State
  const [filter, setFilter] = useState('')

  // Handlers
  const handleSelect = (project: Project) => {
    onSelect?.(project)
    router.push(`/projects/${project.id}`)
  }

  // Render
  return (
    <div>
      {/* Component JSX */}
    </div>
  )
}
```

## Testing Guidelines

### Test Structure

```
src/
├── components/
│   └── __tests__/
│       └── project-list.test.tsx
├── hooks/
│   └── __tests__/
│       └── use-projects.test.ts
└── lib/
    └── __tests__/
        └── api-client.test.ts
```

### Writing Tests

- **Descriptive test names** that explain what is being tested
- **Arrange-Act-Assert** pattern
- **Mock external dependencies**
- **Test edge cases** and error scenarios
- **Aim for 70%+ coverage**

Example:
```typescript
describe('ProjectList', () => {
  it('should filter projects based on search input', () => {
    // Arrange
    const projects = [
      { id: '1', name: 'Project Alpha' },
      { id: '2', name: 'Project Beta' }
    ]
    
    // Act
    const { getByPlaceholderText, queryByText } = render(
      <ProjectList projects={projects} />
    )
    const searchInput = getByPlaceholderText('Search projects...')
    fireEvent.change(searchInput, { target: { value: 'Alpha' } })
    
    // Assert
    expect(queryByText('Project Alpha')).toBeInTheDocument()
    expect(queryByText('Project Beta')).not.toBeInTheDocument()
  })
})
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code changes that neither fix bugs nor add features
- `perf:` Performance improvements
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add project search functionality
fix: resolve WebSocket reconnection issue
docs: update API documentation
refactor: simplify authentication logic
```

## Documentation

- **Update README.md** for significant changes
- **Add JSDoc comments** for public APIs
- **Include examples** for complex features
- **Document breaking changes** in CHANGELOG
- **Keep inline comments** minimal and meaningful

## Review Process

1. **Automated checks** must pass:
   - Linting
   - Type checking
   - Tests
   - Build

2. **Code review** required from maintainers

3. **Documentation** must be updated

4. **Changelog** entry for notable changes

## Release Process

1. **Version bump** following semantic versioning
2. **Update CHANGELOG.md**
3. **Create release PR**
4. **Tag release** after merge
5. **Deploy** to production

## Getting Help

- **Documentation**: Check our [docs](./docs)
- **Issues**: Search existing issues
- **Discussions**: Use GitHub Discussions
- **Contact**: team@happypatterns.org

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md
- Release notes
- Project documentation

Thank you for contributing to Happy Observatory! 🎉

---

*This contributing guide is part of the Happy Observatory governance framework.*