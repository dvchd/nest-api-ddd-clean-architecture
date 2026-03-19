import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

/**
 * Integration Tests - Auth Flow
 *
 * These tests verify the complete authentication flow:
 * Google OAuth -> User Creation/Update -> JWT Generation -> Token Validation
 *
 * NOTE: These are mock-based integration tests.
 * For real database integration tests, use the docker-compose.test.yml setup.
 *
 * Soft delete is determined by deletedAt:
 * - deletedAt IS NULL → record not deleted
 * - deletedAt IS NOT NULL → record soft deleted
 */

// Helper to check if entity is deleted
function isDeleted(entity: any): boolean {
  return entity.deletedAt !== null;
}

// Mock implementations for testing
class MockDatabase {
  private users: Map<string, any> = new Map();
  private roles: Map<string, any> = new Map();
  private sessions: Map<string, any> = new Map();

  constructor() {
    // Seed default roles
    this.seedRoles();
  }

  private seedRoles() {
    const roles = [
      { id: 'role-admin', name: 'admin', displayName: 'Administrator', permissions: ['*'] },
      { id: 'role-mentor', name: 'mentor', displayName: 'Mentor', permissions: ['courses:read', 'courses:write'] },
      { id: 'role-mentee', name: 'mentee', displayName: 'Mentee', permissions: ['courses:read'] },
    ];

    roles.forEach(role => {
      this.roles.set(role.id, {
        ...role,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
    });
  }

  // User operations
  async createUser(data: any) {
    const user = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      deletedById: null,
      version: 1,
    };
    this.users.set(user.id, user);
    return this.attachRole(user);
  }

  async findUserById(id: string) {
    const user = this.users.get(id);
    if (!user || isDeleted(user)) return null;
    return this.attachRole(user);
  }

  async findUserByEmail(email: string) {
    for (const user of this.users.values()) {
      if (user.email === email && !isDeleted(user)) {
        return this.attachRole(user);
      }
    }
    return null;
  }

  async findUserByGoogleId(googleId: string) {
    for (const user of this.users.values()) {
      if (user.googleId === googleId && !isDeleted(user)) {
        return this.attachRole(user);
      }
    }
    return null;
  }

  async updateUser(id: string, data: any) {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = {
      ...user,
      ...data,
      updatedAt: new Date(),
      version: user.version + 1,
    };
    this.users.set(id, updated);
    return this.attachRole(updated);
  }

  async softDeleteUser(id: string, deletedBy: string) {
    const user = this.users.get(id);
    if (!user) return false;

    user.deletedAt = new Date();
    user.deletedById = deletedBy;
    user.updatedAt = new Date();
    return true;
  }

  private attachRole(user: any) {
    const role = this.roles.get(user.roleId);
    return { ...user, role: role || null };
  }

  // Lock for concurrent operations
  private locks: Map<string, Promise<any>> = new Map();

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Wait for existing lock
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    
    // Create new lock
    let resolveLock: () => void;
    const lockPromise = new Promise<void>(resolve => { resolveLock = resolve; });
    this.locks.set(key, lockPromise);

    try {
      return await fn();
    } finally {
      this.locks.delete(key);
      resolveLock!();
    }
  }

  // Role operations
  async findRoleByName(name: string) {
    for (const role of this.roles.values()) {
      if (role.name === name && !isDeleted(role)) {
        return role;
      }
    }
    return null;
  }

  async findRoleById(id: string) {
    return this.roles.get(id) || null;
  }

  // Session operations
  async createSession(data: any) {
    const session = {
      ...data,
      createdAt: new Date(),
      deletedAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  // Test helpers
  clear() {
    this.users.clear();
    this.sessions.clear();
    this.seedRoles();
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}

// Mock JWT Service
class MockJwtService {
  private secret = 'test-secret-key';

  generateToken(payload: any, expiresIn: string = '1h'): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const now = Math.floor(Date.now() / 1000);
    const exp = expiresIn === '1h' ? now + 3600 : now + 86400 * 7;

    const body = btoa(JSON.stringify({
      ...payload,
      iat: now,
      exp,
    }));

    const signature = btoa(`${header}.${body}.${this.secret}`);
    return `${header}.${body}.${signature}`;
  }

  verifyToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));

      // Check expiration
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }
}

// Service under test
class AuthService {
  constructor(
    private db: MockDatabase,
    private jwt: MockJwtService
  ) {}

  async handleGoogleOAuth(profile: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    // Use lock to prevent race conditions for same Google ID
    return this.db.withLock(`google:${profile.googleId}`, async () => {
      // Check existing user
      let user = await this.db.findUserByGoogleId(profile.googleId);
      let isNewUser = false;

      if (user) {
        // Update last login
        await this.db.updateUser(user.id, { lastLoginAt: new Date() });
      } else {
        // Check email conflict
        const existingUser = await this.db.findUserByEmail(profile.email);
        if (existingUser) {
          throw new Error(`Email ${profile.email} already used by another account`);
        }

        // Get default role
        const defaultRole = await this.db.findRoleByName('mentee');
        if (!defaultRole) {
          throw new Error('Default role not found');
        }

        // Create new user
        isNewUser = true;
        const userId = crypto.randomUUID();
        user = await this.db.createUser({
          id: userId,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl || null,
          googleId: profile.googleId,
          roleId: defaultRole.id,
          isActive: true,
          createdById: userId,
          updatedById: userId,
        });
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Generate tokens
      const accessToken = this.jwt.generateToken({
        sub: user.id,
        email: user.email,
        roleId: user.roleId,
        roleName: user.role?.name,
      });

      const refreshToken = this.jwt.generateToken({
        sub: user.id,
        email: user.email,
      }, '7d');

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          roleName: user.role?.name,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600,
        },
        isNewUser,
      };
    });
  }

  async validateToken(token: string) {
    const payload = this.jwt.verifyToken(token);
    if (!payload) {
      throw new Error('Invalid token');
    }

    const user = await this.db.findUserById(payload.sub);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
    };
  }
}

// UserService for testing
class UserService {
  constructor(private db: MockDatabase) {}

  async getUserById(id: string) {
    return this.db.findUserById(id);
  }

  async updateUser(id: string, data: any, updatedBy: string) {
    const user = await this.db.findUserById(id);
    if (!user) throw new Error('User not found');

    return this.db.updateUser(id, {
      ...data,
      updatedById: updatedBy,
    });
  }

  async changeRole(id: string, newRoleId: string, updatedBy: string) {
    const role = await this.db.findRoleById(newRoleId);
    if (!role) throw new Error('Role not found');

    return this.db.updateUser(id, {
      roleId: newRoleId,
      updatedById: updatedBy,
    });
  }

  async deactivateUser(id: string, updatedBy: string) {
    return this.db.updateUser(id, {
      isActive: false,
      updatedById: updatedBy,
    });
  }

  async softDeleteUser(id: string, deletedBy: string) {
    return this.db.softDeleteUser(id, deletedBy);
  }
}

describe('Integration: Auth Flow', () => {
  let db: MockDatabase;
  let jwt: MockJwtService;
  let authService: AuthService;

  beforeEach(() => {
    db = new MockDatabase();
    jwt = new MockJwtService();
    authService = new AuthService(db, jwt);
  });

  afterEach(() => {
    db.clear();
  });

  describe('Google OAuth Flow', () => {
    const googleProfile = {
      googleId: 'google-123',
      email: 'newuser@example.com',
      displayName: 'New User',
      avatarUrl: 'https://avatar.url/photo.jpg',
    };

    it('should create new user on first Google login', async () => {
      const result = await authService.handleGoogleOAuth(googleProfile);

      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe(googleProfile.email);
      expect(result.user.displayName).toBe(googleProfile.displayName);
      expect(result.user.roleName).toBe('mentee'); // Default role
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it('should return existing user on subsequent Google login', async () => {
      // First login
      const firstResult = await authService.handleGoogleOAuth(googleProfile);

      // Second login
      const secondResult = await authService.handleGoogleOAuth(googleProfile);

      expect(secondResult.isNewUser).toBe(false);
      expect(secondResult.user.id).toBe(firstResult.user.id);
      expect(secondResult.user.email).toBe(googleProfile.email);
    });

    it('should reject login if email already used by different account', async () => {
      // Create user with Google
      await authService.handleGoogleOAuth(googleProfile);

      // Try to login with different Google ID but same email
      const duplicateProfile = {
        googleId: 'google-456', // Different Google ID
        email: 'newuser@example.com', // Same email
        displayName: 'Another User',
      };

      await expect(authService.handleGoogleOAuth(duplicateProfile))
        .rejects.toThrow('already used by another account');
    });

    it('should assign default mentee role to new users', async () => {
      const result = await authService.handleGoogleOAuth(googleProfile);

      expect(result.user.roleName).toBe('mentee');
    });
  });

  describe('JWT Token Validation', () => {
    it('should validate valid access token', async () => {
      // Login first
      const loginResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      // Validate token
      const user = await authService.validateToken(loginResult.tokens.accessToken);

      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(user.roleName).toBe('mentee');
    });

    it('should reject invalid token', async () => {
      await expect(authService.validateToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });

    it('should reject token for deleted user', async () => {
      // Login
      const loginResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      // Soft delete user
      await db.softDeleteUser(loginResult.user.id, 'admin');

      // Try to validate token
      await expect(authService.validateToken(loginResult.tokens.accessToken))
        .rejects.toThrow('User not found');
    });
  });

  describe('User State Management', () => {
    it('should reject login for deactivated account', async () => {
      // Create user
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      // Deactivate user
      const users = db.getAllUsers();
      const user = users.find(u => u.id === createResult.user.id);
      if (user) {
        user.isActive = false;
      }

      // Try to login again
      await expect(authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      })).rejects.toThrow('Account is deactivated');
    });
  });

  describe('Concurrent Login Handling', () => {
    it('should handle multiple concurrent logins for same user', async () => {
      const profile = {
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      // Simulate concurrent login requests
      const results = await Promise.all([
        authService.handleGoogleOAuth(profile),
        authService.handleGoogleOAuth(profile),
        authService.handleGoogleOAuth(profile),
      ]);

      // All should return same user
      const userIds = results.map(r => r.user.id);
      expect(new Set(userIds).size).toBe(1); // All same user

      // First should be new user, rest should be existing
      expect(results[0].isNewUser).toBe(true);
      expect(results[1].isNewUser).toBe(false);
      expect(results[2].isNewUser).toBe(false);
    });
  });
});

describe('Integration: User Management Flow', () => {
  let db: MockDatabase;
  let userService: UserService;
  let authService: AuthService;
  let jwt: MockJwtService;

  beforeEach(() => {
    db = new MockDatabase();
    jwt = new MockJwtService();
    userService = new UserService(db);
    authService = new AuthService(db, jwt);
  });

  afterEach(() => {
    db.clear();
  });

  describe('User CRUD Operations', () => {
    it('should create, read, update user in sequence', async () => {
      // Create user via OAuth
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const userId = createResult.user.id;

      // Read user
      const user = await userService.getUserById(userId);
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');

      // Update user
      const updated = await userService.updateUser(userId, {
        displayName: 'Updated Name',
      }, 'admin-id');

      expect(updated.displayName).toBe('Updated Name');
      expect(updated.version).toBe(2); // Version incremented
    });

    it('should change user role', async () => {
      // Create mentee user
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      expect(createResult.user.roleName).toBe('mentee');

      // Change to mentor role
      const updated = await userService.changeRole(
        createResult.user.id,
        'role-mentor',
        'admin-id'
      );

      expect(updated.roleId).toBe('role-mentor');
    });

    it('should deactivate and soft delete user', async () => {
      // Create user
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const userId = createResult.user.id;

      // Deactivate
      await userService.deactivateUser(userId, 'admin-id');
      let user = await userService.getUserById(userId);
      expect(user.isActive).toBe(false);

      // Soft delete
      await userService.softDeleteUser(userId, 'admin-id');
      user = await userService.getUserById(userId);
      expect(user).toBeNull(); // Should not find deleted user
    });
  });

  describe('Role-Based Access Control', () => {
    it('should have correct role hierarchy', async () => {
      // Create users with different roles
      const menteeResult = await authService.handleGoogleOAuth({
        googleId: 'google-mentee',
        email: 'mentee@example.com',
        displayName: 'Mentee User',
      });

      // Verify default is mentee
      expect(menteeResult.user.roleName).toBe('mentee');

      // Change to mentor
      await userService.changeRole(menteeResult.user.id, 'role-mentor', 'admin-id');
      const mentorUser = await userService.getUserById(menteeResult.user.id);
      expect(mentorUser.role.name).toBe('mentor');

      // Change to admin
      await userService.changeRole(menteeResult.user.id, 'role-admin', 'admin-id');
      const adminUser = await userService.getUserById(menteeResult.user.id);
      expect(adminUser.role.name).toBe('admin');
    });
  });
});

describe('Integration: Data Consistency', () => {
  let db: MockDatabase;
  let jwt: MockJwtService;
  let authService: AuthService;
  let userService: UserService;

  beforeEach(() => {
    db = new MockDatabase();
    jwt = new MockJwtService();
    authService = new AuthService(db, jwt);
    userService = new UserService(db);
  });

  afterEach(() => {
    db.clear();
  });

  describe('Version Control', () => {
    it('should increment version on each update', async () => {
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const userId = createResult.user.id;

      // Multiple updates
      await userService.updateUser(userId, { displayName: 'Name 1' }, 'admin');
      let user = await userService.getUserById(userId);
      expect(user.version).toBe(2);

      await userService.updateUser(userId, { displayName: 'Name 2' }, 'admin');
      user = await userService.getUserById(userId);
      expect(user.version).toBe(3);

      await userService.updateUser(userId, { displayName: 'Name 3' }, 'admin');
      user = await userService.getUserById(userId);
      expect(user.version).toBe(4);
    });
  });

  describe('Audit Trail', () => {
    it('should track who created and updated user', async () => {
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const userId = createResult.user.id;

      // Check created by (should be self for OAuth)
      let user = await userService.getUserById(userId);
      expect(user.createdById).toBe(userId);

      // Update by admin
      await userService.updateUser(userId, { displayName: 'Updated' }, 'admin-id');
      user = await userService.getUserById(userId);
      expect(user.updatedById).toBe('admin-id');
    });
  });

  describe('Soft Delete Recovery', () => {
    it('should preserve data after soft delete', async () => {
      const createResult = await authService.handleGoogleOAuth({
        googleId: 'google-123',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      const userId = createResult.user.id;

      // Soft delete
      await userService.softDeleteUser(userId, 'admin-id');

      // User should not be found normally
      const notFound = await userService.getUserById(userId);
      expect(notFound).toBeNull();

      // But data should still exist in database
      const allUsers = db.getAllUsers();
      const deletedUser = allUsers.find(u => u.id === userId);
      expect(deletedUser).toBeDefined();
      expect(deletedUser.deletedAt).not.toBeNull();
      expect(isDeleted(deletedUser)).toBe(true);
      expect(deletedUser.email).toBe('test@example.com');
    });
  });
});
