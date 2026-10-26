import { resolveEntities } from './entityResolution';

const approved = label => ['APPROVED', 'KNOWN_BY_CONSTRUCTION'].includes(label.reviewStatus);
const accepted = row => ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER'].includes(row?.matchStatus);
const divide = (n, d) => d ? n / d : null;
function uniqueById(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!row.recordId || map.has(row.recordId)) throw new Error('Nhãn/dự đoán cần recordId duy nhất và không rỗng.');
    map.set(row.recordId, row);
  }
  return map;
}
function counts(tp, fp, fn) {
  return { tp, fp, fn, precision: divide(tp, tp + fp), recall: divide(tp, tp + fn), f1: divide(2 * tp, 2 * tp + fp + fn) };
}

/** Predictions contain accepted linkedEntityId, never an unaccepted candidate.
 * Unapproved/undetermined labels remain in the coverage denominator only. */
export function evaluateEntityLinks(predictions, labels) {
  const predicted = uniqueById(predictions);
  const statuses = ['MATCHED_EXACT', 'MATCHED_FUZZY_HIGH', 'MATCHED_CONFIRMED_USER', 'UNRESOLVED', 'NEEDS_CONFIRMATION', 'REJECTED_USER'];
  if (predictions.some(row => !statuses.includes(row.matchStatus))) throw new Error('Dự đoán cần matchStatus hợp lệ; ứng viên chưa xác nhận không phải liên kết.');
  const labelled = uniqueById(labels);
  if (predictions.some(row => !labelled.has(row.recordId))) throw new Error('Dự đoán ngoài tập bản ghi GT; cần khai báo phạm vi đánh giá.');
  let tp = 0, fp = 0, fn = 0, tn = 0, evaluated = 0, undetermined = 0, unapproved = 0, pending = 0;
  const errors = [];
  for (const label of labels) {
    if (!approved(label)) { unapproved++; continue; }
    if (label.decision === 'UNDETERMINED') { undetermined++; continue; }
    if (!['MATCH', 'NO_MATCH'].includes(label.decision)) throw new Error('Nhãn liên kết không hợp lệ.');
    if (label.decision === 'MATCH' && !label.expectedEntityId) throw new Error('MATCH cần expectedEntityId.');
    if (label.decision === 'NO_MATCH' && label.expectedEntityId != null) throw new Error('NO_MATCH không được chứa ID đích.');
    evaluated++;
    const prediction = predicted.get(label.recordId);
    if (!prediction) throw new Error(`Thiếu dự đoán cho bản ghi có nhãn: ${label.recordId}. Cần trạng thái UNRESOLVED tường minh nếu không liên kết.`);
    const target = accepted(prediction) ? prediction.linkedEntityId || null : null;
    if (prediction?.matchStatus === 'NEEDS_CONFIRMATION') pending++;
    if (label.decision === 'NO_MATCH') {
      if (target) { fp++; errors.push({ recordId: label.recordId, type: 'WRONG_LINK_OUTSIDE_CATALOG' }); }
      else tn++;
    } else if (target === label.expectedEntityId) tp++;
    else {
      fn++;
      if (target) fp++;
      errors.push({ recordId: label.recordId, type: target ? 'WRONG_ENTITY' : 'MISSED_LINK' });
    }
  }
  return { ...counts(tp, fp, fn), tn, evaluated, undetermined, unapproved, pending,
    labelCoverage: divide(evaluated, labels.length), errors };
}

export function benchmarkEntityMatching(rows, catalog, { labels, ...options }) {
  uniqueById(rows);
  return Object.fromEntries(['EXACT_ONLY', 'FUZZY_ONLY', 'MULTI_TIER'].map(matchingMode => {
    const resolved = resolveEntities(rows, catalog, { ...options, matchingMode });
    const predictions = resolved.map(row => ({ recordId: row.recordId, matchStatus: row.matchStatus,
      linkedEntityId: accepted(row) ? row.matched.canonicalEntityId : null }));
    return [matchingMode, { metrics: evaluateEntityLinks(predictions, labels),
      reviewWorkload: resolved.filter(r => r.matchStatus === 'NEEDS_CONFIRMATION').length, predictions }];
  }));
}

/** Null mapping means abstention. An incorrect assignment contributes FP+FN. */
export function evaluateMappings(predictions, labels) {
  const predicted = uniqueById(predictions);
  uniqueById(labels);
  let tp = 0, fp = 0, fn = 0, evaluated = 0;
  for (const label of labels.filter(approved)) {
    evaluated++;
    const actual = predicted.get(label.recordId)?.sourceColumn ?? null;
    if (label.sourceColumn === null) { if (actual !== null) fp++; }
    else if (actual === label.sourceColumn) tp++;
    else { fn++; if (actual !== null) fp++; }
  }
  return { ...counts(tp, fp, fn), evaluated, labelCoverage: divide(evaluated, labels.length) };
}

export function evaluateNormalizedCells(predictions, labels) {
  const predicted = uniqueById(predictions);
  uniqueById(labels);
  let evaluated = 0, correct = 0, originallyCorrect = 0, falseCorrections = 0;
  for (const label of labels.filter(approved)) {
    evaluated++;
    const prediction = predicted.get(label.recordId);
    const same = Boolean(prediction) && Object.is(prediction.value, label.expectedValue);
    if (same) correct++;
    if (Object.is(label.rawValue, label.expectedValue)) { originallyCorrect++; if (!same) falseCorrections++; }
  }
  return { evaluated, correct, accuracy: divide(correct, evaluated), labelCoverage: divide(evaluated, labels.length),
    falseCorrections, originallyCorrect, falseCorrectionRate: divide(falseCorrections, originallyCorrect) };
}

/** completeDomain is explicit: only then does a missing GT group imply zero.
 * Never report a zero MAE for an empty/unapproved truth set. */
export function evaluateReportGroups(predictions, labels, { completeDomain = false } = {}) {
  const predicted = uniqueById(predictions);
  uniqueById(labels);
  if (predictions.some(p => !Number.isFinite(p.amount))) throw new Error('Tổng dự đoán phải hữu hạn; dữ liệu thiếu không tự bằng 0.');
  const approvedLabels = labels.filter(approved);
  if (approvedLabels.some(l => !Number.isFinite(l.expectedAmount))) throw new Error('GT số tiền phải hữu hạn.');
  const truth = new Map(approvedLabels.map(l => [l.recordId, l.expectedAmount]));
  const covered = new Set(labels.map(l => l.recordId));
  const unknownPredictions = [...predicted.keys()].filter(key => !covered.has(key));
  const keys = approvedLabels.length ? new Set([...truth.keys(), ...(completeDomain ? unknownPredictions : [])]) : new Set();
  const groups = [...keys].map(recordId => {
    const expected = truth.get(recordId) ?? 0, actual = predicted.get(recordId)?.amount ?? 0;
    return { recordId, expected, actual, absoluteError: Math.abs(actual - expected), relativeError: expected ? Math.abs(actual - expected) / Math.abs(expected) : null };
  });
  return { evaluated: groups.length, mae: groups.length ? groups.reduce((s, r) => s + r.absoluteError, 0) / groups.length : null,
    groups, unknownPredictions, labelCoverage: divide(approvedLabels.length, labels.length) };
}
