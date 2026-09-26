import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FormulasController } from './formulas.controller';
import { FormulasService } from './formulas.service';

@Module({ imports: [PrismaModule], controllers: [FormulasController], providers: [FormulasService], exports: [FormulasService] })
export class FormulasModule {}
