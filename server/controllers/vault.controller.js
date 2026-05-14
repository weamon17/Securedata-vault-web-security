// server/controllers/vault.controller.js
// Controller cho /api/vault/*. Toàn bộ logic ở vault.service.js.
// requireAuth được apply ở routes level → req.user chắc chắn có.

const vaultService = require('../services/vault.service');

// GET /api/vault/items
function list(req, res, next) {
  try {
    const items = vaultService.listByUser(req.user.id);
    return res.json({ ok: true, data: { items } });
  } catch (e) {
    next(e);
  }
}

// GET /api/vault/items/:id
function getOne(req, res, next) {
  try {
    const item = vaultService.getById(req.user.id, Number(req.params.id));
    return res.json({ ok: true, data: { item } });
  } catch (e) {
    next(e);
  }
}

// POST /api/vault/items
function create(req, res, next) {
  try {
    const { title, content } = req.body;
    const item = vaultService.create(req.user.id, { title, content });
    req.audit && req.audit.log({
      eventType: 'DATA_CREATED',
      mode: 'hardened',
      status: 'allowed',
      payloadSummary: `vault id=${item.id} encrypted=true`,
    });
    return res.status(201).json({ ok: true, data: { item } });
  } catch (e) {
    next(e);
  }
}

// PUT /api/vault/items/:id
function update(req, res, next) {
  try {
    const { title, content } = req.body;
    const item = vaultService.update(req.user.id, Number(req.params.id), { title, content });
    req.audit && req.audit.log({
      eventType: 'DATA_UPDATED',
      mode: 'hardened',
      status: 'allowed',
      payloadSummary: `vault id=${item.id} re-encrypted`,
    });
    return res.json({ ok: true, data: { item } });
  } catch (e) {
    next(e);
  }
}

// DELETE /api/vault/items/:id
function remove(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = vaultService.remove(req.user.id, id);
    req.audit && req.audit.log({
      eventType: 'DATA_DELETED',
      mode: 'hardened',
      status: 'allowed',
      payloadSummary: `vault id=${id}`,
    });
    return res.json({ ok: true, data: result });
  } catch (e) {
    next(e);
  }
}

module.exports = { list, getOne, create, update, remove };
