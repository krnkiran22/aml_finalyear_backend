import multer from 'multer';
import { MAX_FILE_SIZE_BYTES, ALLOWED_FILE_TYPES } from '../shared';

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype as (typeof ALLOWED_FILE_TYPES)[number])) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${ALLOWED_FILE_TYPES.join(', ')}`));
    }
  },
});
