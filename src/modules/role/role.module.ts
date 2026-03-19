import { Module } from '@nestjs/common';
import { RoleRepositoryImpl } from '@/infrastructure/database/repositories/role.repository.impl';

@Module({
  providers: [
    {
      provide: 'IRoleRepository',
      useClass: RoleRepositoryImpl,
    },
  ],
  exports: ['IRoleRepository'],
})
export class RoleModule {}
