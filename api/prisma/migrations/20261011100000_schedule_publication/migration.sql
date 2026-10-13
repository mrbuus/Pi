-- Өдрийн хуваарь нийтэлсэн тэмдэг (зөвхөн НЭМЭХ)
CREATE TABLE IF NOT EXISTS "SchedulePublication" (
    "date" DATE NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "publishedById" TEXT NOT NULL,
    "recipients" INTEGER NOT NULL,
    CONSTRAINT "SchedulePublication_pkey" PRIMARY KEY ("date")
);
