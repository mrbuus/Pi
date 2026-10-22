import { join } from 'path';

// Локал дискний кэш / S3 тохируулаагүй үеийн хадгалалт. Тохируулаагүй бол ./uploads.
// uploads.controller-оос тусад нь — file-store.ts ба controller хоорондын цикл импортоос сэргийлнэ.
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || join(process.cwd(), 'uploads');
