// client/src/pages/CspDemo.jsx
// So sánh response headers giữa vulnerable và hardened.

import { useEffect, useState } from 'react';
import { CompareSplit } from '../components/CompareSplit.jsx';
import { CodeBlock } from '../components/CodeBlock.jsx';
import { headersDemo } from '../services/labApi.js';

export function CspDemo() {
  const [v, setV] = useState(null);
  const [h, setH] = useState(null);

  useEffect(() => {
    headersDemo.vulnerable()
      .then(setV)
      .catch((e) => setV({ error: { code: e.code, message: e.message } }));
    headersDemo.hardened()
      .then(setH)
      .catch((e) => setH({ error: { code: e.code, message: e.message } }));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">CSP & Security Headers</h1>
      <p className="text-slate-400 mb-4 text-sm max-w-3xl">
        Server tự liệt kê header response. Lưu ý: để xem header THỰC SỰ browser nhận
        được, mở DevTools → Network → chọn request → tab Headers.
      </p>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ Không apply helmet → thiếu CSP, X-Frame-Options, X-Content-Type-Options,
              Referrer-Policy. Tăng diện tấn công XSS / clickjacking.
            </p>
            {v && <CodeBlock label="GET /api/vulnerable/headers-demo">{v}</CodeBlock>}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Apply <code className="font-mono">helmet()</code> với CSP explicit:
              <code className="font-mono"> default-src 'self'; script-src 'self'; ...</code>
            </p>
            {h && <CodeBlock label="GET /api/hardened/headers-demo">{h}</CodeBlock>}
          </div>
        }
      />
    </div>
  );
}
