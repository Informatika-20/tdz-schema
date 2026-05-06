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
} from "drizzle-orm/pg-core";

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
    special_access: jsonb("special_access"),
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

export const studentAnswers = pgTable("student_answers", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  studentNumber: smallint("student_number"),
  classId: varchar("class_id", { length: 36 }).references(() => classes.id),
  testNumber: smallint("test_number"),
  questionId: varchar("question_id", { length: 36 }).references(
    () => questions.id,
  ),
  answer: jsonb("answer"),
  score: smallint("score"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cache = pgTable("cache", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 256 }).notNull().unique(),
  type: varchar("type", { length: 256 }),
  data: jsonb("data"),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// Aggregated student scores per module (replaces calculating from studentAnswers for historical data)
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
    index("sms_class_id_idx").on(table.classId),
    index("sms_test_number_idx").on(table.testNumber),
    index("sms_class_test_idx").on(table.classId, table.testNumber),
  ],
);

// Aggregated question statistics per class (tracks which questions students struggle with)
export const questionStats = pgTable("question_stats", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  classId: varchar("class_id", { length: 36 })
    .references(() => classes.id)
    .notNull(),
  testNumber: smallint("test_number").notNull(),
  questionId: varchar("question_id", { length: 36 })
    .references(() => questions.id)
    .notNull(),
  totalAnswers: smallint("total_answers").notNull(),
  correctCount: smallint("correct_count").notNull(),
  avgScore: smallint("avg_score").notNull(), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Central table for all test types - modules.type and classes.test_key reference tests.key
export const tests = pgTable("tests", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  key: varchar("key", { length: 32 }).notNull().unique(), // matches modules.type and classes.test_key (e.g., "ss", "zs3", "ai1")
  name: varchar("name", { length: 256 }).notNull(), // display name (e.g., "Stredná škola", "AI pre 1. stupeň")
  isDefault: boolean("is_default").default(false).notNull(), // default tests available to all teachers
  modulesSelectable: boolean("modules_selectable").default(false).notNull(), // if true, teachers can select modules; if false, all modules for this test are used
  color: varchar("color", { length: 32 }), // optional, for UI styling
  description: varchar("description", { length: 512 }), // optional description
  groupNames: jsonb("group_names").$type<string[]>().default([]), // array of group names for access control (e.g., ["AI - CTRL", "AI"])
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdateFn(() => new Date()),
});

// Archive table for historical studentAnswers data (backup only, no foreign keys)
export const studentAnswersArchive = pgTable("student_answers_archive", {
  id: varchar("id", { length: 36 }).primaryKey(),
  studentNumber: smallint("student_number"),
  classId: varchar("class_id", { length: 36 }),
  testNumber: smallint("test_number"),
  questionId: varchar("question_id", { length: 36 }),
  answer: jsonb("answer"),
  score: smallint("score"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull(),
  schoolYear: varchar("school_year", { length: 256 }),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

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
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teacherId: varchar("teacher_id", { length: 36 })
      .references(() => teachers.id)
      .notNull(),
    cohortId: varchar("cohort_id", { length: 36 })
      .references(() => cohorts.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("teacher_cohorts_teacher_id_idx").on(table.teacherId),
    index("teacher_cohorts_cohort_id_idx").on(table.cohortId),
  ],
);

// Which tests each cohort can access
export const cohortTestAccess = pgTable(
  "cohort_test_access",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    cohortId: varchar("cohort_id", { length: 36 })
      .references(() => cohorts.id)
      .notNull(),
    testId: varchar("test_id", { length: 36 })
      .references(() => tests.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("cohort_test_access_cohort_id_idx").on(table.cohortId),
    index("cohort_test_access_test_id_idx").on(table.testId),
  ],
);
