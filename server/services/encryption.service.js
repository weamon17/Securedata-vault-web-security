// server/services/encryption.service.js
// Mã hoá dữ liệu nhạy cảm bằng AES-256-GCM.
//
// Vì sao chọn GCM thay vì CBC:
//   - GCM cung cấp đồng thời tính bí mật (confidentiality) và tính toàn vẹn
//     (authenticity) qua authentication tag → phát hiện được ciphertext bị
//     chỉnh sửa.
//   - CBC không có authentication → phải tự thêm HMAC (mac-then-encrypt /
//     encrypt-then-mac), dễ implement sai (padding oracle attack).
//
// Cấu trúc payload lưu trong DB (cột content_encrypted):
//
//     base64( IV (12 bytes)  ||  TAG (16 bytes)  ||  CIPHERTEXT (n bytes) )
//
//   - IV (nonce) 12 bytes ngẫu nhiên: bắt buộc unique cho mỗi lần encrypt
//     với cùng key. Random 12 bytes có entropy đủ tránh trùng trong thực tế.
//   - TAG 16 bytes (128 bit): authentication tag do GCM tự sinh.
//   - Ciphertext: phần còn lại.

const crypto = require('crypto');
const config = require('../config');

const ALGO = 'aes-256-gcm';
const KEY_LEN_BYTES = 32;   // 256-bit key
const IV_LEN  = 12;          // chuẩn của GCM
const TAG_LEN = 16;          // 128-bit auth tag

// Đọc key từ config. Throw rõ ràng nếu thiếu / sai format → controller
// sẽ chuyển thành 500 INTERNAL_ERROR và không leak chi tiết.
function getKey() {
  const hex = config.ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    const e = new Error(
      'ENCRYPTION_KEY chưa được cấu hình hoặc không đúng định dạng (cần 64 ký tự hex = 32 bytes)'
    );
    e.status = 500;
    e.code = 'ENCRYPTION_KEY_INVALID';
    throw e;
  }
  const buf = Buffer.from(hex, 'hex');
  if (buf.length !== KEY_LEN_BYTES) {
    const e = new Error('ENCRYPTION_KEY phải dài đúng 32 bytes');
    e.status = 500;
    e.code = 'ENCRYPTION_KEY_INVALID';
    throw e;
  }
  return buf;
}

// Mã hoá một chuỗi plaintext → base64 payload.
// Trả null nếu input null/undefined để service layer xử lý null cleanly.
function encrypt(plaintext) {
  if (plaintext === null || plaintext === undefined) return null;

  const key = getKey();
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);

  const ct = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Ghép IV || TAG || CT rồi base64 → 1 cột TEXT trong SQLite.
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

// Giải mã base64 payload → plaintext string.
// Throw 500 DECRYPT_FAILED nếu payload không hợp lệ hoặc đã bị tampering
// (GCM tự reject ở decipher.final()).
function decrypt(payloadB64) {
  if (payloadB64 === null || payloadB64 === undefined || payloadB64 === '') return null;

  const buf = Buffer.from(payloadB64, 'base64');
  if (buf.length < IV_LEN + TAG_LEN) {
    const e = new Error('Payload mã hoá quá ngắn');
    e.status = 500;
    e.code = 'DECRYPT_FAILED';
    throw e;
  }

  const iv  = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct  = buf.subarray(IV_LEN + TAG_LEN);

  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);

  try {
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString('utf8');
  } catch (_) {
    // GCM ném "Unsupported state or unable to authenticate data" khi tag sai.
    const e = new Error('Không giải mã được dữ liệu (sai key hoặc dữ liệu đã bị chỉnh sửa)');
    e.status = 500;
    e.code = 'DECRYPT_FAILED';
    throw e;
  }
}

module.exports = { encrypt, decrypt, ALGO };
