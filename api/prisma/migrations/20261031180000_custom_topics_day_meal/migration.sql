-- Хуваарь: олон чөлөөт сэдэв + амралтын өдрийн хоол (additive, өгөгдөл устгахгүй)
ALTER TABLE "LessonTopic" ADD COLUMN IF NOT EXISTS "customTopics" TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE TABLE IF NOT EXISTS "DayMeal" (
    "date" DATE NOT NULL,
    "cookId" TEXT,
    "food" TEXT,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayMeal_pkey" PRIMARY KEY ("date")
);
