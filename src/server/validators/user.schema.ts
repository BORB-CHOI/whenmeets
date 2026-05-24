import { z } from 'zod';

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름이 너무 깁니다'),
});
