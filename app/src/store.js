import { kvs } from '@forge/kvs';

const ALL = 'ledger:ids';

export async function all() {
  const ids = (await kvs.get(ALL)) ?? [];
  if (ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => kvs.get(`decision:${id}`)));
  return records.filter(Boolean);
}

export async function get(id) {
  return kvs.get(`decision:${id}`);
}

export async function save(decision) {
  await kvs.set(`decision:${decision.id}`, decision);
  const ids = (await kvs.get(ALL)) ?? [];
  if (!ids.includes(decision.id)) await kvs.set(ALL, [...ids, decision.id]);
  return decision;
}

export async function isSeeded() {
  return Boolean(await kvs.get('seeded'));
}

export async function markSeeded() {
  await kvs.set('seeded', true);
}
