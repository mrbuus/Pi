import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/jwt.strategy';
import { FilesAuthGuard } from './files-auth.guard';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [
    // GET /files/:key-г ?token= query параметраар ч баталгаажуулах тул
    // (FilesAuthGuard-ыг үз) энд тусад нь JwtService хэрэгтэй.
    JwtModule.register({ secret: requireJwtSecret() }),
  ],
  controllers: [UploadsController],
  providers: [FilesAuthGuard],
})
export class StorageModule {}
