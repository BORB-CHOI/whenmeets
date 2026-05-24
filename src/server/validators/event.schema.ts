import { z } from 'zod';

const dayOfWeekKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dayOfWeekArray = z.array(z.enum(dayOfWeekKeys)).min(1);

const calendarDateArray = z
  .array(
    z
      .string()
      .regex(dateRegex, '잘못된 날짜 형식입니다')
      .refine((d) => {
        const [y, m, day] = d.split('-').map(Number);
        const parsed = new Date(y, m - 1, day);
        return (
          parsed.getFullYear() === y &&
          parsed.getMonth() === m - 1 &&
          parsed.getDate() === day
        );
      }, '유효하지 않은 날짜입니다'),
  )
  .min(1)
  .max(60, '날짜가 너무 많습니다 (최대 60개)');

const datesField = z.union([dayOfWeekArray, calendarDateArray]);

export const eventIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const createEventSchema = z
  .object({
    title: z.string().trim().min(1, '제목과 날짜는 필수입니다').max(200, '제목이 너무 깁니다'),
    dates: datesField,
    time_start: z.number().int().min(0).max(96).optional(),
    time_end: z.number().int().min(0).max(96).optional(),
    password: z.string().min(1).optional(),
    mode: z.enum(['available', 'unavailable']).optional(),
    date_only: z.boolean().optional(),
    start_on_monday: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    const start = val.time_start ?? 36;
    const end = val.time_end ?? 84;
    if (start >= end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '잘못된 시간 범위입니다',
        path: ['time_end'],
      });
    }
  });

export const updateEventSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  dates: datesField.optional(),
  time_start: z.number().int().min(0).max(96).optional(),
  time_end: z.number().int().min(0).max(96).optional(),
  mode: z.enum(['available', 'unavailable']).optional(),
  date_only: z.boolean().optional(),
  description: z.string().optional(),
});

export const activeEventsSchema = z.object({
  ids: z.array(z.string()).max(100).optional(),
});
