# NestJS Repository Pattern & DDD Implementation

A production-ready NestJS API with Drizzle ORM implementing:

- **Repository Pattern** - Clean data access layer
- **Unit of Work Pattern** - Transaction management
- **Domain-Driven Design (DDD)** - Domain layer with Entities & Value Objects
- **Clean Architecture** - Separation of concerns
- **Soft Delete** - With global filter
- **Audit Trail** - Track created/updated/deleted
- **Versioning** - Optimistic locking

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun test
```

## Project Structure

```
src/
├── domain/           # Domain Layer (Core)
│   ├── entities/     # Domain Entities with behavior
│   ├── value-objects/# Value Objects with validation
│   ├── repositories/ # Repository Interfaces
│   └── services/     # Domain Services
├── application/      # Application Layer
│   ├── services/     # Application Services
│   └── dto/          # Data Transfer Objects
├── infrastructure/   # Infrastructure Layer
│   ├── database/     # Drizzle ORM, Repositories
│   └── auth/         # Auth Strategies, Guards
├── modules/          # NestJS Modules
└── shared/           # Shared utilities
```

## Features

### Authentication
- Google OAuth 2.0 (no password required)
- JWT access & refresh tokens
- Role-based access control (Admin, Mentor, Mentee)

### Data Patterns
- Soft delete with global filter
- Audit trail (created/updated/deleted tracking)
- Optimistic locking for concurrent updates

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/google | Google OAuth login | Public |
| POST | /api/auth/refresh | Refresh access token | Public |
| GET | /api/auth/me | Current user profile | Required |
| POST | /api/auth/logout | Logout | Required |
| GET | /api/users | List all users | Admin |
| POST | /api/users | Create user | Admin |
| PUT | /api/users/:id | Update user | Admin |
| DELETE | /api/users/:id | Soft delete user | Admin |

## Test Results

```
✅ 83 tests passing
- Unit Tests: 18
- API Tests: 18  
- Integration Tests: 31
- Mock-based Tests: 16
```

## Documentation

See `download/NestJS_Repository_Pattern_DDD_Guide.docx` for detailed documentation.
