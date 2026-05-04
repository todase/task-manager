-- AlterTable
ALTER TABLE "Task" ADD COLUMN "isHabit" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reflectionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_reflectionId_key" ON "HabitLog"("reflectionId");

-- CreateIndex
CREATE INDEX "HabitLog_taskId_date_idx" ON "HabitLog"("taskId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_taskId_date_key" ON "HabitLog"("taskId", "date");

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_reflectionId_fkey" FOREIGN KEY ("reflectionId") REFERENCES "TaskReflection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
