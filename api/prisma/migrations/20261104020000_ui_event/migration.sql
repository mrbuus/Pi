-- Аппын хэрэглээний бүртгэл (хуудас нээх, товч дарах). Зөвхөн нэмэлт хүснэгт.
CREATE TABLE "UiEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "kind" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "target" TEXT,
    "device" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UiEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UiEvent_createdAt_idx" ON "UiEvent"("createdAt");
CREATE INDEX "UiEvent_role_createdAt_idx" ON "UiEvent"("role", "createdAt");
