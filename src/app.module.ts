import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RoleModule } from './modules/role/role.module';
import { RoleRepositoryImpl } from '@/infrastructure/database/repositories/role.repository.impl';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    UserModule,
    RoleModule,
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly roleRepository: RoleRepositoryImpl) {}

  async onModuleInit() {
    // Seed default roles on startup
    await this.roleRepository.seedDefaultRoles();
    console.log('✅ Default roles seeded');
  }
}
