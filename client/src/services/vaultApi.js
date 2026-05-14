// client/src/services/vaultApi.js
// Wrapper cho /api/vault/* (encrypted-at-rest CRUD).

import { api } from './api.js';

export const listItems = () =>
  api.get('/vault/items').then((r) => r.data.items);

export const getItem = (id) =>
  api.get(`/vault/items/${id}`).then((r) => r.data.item);

export const createItem = ({ title, content }) =>
  api.post('/vault/items', { title, content }).then((r) => r.data.item);

export const updateItem = (id, { title, content }) =>
  api.put(`/vault/items/${id}`, { title, content }).then((r) => r.data.item);

export const deleteItem = (id) =>
  api.delete(`/vault/items/${id}`).then((r) => r.data);
