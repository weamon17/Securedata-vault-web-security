// client/src/pages/CsrfDemo.jsx
// Demo CSRF:
//   - vulnerable: chấp nhận GET, không token → trigger được bằng <img src=...>
//   - hardened: bắt POST + verify CSRF token; thiếu token → 403.
//
// Để minh hoạ "thiếu token", FE tạm xoá cookie sv_csrf trước khi POST hardened.

import { useState } from 'react';
import { CompareSplit } from '../components/CompareSplit.jsx';
import { CodeBlock } from '../components/CodeBlock.jsx';
import { csrf } from '../services/labApi.js';
import { bootstrapCsrf } from '../services/api.js';

export function CsrfDemo() {
  const [to, setTo] = useState('attacker');
  const [amount, setAmount] = useState(1000);
  const [vRes, setVRes] = useState(null);
  const [hWithToken, setHWithToken] = useState(null);
  const [hWithoutToken, setHWithoutToken] = useState(null);

  const safeCall = async (fn, setter) => {
    try {
      setter(await fn());
    } catch (e) {
      setter({ error: { code: e.code, status: e.status, message: e.message } });
    }
  };

  const runVulnerableGet = () =>
    safeCall(() => csrf.transferVulnerableGet(to, amount), setVRes);

  const runHardenedWithToken = () =>
    safeCall(() => csrf.transferHardened(to, amount), setHWithToken);

  const runHardenedWithoutToken = async () => {
    // Xoá cookie sv_csrf để mô phỏng request từ origin attacker
    // (không có cookie CSRF cùng giá trị với header).
    document.cookie = 'sv_csrf=; max-age=0; path=/';
    await safeCall(() => csrf.transferHardened(to, amount), setHWithoutToken);
    // Khôi phục cookie để các thao tác sau hoạt động lại bình thường.
    await bootstrapCsrf();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Cross-Site Request Forgery</h1>
      <p className="text-slate-400 mb-4 text-sm max-w-3xl">
        Vulnerable endpoint chấp nhận GET cho state-change — attacker chỉ cần nhúng
        <code className="font-mono"> &lt;img src="..."&gt;</code> vào trang khác là cookie session
        tự được gửi kèm. Hardened bắt POST + double-submit CSRF token + login bắt buộc.
      </p>

      <div className="card border-slate-800 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label">To</label>
            <input className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Amount</label>
            <input
              type="number"
              className="input"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2">
              GET-able + không token. Thực tế attack: kẻ tấn công gửi link/email/page với{' '}
              <code className="font-mono">&lt;img src="/api/vulnerable/transfer?..."&gt;</code>.
            </p>
            <button className="btn-secondary mb-2" onClick={runVulnerableGet}>
              Trigger GET transfer
            </button>
            {vRes && (
              <CodeBlock
                label={vRes.ok ? '200 — transfer thành công (KHÔNG có token)' : 'Response'}
                variant={vRes.ok ? 'error' : 'default'}
              >
                {vRes}
              </CodeBlock>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2">
              Chỉ POST + verify token. 2 case bên dưới: gửi đúng (200) vs xoá cookie trước rồi gửi (403).
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              <button className="btn-secondary" onClick={runHardenedWithToken}>POST + token</button>
              <button className="btn-secondary" onClick={runHardenedWithoutToken}>POST thiếu token</button>
            </div>
            {hWithToken && (
              <CodeBlock
                label="Có token"
                variant={hWithToken.ok ? 'success' : 'default'}
              >
                {hWithToken}
              </CodeBlock>
            )}
            {hWithoutToken && (
              <CodeBlock label="Thiếu token (kỳ vọng 403)" variant="error">
                {hWithoutToken}
              </CodeBlock>
            )}
          </div>
        }
      />
    </div>
  );
}
