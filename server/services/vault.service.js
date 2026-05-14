// server/services/vault.service.js
// Nghiệp vụ CRUD cho vault_items với 2 đặc tính bảo mật:
//   1. Encryption at rest: mọi item tạo qua /api/vault sẽ được encrypt
//      bằng AES-256-GCM trước khi ghi DB. Khi đọc ra sẽ decrypt tự động.
//   2. Ownership check: mọi query đều có "AND user_id = ?" để chống IDOR.
//
// Lưu ý: bảng vault_items vẫn có cột content_plaintext để seed/vulnerable
// demo dùng. Service này KHÔNG bao giờ ghi vào content_plaintext — chỉ
// đọc nó khi is_encrypted=0 (cho các item seed sẵn).

const db = require('../db/database');
const { encrypt, decrypt } = require('./encryption.service');

function err(message, status, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

// Đọc list (không decrypt content) cho trang danh sách.
function listByUser(userId, { limit = 100, offset = 0 } = {}) {
  return db
    .prepare(`
      SELECT id, title, is_encrypted, created_at, updated_at
      FROM vault_items
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `)
    .all(userId, limit, offset);
}

// Đọc 1 item kèm content đã decrypt. Throw 404 nếu không thuộc user.
function getById(userId, id) {
  const row = db
    .prepare(`
      SELECT id, user_id, title, content_plaintext, content_encrypted,
             is_encrypted, created_at, updated_at
      FROM vault_items
      WHERE id = ? AND user_id = ?
    `)
    .get(id, userId);

  if (!row) {
    throw err('Item không tồn tại hoặc bạn không có quyền truy cập', 404, 'NOT_FOUND');
  }

  // Branch: item cũ (seed) lưu plaintext vs item mới lưu ciphertext.
  const content = row.is_encrypted
    ? decrypt(row.content_encrypted)
    : row.content_plaintext;

  return {
    id: row.id,
    title: row.title,
    content,
    isEncrypted: !!row.is_encrypted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Tạo mới: LUÔN encrypt content, lưu is_encrypted=1.
function create(userId, { title, content }) {
  const enc = encrypt(content);
  const res = db
    .prepare(`
      INSERT INTO vault_items
        (user_id, title, content_plaintext, content_encrypted, is_encrypted)
      VALUES (?, ?, NULL, ?, 1)
    `)
    .run(userId, String(title), enc);
  return getById(userId, Number(res.lastInsertRowid));
}

// Cập nhật: kiểm tra ownership trước, sau đó re-encrypt content mới.
// Cũng dọn content_plaintext nếu item cũ vốn là seed plaintext.
function update(userId, id, { title, content }) {
  const owned = db
    .prepare('SELECT id FROM vault_items WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!owned) {
    throw err('Item không tồn tại hoặc bạn không có quyền truy cập', 404, 'NOT_FOUND');
  }

  const enc = encrypt(content);
  db.prepare(`
    UPDATE vault_items
    SET title             = ?,
        content_plaintext = NULL,
        content_encrypted = ?,
        is_encrypted      = 1,
        updated_at        = datetime('now')
    WHERE id = ? AND user_id = ?
  `).run(String(title), enc, id, userId);

  return getById(userId, id);
}

// Xoá: kiểm tra ownership qua WHERE — nếu 0 row bị xoá tức là không thuộc user.
function remove(userId, id) {
  const res = db
    .prepare('DELETE FROM vault_items WHERE id = ? AND user_id = ?')
    .run(id, userId);
  if (res.changes === 0) {
    throw err('Item không tồn tại hoặc bạn không có quyền truy cập', 404, 'NOT_FOUND');
  }
  return { id, deleted: true };
}

// Dùng cho dashboard analytics ở Step 9.
function countEncryptedByUser(userId) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM vault_items WHERE user_id = ? AND is_encrypted = 1')
    .get(userId).c;
}

module.exports = {
  listByUser,
  getById,
  create,
  update,
  remove,
  countEncryptedByUser,
};
