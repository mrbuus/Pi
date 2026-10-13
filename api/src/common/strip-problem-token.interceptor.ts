import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Role } from '../generated/prisma/enums';

/**
 * Бодлогын код (Problem.token: "100-23-05", "1000-S10A-01" …) — эзний дүрэм
 * (2026-10-08): сурагч, эцэг эх, худалдан авагч, нэвтрээгүй хэрэглэгч ХЭЗЭЭ Ч
 * харахгүй. Сервисүүдээс тодорхой хассан (content, attempts, parents,
 * class-sessions …) — энэ нь мартагдсан замын СҮҮЛЧИЙН хамгаалалт: ажилтан биш
 * хэрэглэгчийн хариунаас бодлого хэлбэртэй объектын `token`, мөн бүх
 * `problemToken` түлхүүрийг авна.
 *
 * Бодлого хэлбэртэй = `token` + доорх түлхүүрийн аль нэг. Томьёоны дасгалын
 * гарын үсэгтэй `token`, календарийн `{ token }` зэрэг өөр утгатай токенд
 * хүрэхгүй (тэдгээрт эдгээр түлхүүр байхгүй).
 */
const STAFF: ReadonlySet<string> = new Set([
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
]);
const PROBLEM_KEYS = [
  'statementText',
  'statement',
  'format',
  'chapterId',
  'chapter',
  'imageKey',
  'choices',
  'problemId',
  'correctAnswer',
];

function isPlainObject(v: unknown): v is Record<string, unknown> {
  if (!v || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

export function stripProblemTokens(value: unknown, depth = 0): unknown {
  if (depth > 25) return value;
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const next = stripProblemTokens(item, depth + 1);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? out : value;
  }
  if (!isPlainObject(value)) return value;
  let out: Record<string, unknown> | null = null;
  const dropToken =
    typeof value.token === 'string' &&
    PROBLEM_KEYS.some((key) => key in value);
  for (const [key, child] of Object.entries(value)) {
    if ((key === 'token' && dropToken) || key === 'problemToken') {
      out ??= { ...value };
      delete out[key];
      continue;
    }
    const next = stripProblemTokens(child, depth + 1);
    if (next !== child) {
      out ??= { ...value };
      out[key] = next;
    }
  }
  return out ?? value;
}

@Injectable()
export class StripProblemTokenInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    return next.handle().pipe(
      map((body) =>
        // req.user-ийг хариу бэлэн болох үед уншина (guard дараа нь бөглөнө).
        req.user?.role && STAFF.has(req.user.role)
          ? body
          : stripProblemTokens(body),
      ),
    );
  }
}
