import { Module } from '@nestjs/common';
import {
  AccountDeletionController,
  AdminDeletionRequestsController,
} from './account-deletion.controller';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  controllers: [AccountDeletionController, AdminDeletionRequestsController],
  providers: [AccountDeletionService],
  exports: [AccountDeletionService],
})
export class AccountDeletionModule {}
