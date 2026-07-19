import { pgTable, index, foreignKey, varchar, text, integer, timestamp, serial, boolean, jsonb, real, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const commitments = pgTable("commitments", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	targetFrequency: integer("target_frequency").notNull(),
	completedCount: integer("completed_count").default(0).notNull(),
	checkinCount: integer("checkin_count").default(0).notNull(),
	status: varchar({ length: 20 }).default('active').notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	endedAt: timestamp("ended_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("commit_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("commit_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "commitments_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const contentTemplates = pgTable("content_templates", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	moment: varchar({ length: 50 }).notNull(),
	slot: varchar({ length: 20 }).notNull(),
	templateText: text("template_text").notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ct_moment_slot_idx").using("btree", table.moment.asc().nullsLast().op("text_ops"), table.slot.asc().nullsLast().op("text_ops")),
]);

export const aiConversations = pgTable("ai_conversations", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	role: varchar({ length: 30 }).notNull(),
	messages: jsonb().default([]).notNull(),
	currentMoment: varchar("current_moment", { length: 50 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("conv_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
	index("conv_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("conv_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "ai_conversations_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const portraitMemories = pgTable("portrait_memories", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	memoryType: varchar("memory_type", { length: 20 }).notNull(),
	content: text().notNull(),
	confidence: real().default(0.5).notNull(),
	dimension: varchar({ length: 20 }),
	sourceConversationId: varchar("source_conversation_id", { length: 36 }),
	status: varchar({ length: 20 }).default('active').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("pm_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("pm_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	index("pm_type_idx").using("btree", table.memoryType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "portrait_memories_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const diagnosisResults = pgTable("diagnosis_results", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 36 }).notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	taskResponseBand: real("task_response_band"),
	coherenceCohesionBand: real("coherence_cohesion_band"),
	lexicalResourceBand: real("lexical_resource_band"),
	grammaticalRangeBand: real("grammatical_range_band"),
	dimensionDetails: jsonb("dimension_details"),
	soloLevel: varchar("solo_level", { length: 30 }),
	soloJustification: text("solo_justification"),
	bottlenecks: jsonb(),
	subskillMastery: jsonb("subskill_mastery"),
	recommendedPractice: jsonb("recommended_practice"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("dr_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("dr_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [practiceSessions.id],
			name: "diagnosis_results_session_id_practice_sessions_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "diagnosis_results_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const studentNotificationPrefs = pgTable("student_notification_prefs", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	morningEnabled: boolean("morning_enabled").default(true).notNull(),
	middayEnabled: boolean("midday_enabled").default(true).notNull(),
	eveningEnabled: boolean("evening_enabled").default(true).notNull(),
	morningTime: varchar("morning_time", { length: 10 }).default('07:00').notNull(),
	middayTime: varchar("midday_time", { length: 10 }).default('10:00').notNull(),
	eveningTime: varchar("evening_time", { length: 10 }).default('20:00').notNull(),
	weekendMode: varchar("weekend_mode", { length: 20 }).default('evening_only').notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("snp_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_notification_prefs_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const studentKnowledgeStates = pgTable("student_knowledge_states", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	knowledgePointId: varchar("knowledge_point_id", { length: 50 }).notNull(),
	name: varchar({ length: 128 }).notNull(),
	dimension: varchar({ length: 20 }).notNull(),
	mastery: real().default(0.1).notNull(),
	practiceCount: integer("practice_count").default(0).notNull(),
	lastPracticedAt: timestamp("last_practiced_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ks_kp_idx").using("btree", table.knowledgePointId.asc().nullsLast().op("text_ops")),
	index("ks_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	index("ks_student_kp_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops"), table.knowledgePointId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_knowledge_states_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const practiceSessions = pgTable("practice_sessions", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	taskType: varchar("task_type", { length: 50 }).notNull(),
	taskPrompt: text("task_prompt").notNull(),
	status: varchar({ length: 30 }).default('in_progress').notNull(),
	phase: varchar({ length: 30 }).default('try').notNull(),
	content: text(),
	revisedContent: text("revised_content"),
	wordCount: integer("word_count").default(0).notNull(),
	scaffoldLevel: integer("scaffold_level").default(0).notNull(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	submittedAt: timestamp("submitted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("ps_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
	index("ps_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("ps_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "practice_sessions_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const studentMomentHistory = pgTable("student_moment_history", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	moment: varchar({ length: 50 }).notNull(),
	enteredAt: timestamp("entered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	exitedAt: timestamp("exited_at", { withTimezone: true, mode: 'string' }),
	triggerReason: text("trigger_reason"),
}, (table) => [
	index("mh_moment_idx").using("btree", table.moment.asc().nullsLast().op("text_ops")),
	index("mh_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_moment_history_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const studentPortraits = pgTable("student_portraits", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	studentId: varchar("student_id", { length: 36 }).notNull(),
	currentMoment: varchar("current_moment", { length: 50 }).default('entry_confusion').notNull(),
	cognitiveScore: real("cognitive_score").default(50).notNull(),
	metacognitiveScore: real("metacognitive_score").default(50).notNull(),
	affectiveScore: real("affective_score").default(50).notNull(),
	behavioralScore: real("behavioral_score").default(50).notNull(),
	socialScore: real("social_score").default(50).notNull(),
	bandHistory: jsonb("band_history").default([]),
	anxietyLevel: real("anxiety_level").default(30).notNull(),
	nightModeActive: boolean("night_mode_active").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	targetBand: real("target_band"),
	examDate: timestamp("exam_date", { withTimezone: true, mode: 'string' }),
	timezone: text().default('Asia/Shanghai'),
	totalPractices: integer("total_practices").default(0),
	completedDiagnoses: integer("completed_diagnoses").default(0),
	trBand: real("tr_band").default(0),
	ccBand: real("cc_band").default(0),
	lrBand: real("lr_band").default(0),
	grBand: real("gr_band").default(0),
	knowledgeConnectivity: real("knowledge_connectivity").default(0),
	recentBands: jsonb("recent_bands").default([]),
	momentEnteredAt: timestamp("moment_entered_at", { withTimezone: true, mode: 'string' }),
	momentDurationDays: integer("moment_duration_days").default(0),
	completedMoments: jsonb("completed_moments").default([]),
	lastNightModeTriggeredAt: timestamp("last_night_mode_triggered_at", { withTimezone: true, mode: 'string' }),
}, (table) => [
	index("portraits_moment_idx").using("btree", table.currentMoment.asc().nullsLast().op("text_ops")),
	index("portraits_student_id_idx").using("btree", table.studentId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "student_portraits_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const students = pgTable("students", {
	id: varchar({ length: 36 }).default(gen_random_uuid()).primaryKey().notNull(),
	name: varchar({ length: 128 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	avatarUrl: text("avatar_url"),
	targetBand: real("target_band"),
	examDate: timestamp("exam_date", { withTimezone: true, mode: 'string' }),
	timezone: varchar({ length: 64 }).default('Asia/Shanghai').notNull(),
	registeredAt: timestamp("registered_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	onboardingCompleted: boolean("onboarding_completed").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	role: text().default('student'),
	phone: text(),
}, (table) => [
	index("students_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	unique("students_email_unique").on(table.email),
]);
