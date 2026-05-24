import { z } from 'zod';

export const verifyPasswordSchema = z.object({
  password: z.string().min(1, '비밀번호가 필요합니다'),
});
