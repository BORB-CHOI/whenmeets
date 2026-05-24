import { z } from 'zod';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidString = z.string().regex(UUID, '잘못된 ID입니다');

export const folderIdParamsSchema = z.object({
  id: uuidString,
});

export const folderNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '폴더 이름을 입력해주세요')
    .max(40, '폴더 이름이 너무 깁니다'),
});

export const assignEventFolderSchema = z.object({
  folder_id: z.union([uuidString, z.null()]),
});

export const reorderFoldersSchema = z.object({
  order: z
    .array(
      z.object({
        key: z.string().min(1),
        position: z.number().int(),
      }),
    )
    .min(1),
});

export const reorderEventsSchema = z.object({
  updates: z
    .array(
      z.object({
        event_id: z.string().min(1),
        folder_id: z.union([uuidString, z.null()]),
        position: z.number().int(),
      }),
    )
    .min(1)
    .max(500, '한 번에 변경 가능한 이벤트 수를 초과했습니다'),
});
