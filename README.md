# Pi.mn — Шинэ ирээдүйн эзэд

Сургалтын төвийн удирдлага + онлайн сургалт + адаптив ЭЕШ бэлтгэлийн платформ.
Бүрэн шаардлага: [SPEC.md](SPEC.md)

## Бүтэц

```
Pi.mn/
├── web/   — Next.js frontend (TypeScript, Tailwind)
├── api/   — NestJS backend (Prisma, PostgreSQL)
│   └── prisma/schema.prisma — өгөгдлийн сангийн схем
├── docker-compose.yml — локал PostgreSQL + MinIO (S3 орлуулагч)
└── SPEC.md — бүрэн техникийн даалгавар
```

## Локал хөгжүүлэлт эхлүүлэх

1. **Docker Desktop** суулгасан байх (docker.com/products/docker-desktop)
2. Сан болон файл хадгалалт асаах:
   ```bash
   docker compose up -d
   ```
3. Өгөгдлийн сангийн бүтэц үүсгэх:
   ```bash
   cd api && npx prisma migrate dev
   ```
4. Backend асаах: `cd api && npm run start:dev` (http://localhost:3000)
5. Frontend асаах: `cd web && npm run dev` (http://localhost:3001)

## Production (AWS — данс нээгдсэний дараа)

EC2 (Docker, Nginx) + RDS PostgreSQL + S3/CloudFront. Дэлгэрэнгүй: SPEC.md §3
