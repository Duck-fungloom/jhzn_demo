import { relations } from "drizzle-orm/relations";
import { students, commitments, aiConversations, portraitMemories, practiceSessions, diagnosisResults, studentNotificationPrefs, studentKnowledgeStates, studentMomentHistory, studentPortraits } from "./schema";

export const commitmentsRelations = relations(commitments, ({one}) => ({
	student: one(students, {
		fields: [commitments.studentId],
		references: [students.id]
	}),
}));

export const studentsRelations = relations(students, ({many}) => ({
	commitments: many(commitments),
	aiConversations: many(aiConversations),
	portraitMemories: many(portraitMemories),
	diagnosisResults: many(diagnosisResults),
	studentNotificationPrefs: many(studentNotificationPrefs),
	studentKnowledgeStates: many(studentKnowledgeStates),
	practiceSessions: many(practiceSessions),
	studentMomentHistories: many(studentMomentHistory),
	studentPortraits: many(studentPortraits),
}));

export const aiConversationsRelations = relations(aiConversations, ({one}) => ({
	student: one(students, {
		fields: [aiConversations.studentId],
		references: [students.id]
	}),
}));

export const portraitMemoriesRelations = relations(portraitMemories, ({one}) => ({
	student: one(students, {
		fields: [portraitMemories.studentId],
		references: [students.id]
	}),
}));

export const diagnosisResultsRelations = relations(diagnosisResults, ({one}) => ({
	practiceSession: one(practiceSessions, {
		fields: [diagnosisResults.sessionId],
		references: [practiceSessions.id]
	}),
	student: one(students, {
		fields: [diagnosisResults.studentId],
		references: [students.id]
	}),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({one, many}) => ({
	diagnosisResults: many(diagnosisResults),
	student: one(students, {
		fields: [practiceSessions.studentId],
		references: [students.id]
	}),
}));

export const studentNotificationPrefsRelations = relations(studentNotificationPrefs, ({one}) => ({
	student: one(students, {
		fields: [studentNotificationPrefs.studentId],
		references: [students.id]
	}),
}));

export const studentKnowledgeStatesRelations = relations(studentKnowledgeStates, ({one}) => ({
	student: one(students, {
		fields: [studentKnowledgeStates.studentId],
		references: [students.id]
	}),
}));

export const studentMomentHistoryRelations = relations(studentMomentHistory, ({one}) => ({
	student: one(students, {
		fields: [studentMomentHistory.studentId],
		references: [students.id]
	}),
}));

export const studentPortraitsRelations = relations(studentPortraits, ({one}) => ({
	student: one(students, {
		fields: [studentPortraits.studentId],
		references: [students.id]
	}),
}));