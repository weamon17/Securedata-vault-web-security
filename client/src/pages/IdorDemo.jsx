// client/src/pages/IdorDemo.jsx
// Demo IDOR. Login với user demo (id=2), thử query item id=1 hoặc các id khác.
// Hardened sẽ trả 404 vì WHERE id = ? AND user_id = ?.

import { useState } from 'react';
import { CompareSplit } from '../components/CompareSplit.jsx';
import { CodeBlock } from '../components/CodeBlock.jsx';
import { idor } from '../services/labApi.js';

export function IdorDemo() {
  const [id, setId] = useState(1);
  const [vRes, setVRes] = useState(null);
  const [hRes, setHRes] = useState(null);

  const run = async () => {
    setVRes(null);
    setHRes(null);
    try {
      setVRes(await idor.vulnerable(id));
    } catch (e) {
      setVRes({ error: { code: e.code, status: e.status, message: e.message } });
    }
    try {
      setHRes(await idor.hardened(id));
    } catch (e) {
      setHRes({ error: { code: e.code, status: e.status, message: e.message } });
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">IDOR — Insecure Direct Object Reference</h1>
      <p className="text-slate-400 mb-4 text-sm max-w-3xl">
        Đổi id để truy vấn item bất kỳ. Hardened endpoint chỉ trả về item thuộc về
        user hiện tại (login mới có req.user). Để demo cross-user, tạo item ở user A
        (id=2), login user B, rồi gọi với id của user A.
      </p>

      <div className="card border-slate-800 mb-4 flex items-end gap-2">
        <div>
          <label className="field-label">Item ID</label>
          <input
            type="number"
            className="input w-32"
            value={id}
            onChange={(e) => setId(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <button className="btn-primary" onClick={run}>Truy vấn cả 2</button>
      </div>

      <CompareSplit
        vulnerable={
          <div>
            <p className="text-sm mb-2 text-red-400">
              ⚠ Query <code className="font-mono">WHERE id = ?</code> — không có owner check.
            </p>
            {vRes && (
              <CodeBlock label="GET /api/vulnerable/vault/:id" variant={vRes.ok ? 'error' : 'default'}>
                {vRes}
              </CodeBlock>
            )}
          </div>
        }
        hardened={
          <div>
            <p className="text-sm mb-2 text-emerald-400">
              ✓ Query <code className="font-mono">WHERE id = ? AND user_id = ?</code> + requireAuth.
              Trả 404 ngay cả khi item tồn tại — chống item enumeration.
            </p>
            {hRes && (
              <CodeBlock label="GET /api/hardened/vault/:id" variant={hRes.ok ? 'success' : 'default'}>
                {hRes}
              </CodeBlock>
            )}
          </div>
        }
      />
    </div>
  );
}
