import { describe, it, expect, beforeEach } from 'bun:test';

/**
 * Integration Tests - Repository Pattern
 *
 * Tests the repository pattern implementation with a mock database
 * to verify the patterns work correctly end-to-end.
 */

// Mock Repository Implementation
interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SoftDeletable extends BaseEntity {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedById: string | null;
}

interface Versioned extends BaseEntity {
  version: number;
}

interface Auditable extends BaseEntity {
  createdById: string | null;
  updatedById: string | null;
}

// Full audited entity
interface TestEntity extends SoftDeletable, Versioned, Auditable {
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

// In-memory database simulation
class InMemoryDatabase {
  private data: Map<string, TestEntity> = new Map();

  async insert(entity: TestEntity): Promise<TestEntity> {
    this.data.set(entity.id, { ...entity });
    return entity;
  }

  async findById(id: string, includeDeleted = false): Promise<TestEntity | null> {
    const entity = this.data.get(id);
    if (!entity) return null;
    if (!includeDeleted && entity.isDeleted) return null;
    return { ...entity };
  }

  async findMany(filter: Partial<TestEntity>, includeDeleted = false): Promise<TestEntity[]> {
    const results: TestEntity[] = [];
    for (const entity of this.data.values()) {
      if (!includeDeleted && entity.isDeleted) continue;

      let matches = true;
      for (const [key, value] of Object.entries(filter)) {
        if ((entity as any)[key] !== value) {
          matches = false;
          break;
        }
      }
      if (matches) results.push({ ...entity });
    }
    return results;
  }

  async update(id: string, data: Partial<TestEntity>): Promise<TestEntity | null> {
    const entity = this.data.get(id);
    if (!entity) return null;

    const updated = {
      ...entity,
      ...data,
      updatedAt: new Date(),
    };
    this.data.set(id, updated);
    return { ...updated };
  }

  async updateWithVersion(
    id: string,
    expectedVersion: number,
    data: Partial<TestEntity>
  ): Promise<TestEntity | null> {
    const entity = this.data.get(id);
    if (!entity) return null;

    if (entity.version !== expectedVersion) {
      throw new Error(`Optimistic lock version mismatch. Expected ${expectedVersion}, actual ${entity.version}`);
    }

    const updated = {
      ...entity,
      ...data,
      updatedAt: new Date(),
      version: entity.version + 1,
    };
    this.data.set(id, updated);
    return { ...updated };
  }

  async softDelete(id: string, deletedBy: string): Promise<boolean> {
    const entity = this.data.get(id);
    if (!entity) return false;

    entity.isDeleted = true;
    entity.deletedAt = new Date();
    entity.deletedById = deletedBy;
    entity.updatedAt = new Date();
    return true;
  }

  async restore(id: string): Promise<boolean> {
    const entity = this.data.get(id);
    if (!entity) return false;

    entity.isDeleted = false;
    entity.deletedAt = null;
    entity.deletedById = null;
    entity.updatedAt = new Date();
    return true;
  }

  async hardDelete(id: string): Promise<boolean> {
    return this.data.delete(id);
  }

  clear(): void {
    this.data.clear();
  }

  count(): number {
    return this.data.size;
  }
}

// Repository implementation
class TestRepository {
  constructor(private db: InMemoryDatabase) {}

  async findById(id: string, includeDeleted = false): Promise<TestEntity | null> {
    return this.db.findById(id, includeDeleted);
  }

  async findByEmail(email: string, includeDeleted = false): Promise<TestEntity | null> {
    const results = await this.db.findMany({ email }, includeDeleted);
    return results[0] || null;
  }

  async create(data: Omit<TestEntity, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt' | 'deletedById' | 'version'>): Promise<TestEntity> {
    const entity: TestEntity = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
      deletedAt: null,
      deletedById: null,
      version: 1,
    };
    return this.db.insert(entity);
  }

  async update(id: string, data: Partial<TestEntity>): Promise<TestEntity | null> {
    return this.db.update(id, data);
  }

  async updateWithVersion(id: string, expectedVersion: number, data: Partial<TestEntity>): Promise<TestEntity | null> {
    return this.db.updateWithVersion(id, expectedVersion, data);
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.db.softDelete(id, deletedBy);
  }

  async restore(id: string): Promise<void> {
    await this.db.restore(id);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.hardDelete(id);
  }

  async findAll(includeDeleted = false): Promise<TestEntity[]> {
    return this.db.findMany({}, includeDeleted);
  }
}

// Unit of Work simulation
class UnitOfWork {
  private operations: (() => Promise<void>)[] = [];
  private committed = false;

  addOperation(op: () => Promise<void>): void {
    if (this.committed) {
      throw new Error('Cannot add operations after commit');
    }
    this.operations.push(op);
  }

  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Already committed');
    }

    // Execute all operations
    for (const op of this.operations) {
      await op();
    }

    this.committed = true;
  }

  async rollback(): Promise<void> {
    this.operations = [];
    this.committed = false;
  }

  isCommitted(): boolean {
    return this.committed;
  }
}

describe('Integration: Repository Pattern', () => {
  let db: InMemoryDatabase;
  let repository: TestRepository;

  beforeEach(() => {
    db = new InMemoryDatabase();
    repository = new TestRepository(db);
  });

  describe('CRUD Operations', () => {
    it('should create new entity with auto-generated fields', async () => {
      const entity = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: 'user-1',
        updatedById: 'user-1',
      });

      expect(entity.id).toBeDefined();
      expect(entity.version).toBe(1);
      expect(entity.isDeleted).toBe(false);
      expect(entity.deletedAt).toBeNull();
      expect(entity.createdAt).toBeInstanceOf(Date);
    });

    it('should find entity by id', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      const found = await repository.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('Test User');
    });

    it('should find entity by custom field', async () => {
      await repository.create({
        name: 'User 1',
        email: 'unique@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      const found = await repository.findByEmail('unique@example.com');

      expect(found).toBeDefined();
      expect(found?.name).toBe('User 1');
    });

    it('should update entity', async () => {
      const created = await repository.create({
        name: 'Original Name',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      const updated = await repository.update(created.id, {
        name: 'Updated Name',
        status: 'inactive',
      });

      expect(updated?.name).toBe('Updated Name');
      expect(updated?.status).toBe('inactive');
      expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });
  });

  describe('Soft Delete Operations', () => {
    it('should soft delete entity', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.softDelete(created.id, 'admin-id');

      // Should not find deleted entity
      const notFound = await repository.findById(created.id);
      expect(notFound).toBeNull();

      // Should find with includeDeleted flag
      const found = await repository.findById(created.id, true);
      expect(found).toBeDefined();
      expect(found?.isDeleted).toBe(true);
      expect(found?.deletedById).toBe('admin-id');
    });

    it('should restore soft deleted entity', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.softDelete(created.id, 'admin-id');
      await repository.restore(created.id);

      const found = await repository.findById(created.id);
      expect(found).toBeDefined();
      expect(found?.isDeleted).toBe(false);
      expect(found?.deletedAt).toBeNull();
    });

    it('should hard delete entity permanently', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.hardDelete(created.id);

      // Should not find even with includeDeleted
      const notFound = await repository.findById(created.id, true);
      expect(notFound).toBeNull();
    });
  });

  describe('Versioning (Optimistic Locking)', () => {
    it('should update with correct version', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      expect(created.version).toBe(1);

      const updated = await repository.updateWithVersion(
        created.id,
        1, // Expected version
        { name: 'Updated Name' }
      );

      expect(updated?.version).toBe(2);
      expect(updated?.name).toBe('Updated Name');
    });

    it('should reject update with wrong version', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await expect(
        repository.updateWithVersion(created.id, 999, { name: 'Hacked Name' })
      ).rejects.toThrow('Optimistic lock version mismatch');
    });

    it('should prevent concurrent updates', async () => {
      const created = await repository.create({
        name: 'Test User',
        email: 'test@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      // First update succeeds
      await repository.updateWithVersion(created.id, 1, { name: 'First Update' });

      // Second update with same version fails
      await expect(
        repository.updateWithVersion(created.id, 1, { name: 'Second Update' })
      ).rejects.toThrow('Optimistic lock version mismatch');
    });
  });

  describe('Query Operations', () => {
    it('should find all entities', async () => {
      await repository.create({
        name: 'User 1',
        email: 'user1@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.create({
        name: 'User 2',
        email: 'user2@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      const all = await repository.findAll();
      expect(all.length).toBe(2);
    });

    it('should exclude soft deleted entities by default', async () => {
      const entity1 = await repository.create({
        name: 'User 1',
        email: 'user1@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.create({
        name: 'User 2',
        email: 'user2@example.com',
        status: 'active',
        createdById: null,
        updatedById: null,
      });

      await repository.softDelete(entity1.id, 'admin');

      const active = await repository.findAll();
      expect(active.length).toBe(1);
      expect(active[0].name).toBe('User 2');
    });
  });
});

describe('Integration: Unit of Work Pattern', () => {
  let db: InMemoryDatabase;
  let repository: TestRepository;

  beforeEach(() => {
    db = new InMemoryDatabase();
    repository = new TestRepository(db);
  });

  it('should commit all operations together', async () => {
    const uow = new UnitOfWork();

    const entity1 = await repository.create({
      name: 'User 1',
      email: 'user1@example.com',
      status: 'active',
      createdById: null,
      updatedById: null,
    });

    const entity2 = await repository.create({
      name: 'User 2',
      email: 'user2@example.com',
      status: 'active',
      createdById: null,
      updatedById: null,
    });

    // Add operations
    uow.addOperation(async () => {
      await repository.update(entity1.id, { status: 'inactive' });
    });

    uow.addOperation(async () => {
      await repository.update(entity2.id, { status: 'inactive' });
    });

    // Commit
    await uow.commit();

    expect(uow.isCommitted()).toBe(true);

    // Verify both updates
    const updated1 = await repository.findById(entity1.id);
    const updated2 = await repository.findById(entity2.id);

    expect(updated1?.status).toBe('inactive');
    expect(updated2?.status).toBe('inactive');
  });

  it('should not allow operations after commit', async () => {
    const uow = new UnitOfWork();

    uow.addOperation(async () => {});
    await uow.commit();

    // addOperation throws synchronously, not asynchronously
    expect(() => uow.addOperation(async () => {}))
      .toThrow('Cannot add operations after commit');
  });

  it('should allow rollback', async () => {
    const uow = new UnitOfWork();

    uow.addOperation(async () => {});
    uow.addOperation(async () => {});

    await uow.rollback();

    expect(uow.isCommitted()).toBe(false);
  });
});
