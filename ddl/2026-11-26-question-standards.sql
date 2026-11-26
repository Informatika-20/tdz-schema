-- question_standards, question_standard_reviews:
-- how TDZ test questions and interactive tasks cover the Slovak ŠVP 2023
-- informatics standards (the codes live in tabula20's curriculum_standards;
-- no FK across databases).
--
-- Spec: tabula20 docs/superpowers/specs/2026-11-26-standards-coverage-design.md
-- (§1.4, §3).
--
-- ADITÍVNE: dve nové prázdne tabuľky; žiadne údaje nemení. FK na questions
-- a interactive_tasks ich krátko zamknú, preto lock_timeout.
-- Re-runnable (IF NOT EXISTS everywhere). Apply BY HAND, BEFORE any consumer
-- deploys a schema containing these tables. No code deletes rows
-- (soft-delete rule): pairs only change status. Deleting a linked
-- interactive task is refused by the FK (accepted, spec §1.4).

BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS question_standards (
  id                  varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id         varchar(36) CONSTRAINT question_standards_question_id_fkey REFERENCES questions (id),
  interactive_task_id varchar(36) CONSTRAINT question_standards_interactive_task_id_fkey REFERENCES interactive_tasks (id),
  standard_code       varchar(16) NOT NULL
                      CONSTRAINT question_standards_standard_code_check CHECK (standard_code ~ '^if[123]-[vo]-\d{3}[a-z]?$'),
  fit                 varchar(8)  NOT NULL CONSTRAINT question_standards_fit_check CHECK (fit IN ('direct','partial')),
  status              varchar(12) NOT NULL DEFAULT 'suggested'
                      CONSTRAINT question_standards_status_check CHECK (status IN ('suggested','approved','rejected')),
  source              varchar(12) NOT NULL
                      CONSTRAINT question_standards_source_check CHECK (source IN ('ai_agree','ai_split','ai_gap','manual')),
  models              jsonb       NOT NULL DEFAULT '{}',
  flags               text[]      NOT NULL DEFAULT '{}',
  run_id              varchar(32),
  reviewed_by         varchar(256),
  reviewed_at         timestamp,
  created_at          timestamp   NOT NULL DEFAULT now(),
  updated_at          timestamp   NOT NULL DEFAULT now(),
  CONSTRAINT question_standards_one_item CHECK (num_nonnulls(question_id, interactive_task_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS question_standards_question_code
  ON question_standards (question_id, standard_code) WHERE question_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS question_standards_task_code
  ON question_standards (interactive_task_id, standard_code) WHERE interactive_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS question_standards_code_status ON question_standards (standard_code, status);

CREATE TABLE IF NOT EXISTS question_standard_reviews (
  id                  varchar(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id         varchar(36) CONSTRAINT question_standard_reviews_question_id_fkey REFERENCES questions (id),
  interactive_task_id varchar(36) CONSTRAINT question_standard_reviews_interactive_task_id_fkey REFERENCES interactive_tasks (id),
  state               varchar(10) NOT NULL
                      CONSTRAINT question_standard_reviews_state_check CHECK (state IN ('pending','failed','reviewed','stale')),
  latest_input_hash   varchar(64),
  reviewed_input_hash varchar(64),
  models              jsonb       NOT NULL DEFAULT '{}',
  flags               text[]      NOT NULL DEFAULT '{}',
  version             integer     NOT NULL DEFAULT 1,
  run_id              varchar(32),
  reviewed_by         varchar(256),
  reviewed_at         timestamp,
  updated_at          timestamp   NOT NULL DEFAULT now(),
  input_snapshot      jsonb       NOT NULL DEFAULT '{}',
  CONSTRAINT question_standard_reviews_one_item CHECK (num_nonnulls(question_id, interactive_task_id) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS question_standard_reviews_question
  ON question_standard_reviews (question_id) WHERE question_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS question_standard_reviews_task
  ON question_standard_reviews (interactive_task_id) WHERE interactive_task_id IS NOT NULL;

COMMIT;
