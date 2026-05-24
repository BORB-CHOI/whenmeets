import { z } from 'zod';

export const participantParamsSchema = z.object({
  id: z.string().min(1),
});

export const participantPidParamsSchema = z.object({
  id: z.string().min(1),
  pid: z.string().min(1),
});

export const joinParticipantSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50, '이름이 너무 깁니다'),
  password: z.string().optional(),
});

export const availabilitySchema = z.record(
  z.string(),
  z.record(z.string(), z.union([z.literal(0), z.literal(1), z.literal(2)])),
);

export const updateAvailabilitySchema = z.object({
  availability: availabilitySchema.refine(
    (val) => Object.keys(val).length <= 60,
    '응답에 날짜가 너무 많습니다',
  ),
  password: z.string().optional(),
});

export const deleteParticipantSchema = z
  .object({
    password: z.string().optional(),
  })
  .optional();
