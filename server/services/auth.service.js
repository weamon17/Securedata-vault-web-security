// server/services/auth.service.js
// Service xử lý nghiệp vụ xác thực.
// LƯU Ý: file này luôn dùng prepared statement + bcrypt (hardened style).
// Phần "vulnerable login" minh hoạ SQL Injection nằm ở routes/vulnerable.routes.js (Step 4),
// và cố ý KHÔNG đi qua service này.

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const config = require('../config');

// Helper tạo error có status/code chuẩn để errorHandler middleware nhận diện.
function err(message, status, code) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

// Đăng ký tài khoản mới. Trả về object user (không kèm password_hash).
async function register({ username, email, password }) {
  // Kiểm tra trùng email hoặc username (case-insensitive nhờ COLLATE NOCASE chưa bật,
  // nên ở đây so trực tiếp — đủ cho demo học thuật).
  const dup = db
    .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
    .get(email, username);
  if (dup) {
    throw err('Email hoặc username đã được sử dụng', 409, 'USER_EXISTS');
  }

  // Hash password bằng bcrypt với cost từ .env (mặc định 12).
  const hash = await bcrypt.hash(password, config.BCRYPT_ROUNDS);

  const res = db
    .prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, 'user')
    `)
    .run(username, email, hash);

  return {
    id: Number(res.lastInsertRowid),
    username,
    email,
    role: 'user',
  };
}

// Đăng nhập: prepared statement + bcrypt.compare.
// Trả về object user nếu hợp lệ; throw 401 nếu sai.
async function login({ email, password }) {
  const row = db
    .prepare(`
      SELECT id, username, email, password_hash, role
      FROM users
      WHERE email = ?
    `)
    .get(email);

  // Trả message giống nhau cho cả 2 trường hợp (không có user / sai password)
  // để tránh user enumeration.
  const fail = () => err('Email hoặc mật khẩu không đúng', 401, 'INVALID_CREDENTIALS');
  if (!row) throw fail();

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) throw fail();

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
  };
}

// Phát hành JWT chứa thông tin định danh tối thiểu.
// Token này sẽ được set vào HttpOnly cookie ở controller.
function issueToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

// Verify JWT, trả về payload đã decode hoặc throw nếu sai/hết hạn.
function verifyToken(token) {
  return jwt.verify(token, config.JWT_SECRET);
}

// Tra cứu user theo id (dùng cho /me và các middleware sau này).
function findById(id) {
  return db
    .prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?')
    .get(id);
}

module.exports = {
  register,
  login,
  issueToken,
  verifyToken,
  findById,
};
