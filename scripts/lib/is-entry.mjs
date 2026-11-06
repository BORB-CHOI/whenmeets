import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function isEntry(importMetaUrl) {
  if (!process.argv[1]) return false;
  return realpathSync(fileURLToPath(importMetaUrl)) === realpathSync(process.argv[1]);
}
