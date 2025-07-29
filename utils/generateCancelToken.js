// 📁 utils/generateCancelToken.js
import crypto from 'crypto';

export function generateCancelToken() {
  return crypto.randomBytes(20).toString('hex');
}
