// ? Shared CSV download utility
export function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const parts: string[] = [];
  if (headers.length > 0) parts.push(headers.join(","));
  parts.push(...rows.map((r) => r.map(escapeCell).join(",")));
  const csv = parts.join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCell(cell: string): string {
  const str = String(cell);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
