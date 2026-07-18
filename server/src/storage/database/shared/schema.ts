import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, timestamp, boolean, integer, real, jsonb,
  index, serial
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// Keep system table
export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

// ============ Students ============
export const students = pgTable(
  "students",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 128 }).notNull(),
    email: varchar("email", { length: 255 }),
    avatar_url: text("avatar_url"),
    target_band: real("target_band"),
    exam_date: timestamp("exam_date", { withTimezone: true }),
    timezone: varchar("timezone", { length: 64 }).default("Asia/Shanghai").notNull(),
    onboarded: boolean("onboarded").default(false).notNull(),
    last_active_at: timestamp("last_active_at", { withTimezone: true }),
    registered_at: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("students_phone_idx").on(table.phone),
  ]
);

// ============ Student Portraits ============
export const studentPortraits = pgTable(
  "student_portraits",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    current_moment: varchar("current_moment", { length: 50 }).notNull().default("entry_confusion"),
    // Five dimension scores (0-100)
    cognitive_score: real("cognitive_score").default(50).notNull(),
    metacognitive_score: real("metacognitive_score").default(50).notNull(),
    affective_score: real("affective_score").default(50).notNull(),
    behavioral_score: real("behavioral_score").default(50).notNull(),
    social_score: real("social_score").default(50).notNull(),
    // Band history (JSON array of {date, tr, cc, lr, wr, overall})
    band_history: jsonb("band_history").default([]),
    // Current anxiety level (0-100)
    anxiety_level: real("anxiety_level").default(30).notNull(),
    // Night mode active
    night_mode_active: boolean("night_mode_active").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("portraits_student_id_idx").on(table.student_id),
    index("portraits_moment_idx").on(table.current_moment),
  ]
);

// ============ Student Knowledge States (BKT) ============
export const studentKnowledgeStates = pgTable(
  "student_knowledge_states",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    knowledge_point_id: varchar("knowledge_point_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 128 }).notNull(),
    dimension: varchar("dimension", { length: 20 }).notNull(), // tr, cc, lr, wr
    mastery: real("mastery").default(0.1).notNull(),
    practice_count: integer("practice_count").default(0).notNull(),
    last_practiced_at: timestamp("last_practiced_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("ks_student_id_idx").on(table.student_id),
    index("ks_kp_idx").on(table.knowledge_point_id),
    index("ks_student_kp_idx").on(table.student_id, table.knowledge_point_id),
  ]
);

// ============ Student Moment History ============
export const studentMomentHistory = pgTable(
  "student_moment_history",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    moment: varchar("moment", { length: 50 }).notNull(),
    entered_at: timestamp("entered_at", { withTimezone: true }).defaultNow().notNull(),
    exited_at: timestamp("exited_at", { withTimezone: true }),
    trigger_reason: text("trigger_reason"),
  },
  (table) => [
    index("mh_student_id_idx").on(table.student_id),
    index("mh_moment_idx").on(table.moment),
  ]
);

// ============ Practice Sessions ============
export const practiceSessions = pgTable(
  "practice_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    task_type: varchar("task_type", { length: 50 }).notNull(), // writing_task1, writing_task2, speaking, etc.
    task_prompt: text("task_prompt").notNull(),
    status: varchar("status", { length: 30 }).notNull().default("in_progress"), // in_progress, submitted, diagnosed
    phase: varchar("phase", { length: 30 }).notNull().default("try"), // try, scaffold, revise, complete
    content: text("content"),
    revised_content: text("revised_content"),
    word_count: integer("word_count").default(0).notNull(),
    scaffold_level: integer("scaffold_level").default(0).notNull(), // 0=none, 1=hint, 2=guidance, 3=demo
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    submitted_at: timestamp("submitted_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("ps_student_id_idx").on(table.student_id),
    index("ps_status_idx").on(table.status),
    index("ps_created_at_idx").on(table.created_at),
  ]
);

// ============ Diagnosis Results ============
export const diagnosisResults = pgTable(
  "diagnosis_results",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    session_id: varchar("session_id", { length: 36 }).notNull().references(() => practiceSessions.id, { onDelete: "cascade" }),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    // Four dimension scores
    task_response_band: real("task_response_band"),
    coherence_cohesion_band: real("coherence_cohesion_band"),
    lexical_resource_band: real("lexical_resource_band"),
    grammatical_range_band: real("grammatical_range_band"),
    // Dimension details (JSON with strength/weakness for each)
    dimension_details: jsonb("dimension_details"),
    // SOLO level
    solo_level: varchar("solo_level", { length: 30 }),
    solo_justification: text("solo_justification"),
    // Bottlenecks (JSON array)
    bottlenecks: jsonb("bottlenecks"),
    // Sub-skill mastery (JSON array)
    subskill_mastery: jsonb("subskill_mastery"),
    // Recommended practice
    recommended_practice: jsonb("recommended_practice"),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("dr_session_id_idx").on(table.session_id),
    index("dr_student_id_idx").on(table.student_id),
  ]
);

// ============ AI Conversations ============
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 30 }).notNull(), // coach, mentor, partner, analyst
    messages: jsonb("messages").default([]).notNull(),
    current_moment: varchar("current_moment", { length: 50 }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, closed
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("conv_student_id_idx").on(table.student_id),
    index("conv_role_idx").on(table.role),
    index("conv_status_idx").on(table.status),
  ]
);

// ============ Commitments ============
export const commitments = pgTable(
  "commitments",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    target_frequency: integer("target_frequency").notNull(), // times per week
    completed_count: integer("completed_count").default(0).notNull(),
    checkin_count: integer("checkin_count").default(0).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, completed, abandoned
    started_at: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    ended_at: timestamp("ended_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("commit_student_id_idx").on(table.student_id),
    index("commit_status_idx").on(table.status),
  ]
);

// ============ Content Templates (Cron reminders) ============
export const contentTemplates = pgTable(
  "content_templates",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    moment: varchar("moment", { length: 50 }).notNull(),
    slot: varchar("slot", { length: 20 }).notNull(), // morning, midday, evening
    template_text: text("template_text").notNull(),
    is_active: boolean("is_active").default(true).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("ct_moment_slot_idx").on(table.moment, table.slot),
  ]
);

// ============ Student Notification Preferences ============
export const studentNotificationPrefs = pgTable(
  "student_notification_prefs",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    morning_enabled: boolean("morning_enabled").default(true).notNull(),
    midday_enabled: boolean("midday_enabled").default(true).notNull(),
    evening_enabled: boolean("evening_enabled").default(true).notNull(),
    morning_time: varchar("morning_time", { length: 10 }).default("07:00").notNull(),
    midday_time: varchar("midday_time", { length: 10 }).default("10:00").notNull(),
    evening_time: varchar("evening_time", { length: 10 }).default("20:00").notNull(),
    weekend_mode: varchar("weekend_mode", { length: 20 }).default("evening_only").notNull(), // same, delay, evening_only
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("snp_student_id_idx").on(table.student_id),
  ]
);

// ============ Portrait Memories ============
export const portraitMemories = pgTable(
  "portrait_memories",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    student_id: varchar("student_id", { length: 36 }).notNull().references(() => students.id, { onDelete: "cascade" }),
    memory_type: varchar("memory_type", { length: 20 }).notNull(), // fact, preference, trigger, progress, context
    content: text("content").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    dimension: varchar("dimension", { length: 20 }), // cognitive, metacognitive, affective
    source_conversation_id: varchar("source_conversation_id", { length: 36 }),
    status: varchar("status", { length: 20 }).notNull().default("active"), // active, pending_review, archived
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("pm_student_id_idx").on(table.student_id),
    index("pm_type_idx").on(table.memory_type),
    index("pm_status_idx").on(table.status),
  ]
);

// ============ Schema Factory ============
const { createInsertSchema } = createSchemaFactory({ coerce: { date: true } });

export const insertStudentSchema = createInsertSchema(students).pick({
  name: true, email: true, target_band: true, exam_date: true, timezone: true,
});
export type Student = typeof students.$inferSelect;
export type InsertStudent = z.infer<typeof insertStudentSchema>;

export const insertPortraitSchema = createInsertSchema(studentPortraits).pick({
  student_id: true, current_moment: true,
});

export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).pick({
  student_id: true, task_type: true, task_prompt: true,
});

export const insertConversationSchema = createInsertSchema(aiConversations).pick({
  student_id: true, role: true, current_moment: true,
});

export const insertCommitmentSchema = createInsertSchema(commitments).pick({
  student_id: true, title: true, description: true, target_frequency: true,
});
