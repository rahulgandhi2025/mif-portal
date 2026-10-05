export const uid = (prefix = "") =>
  prefix + Math.random().toString(36).slice(2, 10);

export function seqId(prefix: string, existing: { id: string }[]): string {
  const nums = existing
    .map((e) => {
      const m = e.id.match(new RegExp(`^${prefix}-(\\d+)$`));
      return m ? parseInt(m[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(2, "0")}`;
}
