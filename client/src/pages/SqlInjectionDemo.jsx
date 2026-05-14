// client/src/pages/SqlInjectionDemo.jsx
// Demo SQL Injection — 2 kịch bản:
//   ① Login Bypass  : payload OR-based bypass authentication
//   ② UNION SELECT  : data exfiltration qua LIKE search

import { useState, useEffect } from 'react';
import { CompareSplit } from '../components/CompareSplit.jsx';
import { CodeBlock } from '../components/CodeBlock.jsx';
import { sqli } from '../services/labApi.js';
import { bootstrapCsrf } from '../services/api.js';

// ─── ① Login Bypass ──────────────────────────────────────────────
function LoginBypassSection() {
  const [email, setEmail]   = useState("admin@securevault.local' OR '1'='1");
  const [password, setPassword] = useState('anything');
  const [vRes, setVRes]     = useState(null);
  const [hRes, setHRes]     = useState(null);
  const [loading, setLoading] = useState(false);

  // Bootstrap CSRF token để hardened POST không bị 403 khi vào trang lần đầu
  useEffect(() => { bootstrapCsrf(); }, []);

  const run = async () => {
    setVRes(null);
    setHRes(null);
    setLoading(true);
    try {
      setVRes(await sqli.loginVulnerable(email, password));
    } catch (e) {
      setVRes({ error: { code: e.code, status: e.status, message: e.message } });
    }
    try {
      setHRes(await sqli.loginHardened(email, password));
    } catch (e) {
      setHRes({ error: { code: e.code, status: e.status, message: e.message, details: e.details } });
    }
    setLoading(false);
  };

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-1">① Login Bypass</h2>
      <p className="text-slate-400 mb-3 text-sm max-w-3xl">
        Payload OR-based biến điều kiện WHERE thành luôn đúng, cho phép đăng nhập mà không cần mật
        khẩu đúng. Hardened dùng prepared statement nên payload chỉ là chuỗi dữ liệu.
      </p>

      <div className="card border-slate-800 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="field-label">Email (payload)</label>
            <input
              className="input font-mono text-xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label">Password (bất kỳ)</label>
            <input
              className="input font-mono text-xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <button className="btn-primary mt-3" onClick={run} disabled={loading}>
          {loading ? 'Đang chạy…' : 'Run both'}
        </button>
        <p className="text-xs text-slate-500 mt-2 font-mono">
          Gợi ý:{' '}
          <code className="font-mono">' OR 1=1 --</code>,{' '}
          <code className="font-mono">admin@x.com' OR '1'='1</code>
        </p>
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ Server nội suy <code className="font-mono">email</code> thẳng vào SQL → điều kiện OR
              luôn đúng → lấy được user đầu tiên trong DB.
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ❌ Anti-pattern
const sql = "SELECT ... WHERE email = '" + email
          + "' AND password_hash = '" + password + "'";`}
            </pre>
            {vRes && (
              <CodeBlock
                label={vRes.ok ? 'Response 200 — login bypassed !' : 'Response'}
                variant={vRes.ok ? 'error' : 'default'}
              >
                {vRes}
              </CodeBlock>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Hardened chặn ở <strong>2 lớp</strong>: validation (email format → 400) trước
              khi đến prepared statement. Payload không bao giờ chạm database.
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ✅ Lớp 1: express-validator
//    isEmail() reject vì payload không phải email hợp lệ → 400
//
// ✅ Lớp 2 (nếu email hợp lệ): prepared statement
//    db.prepare("SELECT ... WHERE email = ?").get(email)
//    payload chỉ là data → không đổi được cấu trúc SQL → 401`}
            </pre>
            {hRes && (
              <CodeBlock
                label={
                  hRes.ok
                    ? 'Response 200'
                    : `Response ${hRes.error?.status ?? ''} — payload bị chặn`
                }
                variant={hRes.ok ? 'success' : 'default'}
              >
                {hRes}
              </CodeBlock>
            )}
          </div>
        }
      />
    </section>
  );
}

// ─── ② UNION SELECT — Data Exfiltration ─────────────────────────
function UnionSelectSection() {
  // Payload: đóng LIKE clause rồi UNION SELECT toàn bộ bảng users
  // 4 cột khớp với: id, user_id, title, content_plaintext
  const DEFAULT_PAYLOAD = "' UNION SELECT id, email, password_hash, role FROM users --";

  const [query, setQuery]     = useState(DEFAULT_PAYLOAD);
  const [vRes, setVRes]       = useState(null);
  const [hRes, setHRes]       = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setVRes(null);
    setHRes(null);
    setLoading(true);
    try {
      setVRes(await sqli.searchVulnerable(query));
    } catch (e) {
      setVRes({ error: { code: e.code, status: e.status, message: e.message } });
    }
    try {
      setHRes(await sqli.searchHardened(query));
    } catch (e) {
      setHRes({ error: { code: e.code, status: e.status, message: e.message } });
    }
    setLoading(false);
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-1">② UNION SELECT — Data Exfiltration</h2>
      <p className="text-slate-400 mb-3 text-sm max-w-3xl">
        Payload UNION SELECT chèn thêm câu SELECT thứ hai vào query tìm kiếm, trả về dữ liệu từ bảng
        khác (ở đây là <code className="font-mono">users</code> — gồm email và password hash). Đây là
        kỹ thuật phổ biến nhất để rò rỉ dữ liệu qua SQLi.
      </p>
      <p className="text-xs text-amber-400/80 mb-4 max-w-3xl">
        💡 Số cột của UNION SELECT phải khớp với query gốc (4 cột:{' '}
        <code className="font-mono">id, user_id, title, content_plaintext</code>).
      </p>

      <div className="card border-slate-800 mb-4">
        <label className="field-label">Search query (payload UNION SELECT)</label>
        <input
          className="input font-mono text-xs"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1 font-mono">
          URL:{' '}
          <span className="text-slate-400">
            /api/vulnerable/search?q={encodeURIComponent(query)}
          </span>
        </p>
        <button className="btn-primary mt-2" onClick={run} disabled={loading}>
          {loading ? 'Đang chạy…' : 'Run both'}
        </button>
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ SQL query nối chuỗi → UNION SELECT trả về toàn bộ bảng{' '}
              <code className="font-mono">users</code> (email + password hash lộ ra).
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ❌ Anti-pattern — raw string concat
const sql =
  "SELECT id, user_id, title, content_plaintext "
+ "FROM vault_items WHERE title LIKE '%" + q + "%'";
// Payload biến thành:
// ... LIKE '%' UNION SELECT id,email,password_hash,role
//     FROM users --%'`}
            </pre>
            {vRes && (
              <CodeBlock
                label={
                  vRes.ok && vRes.data?.rows?.length
                    ? `Response 200 — ${vRes.data.rows.length} row(s) exfiltrated !`
                    : 'Response'
                }
                variant={vRes.ok && vRes.data?.rows?.length ? 'error' : 'default'}
              >
                {vRes}
              </CodeBlock>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Prepared statement: <code className="font-mono">LIKE ?</code> — UNION SELECT bị coi
              là chuỗi tìm kiếm thông thường → 0 kết quả (không match title nào).
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ✅ Prepared statement
db.prepare(
  "SELECT id, user_id, title "
+ "FROM vault_items WHERE title LIKE ? LIMIT 50"
).all(\`%\${q}%\`);
// UNION SELECT không thể thoát khỏi string literal`}
            </pre>
            {hRes && (
              <CodeBlock
                label={
                  hRes.ok
                    ? `Response 200 — ${hRes.data?.rows?.length ?? 0} row(s) (payload bị neutralized)`
                    : 'Response (rejected)'
                }
                variant={hRes.ok ? 'success' : 'default'}
              >
                {hRes}
              </CodeBlock>
            )}
          </div>
        }
      />
    </section>
  );
}

// ─── Export chính ─────────────────────────────────────────────────
export function SqlInjectionDemo() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">SQL Injection</h1>
      <p className="text-slate-400 mb-6 text-sm max-w-3xl">
        OWASP A03:2021 — Injection. Hai kịch bản phổ biến:{' '}
        <strong className="text-slate-300">Login Bypass</strong> (OR-based) và{' '}
        <strong className="text-slate-300">UNION SELECT</strong> (data exfiltration). Hardened dùng
        prepared statement — input chỉ là dữ liệu, không bao giờ được parse như SQL.
      </p>
      <LoginBypassSection />
      <UnionSelectSection />
    </div>
  );
}
