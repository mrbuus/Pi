import { FormulaReviewController } from './formula-review.controller';
import { FormulaReviewService } from './formula-review.service';
import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FormulasController } from './formulas.controller';
import { FormulasService } from './formulas.service';

@Module({ imports: [PrismaModule, ConfigModule], controllers: [FormulaReviewController, FormulasController], providers: [FormulasService, FormulaReviewService], exports: [FormulasService] })
export class FormulasModule {}
