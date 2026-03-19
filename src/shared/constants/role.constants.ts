/**
 * Role Constants
 * Định nghĩa các role mặc định trong hệ thống
 */
export enum RoleName {
  ADMIN = 'admin',
  MENTOR = 'mentor',
  MENTEE = 'mentee',
}

export const DEFAULT_ROLES = [
  {
    name: RoleName.ADMIN,
    displayName: 'Administrator',
    description: 'Quản trị viên hệ thống với toàn quyền',
    permissions: ['*'],
  },
  {
    name: RoleName.MENTOR,
    displayName: 'Mentor',
    description: 'Người hướng dẫn, có thể tạo và quản lý khóa học',
    permissions: [
      'courses:read',
      'courses:write',
      'courses:delete',
      'students:read',
      'students:write',
      'analytics:read',
    ],
  },
  {
    name: RoleName.MENTEE,
    displayName: 'Mentee',
    description: 'Người học, có thể đăng ký và tham gia khóa học',
    permissions: [
      'courses:read',
      'enrollments:read',
      'enrollments:write',
      'profile:read',
      'profile:write',
    ],
  },
] as const;

/**
 * Permission Constants
 */
export enum Permission {
  // Admin permissions
  ALL = '*',

  // Course permissions
  COURSES_READ = 'courses:read',
  COURSES_WRITE = 'courses:write',
  COURSES_DELETE = 'courses:delete',

  // Student permissions
  STUDENTS_READ = 'students:read',
  STUDENTS_WRITE = 'students:write',

  // Enrollment permissions
  ENROLLMENTS_READ = 'enrollments:read',
  ENROLLMENTS_WRITE = 'enrollments:write',

  // Profile permissions
  PROFILE_READ = 'profile:read',
  PROFILE_WRITE = 'profile:write',

  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
}
