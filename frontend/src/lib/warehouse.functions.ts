import { fetchInventory, fetchKpis, fetchActivity, fetchMovements, fetchAuditSummary, fetchPaginatedInventory, fetchHeatmap } from "./api-function";

export const getInventory = async () => {
  try { return await fetchInventory(); } catch { return []; }
};

export const getKpis = async () => {
  try { return await fetchKpis(); } catch { return { total_parts: 0, bins_active: 0, critical_alerts: 0, last_update_seconds: 0 }; }
};

export const getActivity = async () => {
  try { return await fetchActivity(); } catch { return { activities: [] }; }
};

export const getMovements = async (page: number, search: string, action: string) => {
  try { return await fetchMovements(page, 10, search, action); } catch { return { page, limit: 10, total: 0, items: [] }; }
};

export const getAuditSummary = async () => {
  try { return await fetchAuditSummary(); } catch { return { todays_throughput: 0, active_tag_uids: 0, inbound_rate: 0 }; }
};

export const getHeatmap = async () => {
  try { return await fetchHeatmap(); } catch { return { rows: 4, cols: 4, zones: [] }; }
};

export const getPaginatedInventory = async (params: { page: number; limit: number; search: string; status: string }) => {
  try { return await fetchPaginatedInventory(params); } catch { return { page: params.page, limit: params.limit, total: 0, items: [] }; }
};
