import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requireJwtSecret } from '../auth/jwt.strategy';
import { DraftFileGuard } from './draft-file.guard';
import {
  InternalDraftFilesController,
  InternalDraftsController,
} from './internal-drafts.controller';
import { InternalDraftsService } from './internal-drafts.service';

@Module({
  // Зургийн маршрут ?token=-ийг өөрөө баталгаажуулна (DraftFileGuard)
  imports: [JwtModule.register({ secret: requireJwtSecret() })],
  controllers: [InternalDraftsController, InternalDraftFilesController],
  providers: [InternalDraftsService, DraftFileGuard],
})
export class InternalDraftsModule {}
