// This evaluates a controlled synthetic pilot, never calls it real-shop accuracy.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { createServer } from 'vite';
import { createBookDataset } from './bookDataset.mjs';

const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { detectFields } = await server.ssrLoadModule('/src/logic/fieldMapping.js');
  const { runPipeline } = await server.ssrLoadModule('/src/logic/pipeline.js');
  const { parseCrosswalk } = await server.ssrLoadModule('/src/logic/crosswalk.js');
  const { buildBusinessReports } = await server.ssrLoadModule('/src/logic/businessReports.js');
  const { benchmarkEntityMatching, evaluateMappings, evaluateNormalizedCells, evaluateReportGroups } = await server.ssrLoadModule('/src/logic/researchEvaluation.js');
  const data = createBookDataset();
  const [catalog, ...rest] = data.tables.map(t => ({ fileName: t.fileName, headers: t.headers, dataRows: t.rows, mapping: detectFields(t.headers), profile: { dateLocale: 'DMY' } }));
  const orders = rest.slice(0, 3), crosswalkTable = rest[3];
  const crosswalk = parseCrosswalk(crosswalkTable.headers, crosswalkTable.dataRows);
  const pipeline = runPipeline(orders, catalog, { crosswalk });
  const truth = new Map(data.truth.map(t => [JSON.stringify([t.source, t.sourceRow, null]), t]));
  const evaluationRows = pipeline._base.resolved.filter(r => truth.get(r.recordId).split === 'evaluation');
  const entityLabels = evaluationRows.map(row => {
    const t = truth.get(row.recordId);
    return { recordId: row.recordId, decision: t.expectedCatalogId ? 'MATCH' : 'NO_MATCH', expectedEntityId: t.expectedCatalogId ? `ID:${t.expectedCatalogId}` : null, reviewStatus: 'KNOWN_BY_CONSTRUCTION' };
  });
  const benchmark = benchmarkEntityMatching(evaluationRows, pipeline.synthesizedCatalog, { labels: entityLabels, crosswalk });
  for (const run of Object.values(benchmark)) delete run.predictions;
  // Column positions are the generator's declared schemas, not answers from detectFields.
  const fields = ['ma_don', 'ten_sp', 'ma_dinh_danh', 'so_luong', 'gia', 'trang_thai', 'ngay', 'kenh', 'thuong_hieu'];
  const mappingLabels = orders.flatMap(f => fields.map((field, column) => ({ recordId: `${f.fileName}:${field}`, sourceColumn: column, reviewStatus: 'KNOWN_BY_CONSTRUCTION' })));
  const mappingPredictions = orders.flatMap(f => fields.map(field => ({ recordId: `${f.fileName}:${field}`, sourceColumn: f.mapping[field] >= 0 ? f.mapping[field] : null })));
  const cellLabels = [], cellPredictions = [];
  // The date-format mutation has a known target. Invalid dates remain unavailable;
  // latent clean dates are not leaked in to repair an impossible observed value.
  for (const row of evaluationRows) {
    const t = truth.get(row.recordId), recordId = `${row.recordId}:date`;
    cellLabels.push({ recordId, rawValue: row.__raw_ngay, expectedValue: t.mutations.includes('invalid_date') ? null : t.latent.date, reviewStatus: 'KNOWN_BY_CONSTRUCTION' });
    cellPredictions.push({ recordId, value: row.canonicalDate });
  }
  const sumGroups = (rows, key, amount) => {
    const groups = new Map();
    for (const row of rows) { const k = key(row); groups.set(k, (groups.get(k) || 0) + amount(row)); }
    return [...groups].map(([recordId, amount]) => ({ recordId, amount }));
  };
  const evalTruth = data.truth.filter(t => t.split === 'evaluation');
  const evalIntegrated = pipeline.integrated.filter(r => truth.get(r.recordId).split === 'evaluation');
  const expectedContract = sumGroups(evalTruth, t => t.source, t => t.expectedEligibleRevenue).map(r => ({ recordId: r.recordId, expectedAmount: r.amount, reviewStatus: 'KNOWN_BY_CONSTRUCTION' }));
  const actualContract = sumGroups(evalIntegrated, r => r.__sourceName, r => r.revenueDisposition === 'INCLUDED' ? r.thanh_tien : 0);
  // A second, different question: deviation from the pre-corruption world.
  // No claim that the pipeline can recover missing prices/statuses automatically.
  const expectedClean = sumGroups(evalTruth, t => t.source, t => t.latent.status === 'Hoàn thành' ? t.latent.quantity * t.latent.price : 0)
    .map(r => ({ recordId: r.recordId, expectedAmount: r.amount, reviewStatus: 'KNOWN_BY_CONSTRUCTION' }));
  const baseline = sumGroups(evalIntegrated, r => r.__sourceName, r => Number.isFinite(r.thanh_tien) ? r.thanh_tien : 0);
  const cleanValue = t => !t.duplicateOf && t.latent.status === 'Hoàn thành' ? t.latent.quantity * t.latent.price : 0;
  const expectedUnique = sumGroups(evalTruth, t => t.source, cleanValue)
    .map(r => ({ recordId: r.recordId, expectedAmount: r.amount, reviewStatus: 'KNOWN_BY_CONSTRUCTION' }));
  const asLabels = groups => groups.map(r => ({ recordId: r.recordId, expectedAmount: r.amount, reviewStatus: 'KNOWN_BY_CONSTRUCTION' }));
  const actualReports = buildBusinessReports(evalIntegrated);
  const expectedProducts = asLabels(sumGroups(evalTruth, t => t.expectedCatalogId ? `ID:${t.expectedCatalogId}` : 'UNALLOCATED', cleanValue));
  const actualProducts = [...actualReports.byProduct.map(r => ({ recordId: r.canonicalEntityId, amount: r.amount })), { recordId: 'UNALLOCATED', amount: actualReports.unallocatedProduct }];
  const expectedMonths = asLabels(sumGroups(evalTruth, t => t.latent.date.slice(0, 7), cleanValue));
  const actualMonths = [...actualReports.byMonth.map(r => ({ recordId: r.month, amount: r.amount })), { recordId: 'UNALLOCATED', amount: actualReports.unallocatedPeriod }];
  const report = { version: 'research-pilot-v1', synthetic: true, reviewStatus: data.manifest.reviewStatus,
    datasetHash: crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex'), datasetVersion: data.manifest.version,
    policy: 'Catalog-record identity; immutable exact/fuzzy/multi-tier runs; development families excluded from evaluation. No simulated GT-based HITL.',
    config: pipeline.runConfig, evaluationRows: evaluationRows.length, rq1: { mapping: evaluateMappings(mappingPredictions, mappingLabels), dateNormalization: evaluateNormalizedCells(cellPredictions, cellLabels) },
    rq2: benchmark, afterHitl: null,
    rq3: { observedContract: evaluateReportGroups(actualContract, expectedContract, { completeDomain: true }),
      latentCleanBaseline: evaluateReportGroups(baseline, expectedClean, { completeDomain: true }),
      latentCleanAfterProcessing: evaluateReportGroups(actualContract, expectedClean, { completeDomain: true }),
      latentUniqueBaseline: evaluateReportGroups(baseline, expectedUnique, { completeDomain: true }),
      latentUniqueAfterProcessing: evaluateReportGroups(actualContract, expectedUnique, { completeDomain: true }),
      latentUniqueByProduct: evaluateReportGroups(actualProducts, expectedProducts, { completeDomain: true }),
      latentUniqueByMonth: evaluateReportGroups(actualMonths, expectedMonths, { completeDomain: true }),
      limitation: 'Observed-contract consistency is not recovery accuracy. latentClean includes every imported row; latentUnique excludes explicitly injected duplicate imports using generator lineage. These controls are reported separately. No duplicate labels are supplied to the pipeline.' },
    operationalReportsAllRows: pipeline.businessReports,
    limits: ['Pilot contains synthetic data and hand-designed schemas only.', 'Not a final benchmark or a real-shop result.', 'No human-reviewed HITL experiment was performed.', 'No thresholds were optimized using this run; existing defaults were frozen.'] };
  fs.mkdirSync('outputs/research-2026-10-26', { recursive: true });
  fs.writeFileSync('outputs/research-2026-10-26/research_evaluation.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ evaluationRows: report.evaluationRows, rq1: report.rq1, rq2: Object.fromEntries(Object.entries(benchmark).map(([k, r]) => [k, { ...r.metrics, errors: r.metrics.errors.length, reviewWorkload: r.reviewWorkload }])), rq3: Object.fromEntries(Object.entries(report.rq3).map(([k, r]) => [k, typeof r === 'object' ? r.mae : r])) }, null, 2));
} finally { await server.close(); }
