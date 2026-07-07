const getBaseUrl = () => {
  const url = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  return url.replace(/\/$/, "");
};

// !ansh: added fetchWithAuth for JWT Bearer token injection and 401 redirect
export async function fetchWithAuth(url: string, options: RequestInit = {}, tokenOverride?: string) {
  const token = tokenOverride || (typeof localStorage !== "undefined" ? localStorage.getItem("token") : null);
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 && typeof localStorage !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }
  return res;
}

export async function fetchInventory(token?: string): Promise<any[]> {
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/inventory`, {}, token);
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  return res.json();
}

export async function fetchKpis(token?: string): Promise<{
  total_parts: number;
  bins_active: number;
  critical_alerts: number;
  last_update_seconds: number;
}> {
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/dashboard/kpis`, {}, token);
  if (!res.ok) throw new Error(`Failed to fetch KPIs: ${res.status}`);
  return res.json();
}

export async function fetchActivity(token?: string): Promise<{
  activities: {
    icon: string;
    title: string;
    sub: string;
    time: string;
  }[];
}> {
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/dashboard/activity`, {}, token);
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`);
  return res.json();
}


export async function fetchMovements(page: number = 1, limit: number = 25, search: string = "", action: string = ""): Promise<{
  page: number;
  limit: number;
  total: number;
  items: {
    timestamp: string;
    name: string;
    area: string;
    action: "IN" | "OUT";
    uid: string;
    quantity: number;
  }[];
}> {
  const qs = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (search) qs.set("search", search);
  if (action) qs.set("action", action);
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/audit/movements?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch movements: ${res.status}`);
  return res.json();
}

export async function fetchAuditSummary(token?: string): Promise<{
  todays_throughput: number;
  active_tag_uids: number;
  inbound_rate: number;
}> {
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/audit/summary`, {}, token);
  if (!res.ok) throw new Error(`Failed to fetch audit summary: ${res.status}`);
  return res.json();
}

export async function fetchHeatmap(token?: string): Promise<{
  rows: number;
  cols: number;
  zones: {
    label: string;
    row: number;
    col: number;
    status: "full" | "partial" | "critical" | "empty";
    item_count: number;
    part_count: number;
  }[];
}> {
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/heatmap`, {}, token);
  if (!res.ok) throw new Error(`Failed to fetch heatmap: ${res.status}`);
  return res.json();
}

export async function fetchPaginatedInventory(params: {
  page: number;
  limit: number;
  search: string;
  status: string;
}): Promise<{
  page: number;
  limit: number;
  total: number;
  items: {
    name: string;
    sku: string;
    area: string;
    qty: number;
    status: string;
  }[];
}> {
  const qs = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
    search: params.search,
    status: params.status,
  });
  const res = await fetchWithAuth(`${getBaseUrl()}/api/v1/inventory/paginated?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch paginated inventory: ${res.status}`);
  return res.json();
}
