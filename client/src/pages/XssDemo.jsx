// client/src/pages/XssDemo.jsx
// Demo Cross-Site Scripting — Stored XSS + Reflected XSS.
//
// Stored  : payload lưu vào in-memory store, render lại mỗi lần tải trang.
// Reflected: payload nhúng vào URL (?msg=), server echo lại ngay trong response.
//
// Hardened side áp dụng 2 lớp phòng thủ:
//   1. Server-side  : escapeHtml() trước khi trả về
//   2. Client-side  : DOMPurify.sanitize() trước khi đưa vào DOM

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { CompareSplit } from '../components/CompareSplit.jsx';
import { xss } from '../services/labApi.js';

// ─── ① Stored XSS ────────────────────────────────────────────────
function StoredXssSection() {
  const [payload, setPayload] = useState('<img src=x onerror="alert(\'XSS - Stored!\')">');
  const [vList, setVList]     = useState([]);
  const [hList, setHList]     = useState([]);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    try {
      const v = await xss.listCommentsVulnerable();
      setVList(v.data.comments);
    } catch (_) {}
    try {
      const h = await xss.listCommentsHardened();
      setHList(h.data.comments);
    } catch (_) {}
  };

  useEffect(() => { refresh(); }, []);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await xss.addCommentVulnerable(payload);
    } catch (e) {
      setError('Vulnerable POST: ' + e.message);
    }
    try {
      await xss.addCommentHardened(payload);
    } catch (e) {
      setError((prev) => (prev ? prev + ' | ' : '') + 'Hardened POST: ' + e.message);
    }
    await refresh();
    setLoading(false);
  };

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-1">① Stored XSS</h2>
      <p className="text-slate-400 mb-3 text-sm max-w-3xl">
        Payload được lưu vào server-side store, render lại mỗi lần user truy cập. Bên Vulnerable
        dùng <code className="font-mono">dangerouslySetInnerHTML</code> trực tiếp; bên Hardened: server
        escape entities + client <code className="font-mono">DOMPurify.sanitize()</code>.
      </p>
      <p className="text-xs text-amber-400/80 mb-4 max-w-3xl">
        💡 Lưu ý: tag <code className="font-mono">&lt;script&gt;</code> chèn qua innerHTML KHÔNG chạy
        theo HTML spec; dùng <code className="font-mono">&lt;img onerror&gt;</code> hoặc{' '}
        <code className="font-mono">&lt;svg onload&gt;</code> để kích hoạt.
      </p>

      <div className="card border-slate-800 mb-4">
        <label className="field-label">Payload (HTML)</label>
        <textarea
          className="input font-mono text-xs"
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
          rows={3}
        />
        <button className="btn-primary mt-2" onClick={submit} disabled={loading}>
          {loading ? 'Đang gửi…' : 'Submit cho cả 2 endpoint'}
        </button>
        {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ <code className="font-mono">dangerouslySetInnerHTML</code> → sự kiện{' '}
              <code className="font-mono">onerror</code>/<code className="font-mono">onload</code> kích
              hoạt khi element được mount.
            </p>
            {/* Hiển thị snippet code minh họa anti-pattern */}
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ❌ Anti-pattern
<span dangerouslySetInnerHTML={{ __html: c.body }} />`}
            </pre>
            {vList.length === 0 ? (
              <div className="text-sm text-slate-500">Chưa có comment.</div>
            ) : (
              <ul className="space-y-2">
                {vList.map((c) => (
                  <li
                    key={c.id}
                    className="text-sm border border-red-900/50 rounded-lg p-2 bg-red-950/30"
                  >
                    <span className="text-xs text-slate-500 font-mono">{c.author}:</span>{' '}
                    {/* CỐ Ý render raw HTML để minh hoạ XSS */}
                    <span dangerouslySetInnerHTML={{ __html: c.body }} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Server <code className="font-mono">escapeHtml()</code> + Client{' '}
              <code className="font-mono">DOMPurify.sanitize()</code> — 2 lớp phòng thủ.
            </p>
            {/* Hiển thị snippet code minh họa pattern an toàn */}
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ✅ Server: escapeHtml(body) trước khi trả về
// ✅ Client: DOMPurify.sanitize() thêm 1 lớp nữa
<span dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(c.body)
}} />`}
            </pre>
            {hList.length === 0 ? (
              <div className="text-sm text-slate-500">Chưa có comment.</div>
            ) : (
              <ul className="space-y-2">
                {hList.map((c) => (
                  <li
                    key={c.id}
                    className="text-sm border border-emerald-900/50 rounded-lg p-2 bg-emerald-950/30 font-mono break-words text-slate-300"
                  >
                    <span className="text-xs text-slate-500">{c.author}:</span>{' '}
                    {/* Hardened: DOMPurify loại bỏ script/event handler */}
                    <span
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(c.body) }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />
    </section>
  );
}

// ─── ② Reflected XSS ─────────────────────────────────────────────
function ReflectedXssSection() {
  const [msg, setMsg]         = useState('<img src=x onerror="alert(\'XSS - Reflected!\')">');
  const [vResult, setVResult] = useState(null);
  const [hResult, setHResult] = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError(null);
    setLoading(true);
    setVResult(null);
    setHResult(null);
    try {
      const r = await xss.echoVulnerable(msg);
      setVResult(r.data);
    } catch (e) {
      setError('Vulnerable: ' + e.message);
    }
    try {
      const r = await xss.echoHardened(msg);
      setHResult(r.data);
    } catch (e) {
      setError((prev) => (prev ? prev + ' | ' : '') + 'Hardened: ' + e.message);
    }
    setLoading(false);
  };

  return (
    <section>
      <h2 className="text-lg font-semibold text-white mb-1">② Reflected XSS</h2>
      <p className="text-slate-400 mb-3 text-sm max-w-3xl">
        Payload nhúng trong URL (<code className="font-mono">?msg=…</code>), server echo lại ngay trong
        response mà không lưu. Nếu FE render trực tiếp qua <code className="font-mono">innerHTML</code>{' '}
        → script thực thi tức thì. Kịch bản thực tế: attacker gửi link độc hại cho nạn nhân.
      </p>

      <div className="card border-slate-800 mb-4">
        <label className="field-label">Payload (gửi qua URL param ?msg=)</label>
        <input
          className="input font-mono text-xs"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
        />
        <p className="text-xs text-slate-500 mt-1 font-mono">
          URL tương đương: <span className="text-slate-400">/api/vulnerable/echo?msg={encodeURIComponent(msg)}</span>
        </p>
        <button className="btn-primary mt-2" onClick={run} disabled={loading}>
          {loading ? 'Đang gọi…' : 'Gửi cho cả 2 endpoint'}
        </button>
        {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ Server trả về <code className="font-mono">echoed</code> chưa escape → FE render bằng{' '}
              <code className="font-mono">innerHTML</code> → script kích hoạt ngay.
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ❌ Server: res.json({ echoed: req.query.msg })
// ❌ Client: el.innerHTML = echoed`}
            </pre>
            {vResult ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">JSON response từ server:</div>
                <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(vResult, null, 2)}
                </pre>
                <div className="text-xs text-slate-500">Kết quả khi render bằng innerHTML:</div>
                {/* CỐ Ý dùng innerHTML để minh hoạ Reflected XSS */}
                <div
                  className="border border-red-900/50 rounded p-2 bg-red-950/20 text-sm text-slate-300 min-h-[2rem]"
                  dangerouslySetInnerHTML={{ __html: vResult.echoed }}
                />
              </div>
            ) : (
              <div className="text-sm text-slate-500">Chưa có kết quả. Nhấn &quot;Gửi&quot; để chạy.</div>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Server escape entities + Client <code className="font-mono">DOMPurify.sanitize()</code>{' '}
              → payload hiển thị như text thuần, không thực thi.
            </p>
            <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-400 mb-3 overflow-x-auto">
{`// ✅ Server: escapeHtml(req.query.msg)
// ✅ Client: DOMPurify.sanitize(echoed)  ← double defense`}
            </pre>
            {hResult ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-500">JSON response từ server (đã escaped):</div>
                <pre className="text-xs bg-slate-900 rounded p-2 font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(hResult, null, 2)}
                </pre>
                <div className="text-xs text-slate-500">Sau DOMPurify.sanitize() — hiển thị an toàn:</div>
                <div
                  className="border border-emerald-900/50 rounded p-2 bg-emerald-950/20 text-sm text-slate-300 font-mono break-words min-h-[2rem]"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(hResult.echoed) }}
                />
              </div>
            ) : (
              <div className="text-sm text-slate-500">Chưa có kết quả. Nhấn &quot;Gửi&quot; để chạy.</div>
            )}
          </div>
        }
      />
    </section>
  );
}

// ─── Export chính ─────────────────────────────────────────────────
export function XssDemo() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-1">Cross-Site Scripting (XSS)</h1>
      <p className="text-slate-400 mb-6 text-sm max-w-3xl">
        OWASP A03:2021 — Injection. Hai loại XSS được minh hoạ:{' '}
        <strong className="text-slate-300">Stored</strong> (payload lưu vào DB/store) và{' '}
        <strong className="text-slate-300">Reflected</strong> (payload qua URL). Phòng thủ: server
        escape HTML + client <code className="font-mono">DOMPurify</code> + CSP header.
      </p>
      <StoredXssSection />
      <ReflectedXssSection />
    </div>
  );
}
