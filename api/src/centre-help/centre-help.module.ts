import { Module } from '@nestjs/common';
import { CentreHelpController } from './centre-help.controller';
@Module({ controllers: [CentreHelpController] })
export class CentreHelpModule {}
