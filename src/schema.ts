// Example model schema from the Drizzle docs
// https://orm.drizzle.team/docs/sql-schema-declaration

import {
  pgTable,
  varchar,
  smallint,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  uniqueIndex,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = (name: string, schema: Record<string, any>) =>
  pgTable(`tdz_${name}`, schema);

export const schools = pgTable("schools", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 256 }),
  level: varchar("level", { length: 256 }),
  district: varchar("district", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

export const teachers = pgTable(
  "teachers",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 256 }),
    email: varchar("email", { length: 256 }),
    wp_id: integer("wp_id"),
    teacher_info: jsonb("teacher_info"),
    school_edu_id: varchar("school_edu_id", { length: 36 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
  },
  (table) => [index("teachers_school_edu_id_idx").on(table.school_edu_id)],
);

export const classes = pgTable(
  "classes",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 256 }),
    testKey: varchar("test_key", { length: 32 }), // references tests.key
    grade: smallint("grade"),
    teacherId: varchar("teacher_id", { length: 36 }).references(
      () => teachers.id,
    ),
    schoolYear: varchar("school_year", { length: 256 }),
    modules: jsonb("modules"),
    schoolId: varchar("school_id", { length: 36 }).references(() => schools.id),
    cohortId: varchar("cohort_id", { length: 36 }), // references cohorts.id - which cohort this class belongs to for reporting
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
  },
  (table) => [
    index("classes_grade_idx").on(table.grade),
    index("classes_school_year_idx").on(table.schoolYear),
    index("classes_test_key_idx").on(table.testKey),
    index("classes_deleted_at_idx").on(table.deletedAt),
    index("classes_teacher_id_idx").on(table.teacherId),
    index("classes_cohort_id_idx").on(table.cohortId),
  ],
);

export const modules = pgTable("modules", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: varchar("type", { length: 32 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  description: varchar("description", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

export const questions = pgTable("questions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  question: varchar("question", { length: 1024 }),
  moduleId: varchar("module_id", { length: 36 }).references(() => modules.id),
  questionType: varchar("question_type", { length: 32 }).notNull(),
  choices: jsonb("choices"),
  correctAnswer: jsonb("correct_answer"),
  scoringType: varchar("scoring_type", { length: 32 }),
  image: varchar("image", { length: 256 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// THE single answers table — the source of truth for everything (ADR-0001 in
// tdz). All Answers, current and historical, live here forever; there is no
// archive table and no aggregation pipeline. Module scores and facts are
// written in the same transaction as these rows at submit time.
//
// Legacy data notes (2026 unification of student_answers + the former
// student_answers_archive):
// - ~1,550 historical rows have NULL class/student/test keys — the columns
//   stay nullable, and NULLs never collide in the unique index.
// - questionId deliberately has NO foreign key: 2 historical rows reference
//   questions that no longer exist, and deleting history to satisfy an FK
//   isn't worth it. classId keeps its FK (0 violations at unification).
export const studentAnswers = pgTable("student_answers", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentNumber: smallint("student_number"),
  classId: varchar("class_id", { length: 36 }).references(() => classes.id),
  testNumber: smallint("test_number"),
  questionId: varchar("question_id", { length: 36 }),
  // Exactly one of questionId / interactiveTaskId is set. An interactive
  // result row stores the full event-log Recording in `answer` and the
  // server-recomputed finalScore (correctness 0–100) in `score`.
  interactiveTaskId: varchar("interactive_task_id", { length: 36 }).references(
    () => interactiveTasks.id,
  ),
  answer: jsonb("answer"),
  score: smallint("score"),
  metadata: jsonb("metadata"),
  // Denormalized from classes at write time — the question-analysis queries
  // filter whole seasons by it without joining classes.
  schoolYear: varchar("school_year", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
},
  (table) => [
    // The Submission invariant (see tdz CONTEXT.md): a pupil answers a given
    // question at most once per (class, round). This is what makes a duplicate
    // Submission a constraint violation instead of silently blended data.
    uniqueIndex("student_answers_submission_uq").on(
      table.classId,
      table.studentNumber,
      table.testNumber,
      table.questionId,
    ),
    // Per-class per-student scans (class page, SZP duplicate check).
    index("student_answers_class_student_test_idx").on(
      table.classId,
      table.studentNumber,
      table.testNumber,
    ),
    // Date-based scans and the question-analysis GROUP BYs.
    index("student_answers_created_at_idx").on(table.createdAt),
    index("student_answers_question_id_idx").on(table.questionId),
    // The Submission invariant for interactive answers. question_id is NULL on
    // these rows, so the main submission index never fires for them (NULLs
    // don't collide) — this index is what turns a duplicate interactive
    // delivery into a constraint violation.
    //
    // PARTIAL on purpose. Without the predicate a btree still stores an entry
    // for every row whose interactive_task_id is NULL — 4.0M of them against
    // the 30 it can actually constrain, which cost 297 MB and a write on every
    // single answer insert. Those entries can never collide anyway: this is
    // PostgreSQL 14, where a unique index always treats NULLs as distinct
    // (NULLS NOT DISTINCT only arrives in 15). Applied to production
    // 2026-08-31; the index is 16 kB there now.
    //
    // Safe to keep partial only because nothing uses this index as an
    // ON CONFLICT inference target — a partial unique index can only be
    // inferred when the statement repeats the predicate. Nothing in tdz
    // upserts into student_answers at all; both indexes here exist purely to
    // RAISE 23505, which the submit path catches (isUniqueViolation →
    // classifyConflict → echo / duplicate_number).
    uniqueIndex("student_answers_interactive_submission_uq")
      .on(
        table.classId,
        table.studentNumber,
        table.testNumber,
        table.interactiveTaskId,
      )
      // Raw column name, not `${table.interactiveTaskId}`: drizzle renders a
      // column reference table-qualified ("student_answers"."interactive_task_id"),
      // which Postgres accepts but immediately normalises back to the bare name
      // in pg_indexes — so the qualified form reads as permanent drift on every
      // introspect. This string matches what production actually stores.
      .where(sql`interactive_task_id IS NOT NULL`),
  ],
);

// Interactive "praktické" task placements (see .claude/docs/
// interactive-tasks-spec.md). The interactive logic and answer key live in
// code (the prototype registry); a row here is a *placement*: which prototype
// appears in which module, with an optional per-placement config override.
// Module membership in a test then follows the normal getClassModules rules.
export const interactiveTasks = pgTable(
  "interactive_tasks",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // PrototypeKey ("sortFiles", "algoPath1", …) — validated against the code
    // registry at authoring time; a key with no registry entry renders nothing.
    prototype: varchar("prototype", { length: 32 }).notNull(),
    // Optional overrides merged over the prototype's code-default config.
    // Shape is prototype-specific.
    config: jsonb("config"),
    moduleId: varchar("module_id", { length: 36 })
      .references(() => modules.id)
      .notNull(),
    // Ordering within the module (interleaved with questions at render time).
    position: smallint("position").default(0).notNull(),
    // Optional prompt shown above the task (falls back to the code label).
    prompt: varchar("prompt", { length: 1024 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
  },
  (t) => [index("interactive_tasks_module_id_idx").on(t.moduleId)],
);

export const cache = pgTable("cache", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 256 }).notNull().unique(),
  type: varchar("type", { length: 256 }),
  data: jsonb("data"),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// Per-pupil per-module percentages — a stored read model derived from
// studentAnswers (the Rollup, see tdz CONTEXT.md). Written in the same
// transaction as the answers at submit time; always reconstructible from
// studentAnswers via the recompute script. Never more authoritative than the
// answers behind it.
export const studentModuleScores = pgTable(
  "student_module_scores",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    classId: varchar("class_id", { length: 36 })
      .references(() => classes.id)
      .notNull(),
    studentNumber: smallint("student_number").notNull(),
    testNumber: smallint("test_number").notNull(),
    moduleId: varchar("module_id", { length: 36 })
      .references(() => modules.id)
      .notNull(),
    scorePercent: smallint("score_percent").notNull(), // 0-100
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // One score per pupil per module per round — the target of the submit-time
    // upsert (ON CONFLICT on this index updates scorePercent, which is how SZP
    // parts and recomputes overwrite in place).
    uniqueIndex("sms_class_student_test_module_uq").on(
      table.classId,
      table.studentNumber,
      table.testNumber,
      table.moduleId,
    ),
    index("sms_class_id_idx").on(table.classId),
    index("sms_test_number_idx").on(table.testNumber),
    index("sms_class_test_idx").on(table.classId, table.testNumber),
    // Supports the round-over-round improvement self-join, which matches rows on
    // (class_id, student_number, module_id) and filters by test_number.
    index("sms_class_student_module_test_idx").on(
      table.classId,
      table.studentNumber,
      table.moduleId,
      table.testNumber,
    ),
  ],
);

// Central table for all test types - modules.type and classes.test_key reference tests.key
export const tests = pgTable("tests", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 32 }).notNull().unique(), // matches modules.type and classes.test_key (e.g., "ss", "zs3", "ai1")
  name: varchar("name", { length: 256 }).notNull(), // display name (e.g., "Stredná škola", "AI pre 1. stupeň")
  // NOTE: the old is_default flag is gone. Its pre-cohorts meaning was
  // "available to all teachers"; access is governed by cohorts +
  // cohort_test_access, and the dashboard derives special levels from "not
  // offered by any default cohort" (src/app/secretDashboard/page.tsx).
  modulesSelectable: boolean("modules_selectable").default(false).notNull(), // if true, teachers can select modules; if false, all modules for this test are used
  color: varchar("color", { length: 32 }), // optional, for UI styling
  description: varchar("description", { length: 512 }), // optional description
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// One row per submitted test (class + student + round). Written at submit time
// in the same transaction as the answers; avg_score_percent is kept current by
// each submit (SZP parts update it as they arrive) and by the recompute script.
// The fast source for counts/return-rate/daily charts. Deliberately no FK on
// classId — historical rows may predate referential cleanliness.
export const studentTests = pgTable(
  "student_tests",
  {
    classId: varchar("class_id", { length: 36 }).notNull(),
    studentNumber: smallint("student_number").notNull(),
    testNumber: smallint("test_number").notNull(),
    submittedAt: timestamp("submitted_at").notNull(), // original submission time
    avgScorePercent: smallint("avg_score_percent"), // avg of module scorePercents, 0-100
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.classId, table.studentNumber, table.testNumber],
    }),
    index("student_tests_submitted_at_idx").on(table.submittedAt),
  ],
);

// Cohorts - organizational groups for teachers (e.g., "AI - CTRL", "AI", "ZŠ")
export const cohorts = pgTable(
  "cohorts",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: varchar("name", { length: 256 }).notNull(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    description: varchar("description", { length: 512 }),
    color: varchar("color", { length: 32 }),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
  },
  (table) => [index("cohorts_slug_idx").on(table.slug)],
);

// Many-to-many linking teachers to cohorts
export const teacherCohorts = pgTable(
  "teacher_cohorts",
  {
    teacherId: varchar("teacher_id", { length: 36 })
      .references(() => teachers.id)
      .notNull(),
    cohortId: varchar("cohort_id", { length: 36 })
      .references(() => cohorts.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite PK; its (teacher_id, …) prefix covers teacher_id lookups,
    // so no separate teacher_id index is needed.
    primaryKey({ columns: [table.teacherId, table.cohortId] }),
    index("teacher_cohorts_cohort_id_idx").on(table.cohortId),
  ],
);

// Which tests each cohort can access
export const cohortTestAccess = pgTable(
  "cohort_test_access",
  {
    cohortId: varchar("cohort_id", { length: 36 })
      .references(() => cohorts.id)
      .notNull(),
    testId: varchar("test_id", { length: 36 })
      .references(() => tests.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // Composite PK; its (cohort_id, …) prefix covers cohort_id lookups,
    // so no separate cohort_id index is needed.
    primaryKey({ columns: [table.cohortId, table.testId] }),
    index("cohort_test_access_test_id_idx").on(table.testId),
  ],
);

// Test submissions that could not be persisted into student_answers (missing or
// soft-deleted class, DB errors, …). Archive-style — NO foreign keys, because a
// failure cause is precisely a deleted/missing class; FKs would make this
// fallback write fail too. Rows are recovered or dismissed from the admin
// dashboard (/admin/failedSubmissions).
export const failedSubmissions = pgTable("failed_submissions", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  classId: varchar("class_id", { length: 36 }).notNull(), // class the student submitted into
  studentNumber: smallint("student_number"), // nullable — may be missing/invalid in the payload
  testNumber: smallint("test_number"),
  answers: jsonb("answers").notNull(), // raw submitted Record<string, StoredAnswer> payload
  error: text("error"), // the error message that caused the failure
  status: varchar("status", { length: 16 }).default("pending").notNull(), // pending | recovered | dismissed
  assignedClassId: varchar("assigned_class_id", { length: 36 }), // class it was recovered into (may differ from classId)
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// Recordings from the interactive question prototypes (universal action log +
// grading). One row per student's run of one prototype; the full event log is
// stored as jsonb. Standalone — no foreign keys (prototypes are not yet tied to
// real classes/students).
export const prototypeRecordings = pgTable(
  "prototype_recordings",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    prototype: varchar("prototype", { length: 32 }).notNull(),
    student: varchar("student", { length: 64 }),
    startedAt: timestamp("started_at").notNull(),
    events: jsonb("events").notNull(),
    durationMs: integer("duration_ms").notNull(),
    actionCount: integer("action_count").notNull(),
    attempts: smallint("attempts").notNull(),
    firstTry: boolean("first_try").notNull(),
    solved: boolean("solved").notNull(),
    finalScore: smallint("final_score").notNull(), // 0-100 correctness
    meta: jsonb("meta"), // reserved for future "characteristics" (grade, class…)
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("prototype_recordings_prototype_idx").on(table.prototype),
  ],
);
