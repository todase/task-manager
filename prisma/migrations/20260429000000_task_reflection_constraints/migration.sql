-- Add check constraints to enforce valid difficulty (1-3) and mood values at the DB level
ALTER TABLE "TaskReflection"
  ADD CONSTRAINT "TaskReflection_difficulty_check"
    CHECK (difficulty IS NULL OR difficulty IN (1, 2, 3));

ALTER TABLE "TaskReflection"
  ADD CONSTRAINT "TaskReflection_mood_check"
    CHECK (mood IS NULL OR mood IN ('energized', 'neutral', 'tired'));
