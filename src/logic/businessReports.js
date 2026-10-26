const linked = row => ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(row.matchStatus);

/** Full reconciliations, not truncated Top-N views. Unallocated amounts remain
 * visible so accepting a product link cannot create or destroy sales value. */
export function buildBusinessReports(rows) {
  const channels = new Map(), products = new Map(), periods = new Map();
  let total = 0, unallocatedProduct = 0, unallocatedPeriod = 0;
  for (const row of rows) {
    if (row.revenueDisposition !== 'INCLUDED') continue;
    const amount = row.thanh_tien;
    if (!Number.isFinite(amount) || !Number.isSafeInteger(row.so_luong) || row.so_luong <= 0) {
      throw new Error('Dòng INCLUDED cần số tiền hữu hạn và số lượng nguyên dương đã chuẩn hóa.');
    }
    total += amount;
    const channel = row.kenh || '(Thiếu kênh)';
    channels.set(channel, (channels.get(channel) || 0) + amount);
    if (linked(row) && row.canonicalEntityId) {
      const key = row.canonicalEntityId;
      if (!products.has(key)) products.set(key, { canonicalEntityId: key, title: row.matched?.ten_sp || row.ten_sp, quantity: 0, amount: 0 });
      products.get(key).quantity += row.so_luong;
      products.get(key).amount += amount;
    } else unallocatedProduct += amount;
    if (row.dateValidity === 'VALID_CONFIRMED' && row.canonicalDate) {
      const month = row.canonicalDate.slice(0, 7);
      periods.set(month, (periods.get(month) || 0) + amount);
    } else unallocatedPeriod += amount;
  }
  return { total, byChannel: [...channels].map(([channel, amount]) => ({ channel, amount })),
    byProduct: [...products.values()], byMonth: [...periods].sort(([a], [b]) => a.localeCompare(b)).map(([month, amount]) => ({ month, amount })),
    unallocatedProduct, unallocatedPeriod };
}
