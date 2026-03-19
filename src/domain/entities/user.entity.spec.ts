import { describe, it, expect, beforeEach } from 'bun:test';
import { UserEntity } from '@/domain/entities';
import { Email, RoleNameVO } from '@/domain/value-objects';
import { RoleName } from '@/shared/constants';

describe('Email Value Object', () => {
  it('should create valid email', () => {
    const email = Email.create('test@example.com');
    expect(email.value).toBe('test@example.com');
  });

  it('should normalize email to lowercase', () => {
    const email = Email.create('TEST@EXAMPLE.COM');
    expect(email.value).toBe('test@example.com');
  });

  it('should throw error for invalid email', () => {
    expect(() => Email.create('invalid-email')).toThrow();
  });

  it('should throw error for empty email', () => {
    expect(() => Email.create('')).toThrow();
  });

  it('should compare emails correctly', () => {
    const email1 = Email.create('test@example.com');
    const email2 = Email.create('test@example.com');
    const email3 = Email.create('other@example.com');

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });
});

describe('RoleNameVO Value Object', () => {
  it('should create valid role name', () => {
    const role = RoleNameVO.create(RoleName.ADMIN);
    expect(role.value).toBe(RoleName.ADMIN);
  });

  it('should throw error for invalid role name', () => {
    expect(() => RoleNameVO.create('invalid-role')).toThrow();
  });

  it('should check admin role correctly', () => {
    const admin = RoleNameVO.create(RoleName.ADMIN);
    const mentee = RoleNameVO.create(RoleName.MENTEE);

    expect(admin.isAdmin()).toBe(true);
    expect(mentee.isAdmin()).toBe(false);
  });
});

describe('UserEntity', () => {
  let user: UserEntity;
  const testUserId = 'test-user-id';
  const testRoleId = 'test-role-id';

  beforeEach(() => {
    user = UserEntity.createFromGoogle(
      testUserId,
      'test@example.com',
      'Test User',
      testRoleId,
      RoleName.MENTEE,
      'google-id-123',
      'https://avatar.url/photo.jpg'
    );
  });

  it('should create user from Google OAuth', () => {
    expect(user.id).toBe(testUserId);
    expect(user.email.value).toBe('test@example.com');
    expect(user.displayName).toBe('Test User');
    expect(user.googleId).toBe('google-id-123');
    expect(user.avatarUrl).toBe('https://avatar.url/photo.jpg');
    expect(user.roleName.value).toBe(RoleName.MENTEE);
    expect(user.isActive).toBe(true);
  });

  it('should update profile correctly', () => {
    user.updateProfile('New Name', 'https://new.avatar.url/photo.jpg', testUserId);

    expect(user.displayName).toBe('New Name');
    expect(user.avatarUrl).toBe('https://new.avatar.url/photo.jpg');
  });

  it('should change role correctly', () => {
    const newRoleId = 'new-role-id';
    user.changeRole(newRoleId, RoleName.MENTOR, testUserId);

    expect(user.roleId).toBe(newRoleId);
    expect(user.roleName.value).toBe(RoleName.MENTOR);
  });

  it('should deactivate user', () => {
    user.deactivate(testUserId);
    expect(user.isActive).toBe(false);
  });

  it('should activate user', () => {
    user.deactivate(testUserId);
    user.activate(testUserId);
    expect(user.isActive).toBe(true);
  });

  it('should soft delete user', () => {
    user.softDelete(testUserId);
    expect(user.isDeleted).toBe(true);
    expect(user.deletedAt).not.toBeNull();
    expect(user.deletedById).toBe(testUserId);
  });

  it('should restore soft deleted user', () => {
    user.softDelete(testUserId);
    user.restore();
    expect(user.isDeleted).toBe(false);
    expect(user.deletedAt).toBeNull();
  });

  it('should increment version on update', () => {
    const initialVersion = user.version;
    user.updateProfile('New Name', null, testUserId);
    expect(user.version).toBe(initialVersion + 1);
  });

  it('should check role type correctly', () => {
    const menteeUser = UserEntity.createFromGoogle(
      'mentee-id',
      'mentee@example.com',
      'Mentee User',
      testRoleId,
      RoleName.MENTEE,
      'google-mentee'
    );
    const mentorUser = UserEntity.createFromGoogle(
      'mentor-id',
      'mentor@example.com',
      'Mentor User',
      testRoleId,
      RoleName.MENTOR,
      'google-mentor'
    );
    const adminUser = UserEntity.createFromGoogle(
      'admin-id',
      'admin@example.com',
      'Admin User',
      testRoleId,
      RoleName.ADMIN,
      'google-admin'
    );

    expect(menteeUser.isMentee()).toBe(true);
    expect(mentorUser.isMentor()).toBe(true);
    expect(adminUser.isAdmin()).toBe(true);
  });

  it('should convert to primitive correctly', () => {
    const primitive = user.toPrimitive();

    expect(primitive.id).toBe(testUserId);
    expect(primitive.email).toBe('test@example.com');
    expect(primitive.displayName).toBe('Test User');
    expect(primitive.roleName.value).toBe(RoleName.MENTEE);
    expect(typeof primitive.createdAt).toBe('object');
    expect(typeof primitive.updatedAt).toBe('object');
  });
});
