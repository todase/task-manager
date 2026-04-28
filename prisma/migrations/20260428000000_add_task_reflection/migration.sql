-- CreateTable
CREATE TABLE "TaskReflection" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "notes" TEXT,
    "timeMinutes" INTEGER,
    "difficulty" INTEGER,
    "mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskReflection_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TaskReflection" ADD CONSTRAINT "TaskReflection_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
