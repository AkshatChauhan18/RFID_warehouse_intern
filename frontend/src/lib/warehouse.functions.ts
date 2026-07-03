import { createServerFn } from "@tanstack/react-start";
import { fetchInventory, fetchKpis, fetchActivity, fetchMovements, fetchAuditSummary, fetchPaginatedInventory, fetchHeatmap } from "./api-function";

export const getInventory = createServerFn({ method: "GET" }).handler(() => fetchInventory());
export const getKpis = createServerFn({ method: "GET" }).handler(() => fetchKpis());
export const getActivity = createServerFn({ method: "GET" }).handler(() => fetchActivity());

export const getMovements = createServerFn({ method: "GET" })
  .validator((d: { page: number; limit: number }) => d)
  .handler(({ data }) => fetchMovements(data.page, data.limit));

export const getAuditSummary = createServerFn({ method: "GET" }).handler(() => fetchAuditSummary());

export const getHeatmap = createServerFn({ method: "GET" }).handler(() => fetchHeatmap());

export const getPaginatedInventory = createServerFn({ method: "GET" })
  .validator((d: { page: number; limit: number; search: string; status: string }) => d)
  .handler(({ data }) => fetchPaginatedInventory(data));