const getBaseUrl = () => {
  const url = process.env.FASTAPI_BASE_URL || "http://localhost:8000";
  return url.replace(/\/$/, "");
};

export async function fetchInventory(): Promise<any[]> {
  const res = await fetch(`${getBaseUrl()}/api/v1/inventory`);
  if (!res.ok) throw new Error(`Failed to fetch inventory: ${res.status}`);
  return res.json();
}

export async function fetchKpis(): Promise<{
  total_parts: number;
  bins_active: number;
  critical_alerts: number;
  last_update_seconds: number;
}> {
  const res = await fetch(`${getBaseUrl()}/api/v1/dashboard/kpis`);
  if (!res.ok) throw new Error(`Failed to fetch KPIs: ${res.status}`);
  return res.json();
}

export async function fetchActivity(): Promise<{
  activities: {
    icon: string;
    title: string;
    sub: string;
    time: string;
  }[];
}> {
  const res = await fetch(`${getBaseUrl()}/api/v1/dashboard/activity`);
  if (!res.ok) throw new Error(`Failed to fetch activity: ${res.status}`);
  return res.json();
}


export async function fetchMovements(page: number = 1, limit: number = 25): Promise<{
  page: number;
  limit: number;
  total: number;
  items: {
    timestamp: string;
    name: string;
    area: string; // ? Changed from bin
    action: "IN" | "OUT";
    uid: string;
    quantity: number;
  }[];
}> {
  const res = await fetch(`${getBaseUrl()}/api/v1/audit/movements?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch movements: ${res.status}`);
  return res.json();
}

export async function fetchAuditSummary(): Promise<{
  todays_throughput: number;
  active_tag_uids: number;
  inbound_rate: number;
}> {
  const res = await fetch(`${getBaseUrl()}/api/v1/audit/summary`);
  if (!res.ok) throw new Error(`Failed to fetch audit summary: ${res.status}`);
  return res.json();
}

export async function fetchHeatmap(): Promise<{
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
  const res = await fetch(`${getBaseUrl()}/api/v1/heatmap`);
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
    area: string; // ? Changed from bin
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
  const res = await fetch(`${getBaseUrl()}/api/v1/inventory/paginated?${qs}`);
  if (!res.ok) throw new Error(`Failed to fetch paginated inventory: ${res.status}`);
  return res.json();
}