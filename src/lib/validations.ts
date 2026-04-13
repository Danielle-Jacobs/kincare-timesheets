import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  idNumber: z.string().optional(),
  contactNumber: z.string().optional(),
});

export const createTimesheetSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

export const timeEntrySchema = z.object({
  day: z.number().min(1).max(31),
  clockIn: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .nullable()
    .optional(),
  clockOut: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:MM format")
    .nullable()
    .optional(),
  carerSignature: z.string().nullable().optional(),
  clientSignature: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const bulkEntriesSchema = z.object({
  timesheetId: z.string().min(1),
  entries: z.array(timeEntrySchema),
});

export const reviewSchema = z.object({
  comment: z.string().optional(),
});

export const createCarerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  idNumber: z.string().optional(),
  contactNumber: z.string().optional(),
});

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type CreateTimesheetInput = z.infer<typeof createTimesheetSchema>;
export type TimeEntryInput = z.infer<typeof timeEntrySchema>;
export type BulkEntriesInput = z.infer<typeof bulkEntriesSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type CreateCarerInput = z.infer<typeof createCarerSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
