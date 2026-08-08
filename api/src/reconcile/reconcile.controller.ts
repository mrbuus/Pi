import {
  Controller,
  Post,
  Get,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Param,
  Body,
  Query,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ReconcileService } from './reconcile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ImportConfigDto,
  GetTransactionsQueryDto,
  ManualMatchDto,
  ImportResultDto,
  BankTransactionResponseDto,
} from './reconcile.dto';

// JwtStrategy.validate() нь { userId, role } буцаадаг — sub БИШ
// (эхний хувилбар sub гэж таамаглаж importedById=undefined болгож байсан)
interface UserPayload {
  userId: string;
  role: string;
}

@Controller('reconcile')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReconcileController {
  constructor(private readonly reconcile: ReconcileService) {}

  /**
   * POST /reconcile/import
   * Банкны хуулгыг (Excel/.csv) импортлоно
   *
   * Multipart form-data:
   * - file: *.xlsx эсвэл *.csv
   * - config: JSON string — ImportConfigDto (баганын зураглал)
   *   Жнь: { "dateCol": 0, "amountCol": 2, "descCol": 3, "journalCol": 4, "accountCol": 5 }
   */
  @Post('import')
  @Roles('ADMIN')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      fileFilter: (req, file, cb) => {
        const allowed =
          file.mimetype ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.mimetype === 'text/csv' ||
          file.originalname.endsWith('.xlsx') ||
          file.originalname.endsWith('.csv');
        if (allowed) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Зөвхөн .xlsx эсвэл .csv файл дэмжэгдэнэ',
            ),
            false,
          );
        }
      },
    }),
  )
  async importFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('config') configStr: string | undefined,
    @CurrentUser() user: UserPayload,
  ): Promise<ImportResultDto> {
    if (!file) {
      throw new BadRequestException('Файл байхгүй байна');
    }

    // config СОНГОЛТТОЙ болсон: Хаан банкны форматыг сервис толгойн мөрөөс нь
    // өөрөө таньдаг тул баганын зураглал заавал хэрэггүй. Ирүүлбэл ирээдүйн
    // (өөр банкны) форматад ашиглагдана.
    let config: ImportConfigDto = {} as ImportConfigDto;
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch {
        throw new BadRequestException('config JSON буруу байна');
      }
    }

    // Файлын төрөл
    const fileType = file.originalname.endsWith('.xlsx')
      ? 'xlsx'
      : file.originalname.endsWith('.csv')
        ? 'csv'
        : 'xlsx'; // Дефолт

    return this.reconcile.importFromFile(
      file.buffer,
      fileType,
      config,
      user.userId,
    );
  }

  /**
   * GET /reconcile/transactions?status=&limit=&offset=
   * Банкны гүйлгээнүүдийг жагсаалтлана
   */
  @Get('transactions')
  @Roles('ADMIN')
  async getTransactions(
    @Query() query: GetTransactionsQueryDto,
  ): Promise<{ items: BankTransactionResponseDto[]; total: number }> {
    return this.reconcile.getTransactions(query);
  }

  /**
   * POST /reconcile/:id/match
   * Гараар банкны гүйлгээг сурагчтай холбоно (Payment PENDING үүсгэнэ)
   */
  @Post(':id/match')
  @Roles('ADMIN')
  async manualMatch(
    @Param('id') bankTransactionId: string,
    @Body() dto: ManualMatchDto,
    @CurrentUser() user: UserPayload,
  ): Promise<BankTransactionResponseDto> {
    return this.reconcile.manualMatch(
      bankTransactionId,
      dto,
      {
        id: user.userId,
        role: user.role,
      },
    );
  }

  /**
   * POST /reconcile/:id/ignore
   * Банкны гүйлгээг үл анхааралтай үл үзэх
   */
  @Post(':id/ignore')
  @Roles('ADMIN')
  @HttpCode(204)
  async ignoreTransaction(
    @Param('id') bankTransactionId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<void> {
    await this.reconcile.ignoreTransaction(
      bankTransactionId,
      {
        id: user.userId,
        role: user.role,
      },
    );
  }
}
