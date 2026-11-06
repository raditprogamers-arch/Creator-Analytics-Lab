import { z } from "zod";

export const ContentRowSchema = z.object({
  externalId: z.string().min(1, "External ID cannot be empty"),
  title: z.string().min(1, "Title cannot be empty"),
  contentType: z.string().default("other"),
  language: z.string().nullable().optional(),
  publishedAt: z.date().nullable().optional(),
  contentUrl: z.string().nullable().optional(),
});

export const MetricValueSchema = z.record(
  z.string(),
  z
    .number()
    .nullable()
    .refine((val) => val === null || val >= 0, {
      message: "Metric values cannot be negative",
    })
);

export interface ValidationItemError {
  rowIndex: number;
  reason: string;
  rawData: Record<string, unknown>;
}

export interface ValidationSummary {
  isValid: boolean;
  totalCount: number;
  validCount: number;
  rejectedCount: number;
  rejectedRows: ValidationItemError[];
}

