import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { ClassOverviewService } from './class-overview.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamResultsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { GradebookService } from './gradebook.service';

// «Шалгалт» хэсэг: жагсаалт, тохиргоо, дүнгийн хүснэгт (гар/Excel), анализ;
// сурагч/эцэг эхийн дүнгийн дэлгэц. TestsModule импортлодог (app.module-д
// тусдаа бүртгэх шаардлагагүй).
@Module({
  imports: [AuditModule],
  controllers: [ExamsController, ExamResultsController],
  providers: [
    ExamsService,
    GradebookService,
    ExamAnalyticsService,
    ExamResultsService,
    ClassOverviewService,
  ],
})
export class ExamsModule {}
