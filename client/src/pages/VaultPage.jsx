// client/src/pages/VaultPage.jsx
// CRUD vault items — mọi item đều được backend mã hoá AES-256-GCM.

import { useEffect, useState } from 'react';
import { Lock, Plus, Pencil, Trash2, Eye, ShieldCheck, FileText, X, AlertCircle } from 'lucide-react';
import * as vaultApi from '../services/vaultApi.js';
import { formatDateTime } from '../utils/formatters.js';
import { useToast } from '../components/Toast.jsx';
import { ConfirmModal } from '../components/ConfirmModal.jsx';

export function VaultPage() {
  const toast = useToast();

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [form, setForm]           = useState({ title: '', content: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [selected, setSelected]   = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, title: '' });

  const load = async () => {
    setLoading(true);
    try {
      setItems(await vaultApi.listItems());
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ title: '', content: '' });
    setFieldErrors({});
    setEditingId(null);
  };

  const updateField = (k) => (e) => {
    setForm((prev) => ({ ...prev, [k]: e.target.value }));
    if (fieldErrors[k]) {
      setFieldErrors((prev) => { const { [k]: _, ...rest } = prev; return rest; });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    const errs = {};
    if (!form.title.trim()) errs.title = 'Tiêu đề không được để trống.';
    else if (form.title.length > 200) errs.title = 'Tiêu đề tối đa 200 ký tự.';
    if (!form.content.trim()) errs.content = 'Nội dung không được để trống.';
    else if (form.content.length > 10000) errs.content = 'Nội dung tối đa 10 000 ký tự.';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }

    setSubmitting(true);
    try {
      if (editingId) {
        await vaultApi.updateItem(editingId, form);
      } else {
        await vaultApi.createItem(form);
      }
      resetForm();
      await load();
      toast.success(editingId ? 'Đã cập nhật item.' : 'Đã tạo và mã hoá item mới.');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const view = async (id) => {
    setError(null);
    try { setSelected(await vaultApi.getItem(id)); }
    catch (e) { setError(e.message); }
  };

  const startEdit = async (id) => {
    setError(null);
    try {
      const item = await vaultApi.getItem(id);
      setForm({ title: item.title, content: item.content });
      setEditingId(id);
      setSelected(item);
    } catch (e) { setError(e.message); }
  };

  const askDelete = (id) => {
    const item = items.find((i) => i.id === id);
    setDeleteConfirm({ open: true, id, title: item?.title || `#${id}` });
  };

  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null, title: '' });
    try {
      await vaultApi.deleteItem(id);
      if (selected?.id === id) setSelected(null);
      if (editingId === id) resetForm();
      await load();
      toast.success('Đã xoá item.');
    } catch (e) {
      setError(e.message);
      toast.error(e.message);
    }
  };

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Lock className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">My Vault</h1>
          <p className="text-xs text-slate-500">Lưu trữ mã hoá AES-256-GCM · {items.length} items</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">

        {/* Cột 1: form tạo/sửa */}
        <div className="lg:col-span-1">
          <div className="card border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white flex items-center gap-2">
                {editingId ? <><Pencil className="w-4 h-4 text-indigo-400" /> Sửa item #{editingId}</> : <><Plus className="w-4 h-4 text-emerald-400" /> Tạo item mới</>}
              </h2>
              {editingId && (
                <button onClick={resetForm} className="btn-ghost btn-sm p-1">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <form onSubmit={submit} noValidate className="space-y-3">
              <div>
                <label className="field-label">Tiêu đề</label>
                <input
                  className={`input ${fieldErrors.title ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="VD: API Key, Password..."
                  value={form.title}
                  onChange={updateField('title')}
                />
                {fieldErrors.title && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.title}
                  </div>
                )}
              </div>
              <div>
                <label className="field-label">Nội dung bí mật</label>
                <textarea
                  className={`input min-h-[140px] resize-none ${fieldErrors.content ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30' : ''}`}
                  placeholder="Sẽ được mã hoá AES-256-GCM trước khi lưu DB"
                  value={form.content}
                  onChange={updateField('content')}
                />
                {fieldErrors.content && (
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {fieldErrors.content}
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-600">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Nội dung được mã hoá trước khi lưu
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang lưu...
                  </span>
                ) : editingId ? (
                  <><Pencil className="w-4 h-4" /> Cập nhật</>
                ) : (
                  <><Plus className="w-4 h-4" /> Tạo & Mã hoá</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Cột 2: danh sách */}
        <div className="lg:col-span-1 space-y-2">
          <div className="section-title">Danh sách items</div>

          {loading ? (
            <div className="card border-slate-800 text-center py-8 text-slate-500 text-sm">
              <span className="w-5 h-5 border-2 border-slate-600 border-t-indigo-500 rounded-full animate-spin inline-block mb-2" />
              <div>Đang tải...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="card border-dashed border-slate-700 text-center py-10">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Chưa có item nào.</p>
              <p className="text-xs text-slate-600 mt-1">Tạo item đầu tiên →</p>
            </div>
          ) : (
            items.map((it) => (
              <div
                key={it.id}
                className={`card border-slate-800 flex items-center justify-between gap-3 cursor-pointer transition-all
                  ${selected?.id === it.id ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'hover:border-slate-700'}`}
                onClick={() => view(it.id)}
              >
                <div className="min-w-0 flex items-start gap-2.5">
                  <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${it.is_encrypted ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-amber-500/10 border border-amber-500/20'}`}>
                    <Lock className={`w-3.5 h-3.5 ${it.is_encrypted ? 'text-emerald-400' : 'text-amber-400'}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-slate-200 truncate">{it.title}</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      #{it.id} · {formatDateTime(it.updated_at || it.created_at)}
                    </div>
                    <div className="mt-1">
                      {it.is_encrypted ? (
                        <span className="badge-emerald text-[10px]">AES-256-GCM</span>
                      ) : (
                        <span className="badge-amber text-[10px]">Plaintext</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button className="btn-secondary btn-sm" onClick={() => view(it.id)} title="Xem">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button className="btn-secondary btn-sm" onClick={() => startEdit(it.id)} title="Sửa">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => askDelete(it.id)} title="Xoá">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cột 3: chi tiết */}
        <div className="lg:col-span-1">
          {selected ? (
            <div className="card border-slate-800 sticky top-24">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-white">{selected.title}</h2>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    <span>#{selected.id}</span>
                    <span>·</span>
                    {selected.isEncrypted ? (
                      <span className="badge-emerald text-[10px]">AES-256-GCM</span>
                    ) : (
                      <span className="badge-amber text-[10px]">Plaintext</span>
                    )}
                    <span>·</span>
                    <span>{formatDateTime(selected.updatedAt)}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="btn-ghost btn-sm p-1 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <pre className="text-sm whitespace-pre-wrap break-words bg-slate-950 border border-slate-800 rounded-lg p-4 text-slate-300 font-mono leading-relaxed">
                {selected.content}
              </pre>
            </div>
          ) : (
            <div className="card border-dashed border-slate-700 text-center py-12">
              <Eye className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Chọn 1 item để xem nội dung.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirm.open}
        title="Xoá item?"
        message={`Bạn sắp xoá "${deleteConfirm.title}". Hành động này không thể hoàn tác.`}
        confirmLabel="Xoá"
        cancelLabel="Huỷ"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, title: '' })}
      />
    </div>
  );
}
