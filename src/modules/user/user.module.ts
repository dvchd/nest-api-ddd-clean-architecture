import { Module, Global } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepositoryImpl } from '@/infrastructure/database/repositories/user.repository.impl';
import { RoleRepositoryImpl } from '@/infrastructure/database/repositories/role.repository.impl';
import { UnitOfWork, UNIT_OF_WORK_TOKEN } from '@/infrastructure/database/unit-of-work';

@Global()
@Module({
  controllers: [UserController],
  providers: [
    UserService,
    UnitOfWork,
    {
      provide: UNIT_OF_WORK_TOKEN,
      useExisting: UnitOfWork,
    },
    {
      provide: 'IUserRepository',
      useClass: UserRepositoryImpl,
    },
    {
      provide: 'IRoleRepository',
      useClass: RoleRepositoryImpl,
    },
  ],
  exports: [UserService, 'IUserRepository', 'IRoleRepository', UnitOfWork],
})
export class UserModule {}
