// Read-only audit. Original workbooks and reviewer-owned labels are never edited.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { fileURLToPath } from 'node:url';

const orderHeaders = ['Mã đơn hàng', 'Invoice ID', 'Order ID', 'orderNumber'];
const clean = v => String(v ?? '').normalize('NFC').trim().replace(/\s+/g, ' ');
function read(file) {
  const bytes = fs.readFileSync(file), wb = XLSX.read(bytes, { type: 'buffer', cellDates: false });
  if (wb.SheetNames.length !== 1) throw new Error(`Cần khai báo sheet khi workbook có nhiều sheet: ${file}`);
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return { file, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), sheet: wb.SheetNames[0],
    values: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true }) };
}

export function auditGroundTruth({ sourceDir = fs.existsSync('sample-data/new/Don_Hang_POS_final.xlsx') ? 'sample-data/new' : 'sample-data', gtDir = 'Ground Truth' } = {}) {
  const names = { POS: 'Don_Hang_POS_final.xlsx', Shopee: 'Don_Hang_Shopee_final.xlsx', Lazada: 'Don_Hang_Lazada_final.xlsx', TikTok: 'Don_Hang_TikTok_Shop_final.xlsx' };
  const sourceNames = Object.fromEntries(Object.entries(names).map(([channel, name]) => [channel,
    fs.existsSync(path.join(sourceDir, name)) ? name : name.replace('_final.xlsx', '.xlsx')]));
  const sources = Object.fromEntries(Object.entries(sourceNames).map(([channel, name]) => [channel, read(path.join(sourceDir, name))]));
  const masterName = fs.existsSync(path.join(sourceDir, 'Danh_Muc_Sach_Master_Chuan_Hoa_inventory.xlsx'))
    ? 'Danh_Muc_Sach_Master_Chuan_Hoa_inventory.xlsx' : 'Danh_Muc_Sach_Master.xlsx';
  const master = read(path.join(sourceDir, masterName));
  const masterCodeColumn = master.values[0].indexOf('ISBN-13');
  if (masterCodeColumn < 0) throw new Error('Master thiếu cột ISBN-13 trong hợp đồng kiểm toán.');
  const code = value => clean(value).replace(/[\s-]/g, '').toUpperCase();
  const catalogCodes = new Set(master.values.slice(1).map(row => code(row[masterCodeColumn])).filter(Boolean));
  const sourceFields = {
    POS: { productCode: 'Item Code', title: 'Item Name', quantity: 'Quantity', unitPrice: 'Unit Price', date: 'Sale Date', status: 'Status' },
    Shopee: { productCode: 'SKU sản phẩm', title: 'Tên Sản phẩm', quantity: 'Số lượng', unitPrice: 'Giá ưu đãi', date: 'Thời gian đặt hàng', status: 'Trạng thái đơn hàng', returnStatus: 'Trạng thái Trả hàng/Hoàn tiền', variant: 'Tên phân loại hàng' },
    Lazada: { productCode: 'sellerSku', platformProductCode: 'lazadaSku', title: 'itemName', quantity: 'Qty', lineAmount: 'itemSubtotal', date: 'createTime', status: 'status', variant: 'variation', orderLineId: 'orderItemId' },
    TikTok: { productCode: 'Seller SKU', platformProductCode: 'TikTok Shop SKU ID', title: 'Product Name', quantity: 'Quantity', lineAmount: 'SKU Subtotal After Discount', date: 'Created Time', status: 'Order Status', returnStatus: 'Cancelation/Return Status', variant: 'Variation' },
  };
  const sourceRows = Object.entries(sources).flatMap(([channel, source]) => {
    const column = source.values[0].findIndex(h => orderHeaders.includes(h));
    if (column < 0) throw new Error(`Không có cột mã đơn khai báo: ${source.file}`);
    return source.values.slice(1).map((row, i) => ({ channel, sourceFile: path.basename(source.file), sourceRow: i + 2, orderId: clean(row[column]),
      recordId: JSON.stringify([path.basename(source.file), i + 2, null]),
      raw: Object.fromEntries(Object.entries(sourceFields[channel]).map(([field, header]) => {
        const index = source.values[0].indexOf(header);
        if (index < 0) throw new Error(`Thiếu cột nguồn khai báo ${header}`);
        return [field, row[index]];
      })) }));
  });
  const annotations = [], workbooks = [];
  for (const channel of Object.keys(sourceNames)) {
    const workbook = read(path.join(gtDir, `Ground_Truth_${channel}.xlsx`));
    const headerIndex = workbook.values.findIndex(row => ['Mã đơn', 'Mã đơn hàng'].includes(clean(row[0])));
    if (headerIndex < 0) throw new Error(`Không tìm được header GT: ${workbook.file}`);
    const parsed = workbook.values.slice(headerIndex + 1).flatMap((row, offset) => {
      if (!clean(row[0]) || !clean(row[1])) return [];
      // POS has a title/preamble and summary rows. Keep only actual order IDs.
      if (channel === 'POS' && !/^POS-/i.test(clean(row[0]))) return [];
      const unsafeId = typeof row[0] === 'number' && !Number.isSafeInteger(row[0]);
      const matches = sourceRows.filter(r => r.channel === channel && (unsafeId ? Number(r.orderId) === row[0] : r.orderId === clean(row[0])));
      return [{ gtFile: path.basename(workbook.file), gtRow: headerIndex + offset + 2, rawOrderId: row[0], scenario: clean(row[1]),
        description: clean(row.length > 3 ? row[3] : row[2]),
        joinStatus: unsafeId ? 'UNSAFE_NUMERIC_ID' : matches.length === 1 ? 'UNIQUE_ORDER_ONLY' : matches.length ? 'AMBIGUOUS_ORDER_MULTIPLE_LINES' : 'NOT_FOUND',
        possibleSourceRecords: matches.map(r => r.recordId), reviewStatus: 'PENDING' }];
    });
    annotations.push(...parsed);
    workbooks.push({ file: workbook.file, sha256: workbook.sha256, sheet: workbook.sheet, headerRow: headerIndex + 1, annotations: parsed.length });
  }
  const combined = read(path.join(gtDir, 'Ground_Truth_Master_All_Channels.xlsx'));
  const combinedAnnotations = combined.values.flatMap(row => {
    const rawChannel = clean(row[3]);
    const channel = rawChannel === 'TikTok Shop' ? 'TikTok' : rawChannel;
    if (!Object.hasOwn(sourceNames, channel)) return [];
    const order = channel === 'POS' ? row[0] : row[4], scenario = channel === 'POS' ? row[1] : row[5];
    if (!clean(order) || !clean(scenario) || ['Mã đơn', 'Mã đơn hàng'].includes(clean(order))) return [];
    if (channel === 'POS' && !/^POS-/i.test(clean(order))) return [];
    return [JSON.stringify([channel, clean(order), clean(scenario)])];
  });
  const separateKeys = annotations.map(a => JSON.stringify([a.gtFile.replace('Ground_Truth_', '').replace('.xlsx', ''), clean(a.rawOrderId), a.scenario]));
  const combinedSet = new Set(combinedAnnotations), separateSet = new Set(separateKeys);
  const unmatchedCombined = [...combinedSet].filter(k => !separateSet.has(k));
  const missingCombined = [...separateSet].filter(k => !combinedSet.has(k));
  const counts = annotations.reduce((map, a) => { map[a.joinStatus] = (map[a.joinStatus] || 0) + 1; return map; }, {});
  const observations = annotations.map(annotation => {
    const candidates = sourceRows.filter(r => annotation.possibleSourceRecords.includes(r.recordId));
    const distinctProducts = new Set(candidates.map(r => JSON.stringify([code(r.raw.productCode), clean(r.raw.variant)]))).size;
    return { gtFile: annotation.gtFile, gtRow: annotation.gtRow, scenario: annotation.scenario,
      candidateCodeEvidence: candidates.map(r => ({ recordId: r.recordId, primaryCode: r.raw.productCode,
        primaryCodePresentInCatalog: catalogCodes.has(code(r.raw.productCode)),
        platformCode: r.raw.platformProductCode ?? null,
        platformCodePresentInCatalog: r.raw.platformProductCode ? catalogCodes.has(code(r.raw.platformProductCode)) : null })),
      needsNamespaceReview: annotation.scenario === 'no_catalog_match' && candidates.some(r => catalogCodes.has(code(r.raw.productCode))),
      orderHasDifferentProducts: annotation.scenario === 'duplicate' && distinctProducts > 1 };
  });
  const reviewRows = sourceRows.map(row => ({ ...row,
    annotations: annotations.filter(a => a.possibleSourceRecords.includes(row.recordId)).map(a => ({ gtFile: a.gtFile, gtRow: a.gtRow, scenario: a.scenario, joinStatus: a.joinStatus })),
    reviewStatus: 'PENDING', expected: { normalized: null, canonicalEntityId: null, decision: null, eligibleAmount: null, duplicateOf: null }, reviewer: null, evidence: null }));
  return { auditVersion: 'gt-audit-v1', status: 'ANNOTATIONS_ONLY_NOT_APPROVED',
    limitations: ['Annotations are scenarios, not complete per-row expected results.', 'Order-only labels may refer to several legitimate lines.', 'Unsafe numeric IDs must be recovered from authoritative text; numeric equality is a review suggestion only.', 'No label was inferred from pipeline output.'],
    sourceHashes: [...Object.values(sources), master].map(s => ({ file: s.file, sha256: s.sha256 })),
    workbooks: [...workbooks, { file: combined.file, sha256: combined.sha256, sheet: combined.sheet, combinedAnnotationCount: combinedAnnotations.length }],
    summary: { sourceRows: sourceRows.length, scenarioAnnotations: annotations.length, joinStatuses: counts, completeApprovedLabels: 0,
      namespaceReviewAnnotations: observations.filter(o => o.needsNamespaceReview).length,
      multiProductDuplicateAnnotations: observations.filter(o => o.orderHasDifferentProducts).length,
      combinedMatchesSeparate: JSON.stringify([...combinedAnnotations].sort()) === JSON.stringify([...separateKeys].sort()), unmatchedCombined, missingCombined },
    observations, annotations, reviewRows };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const out = 'outputs/research-2026-10-26';
  const audit = auditGroundTruth();
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'ground_truth_audit.json'), JSON.stringify(audit, null, 2));
  console.log(JSON.stringify(audit.summary, null, 2));
}
