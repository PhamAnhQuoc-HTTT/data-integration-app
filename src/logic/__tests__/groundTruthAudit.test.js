import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { auditGroundTruth } from '../../../scripts/auditGroundTruth.mjs';

const available = fs.existsSync('Ground Truth/Ground_Truth_Master_All_Channels.xlsx') && fs.existsSync('sample-data/Don_Hang_POS.xlsx');
describe.skipIf(!available)('owner-supplied scenario workbook audit (no approval inferred)', () => {
  it('preserves the original workbooks and leaves imported row labels pending', () => {
    const files = fs.readdirSync('Ground Truth').filter(f => f.endsWith('.xlsx')).map(f => path.join('Ground Truth', f));
    const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    const before = files.map(hash);
    const report = auditGroundTruth();
    expect(report.status).toBe('ANNOTATIONS_ONLY_NOT_APPROVED');
    expect(report.reviewRows).toHaveLength(266);
    expect(report.annotations).toHaveLength(149);
    expect(report.summary.combinedMatchesSeparate).toBe(true);
    expect(report.annotations.filter(a => a.joinStatus === 'UNSAFE_NUMERIC_ID')).toHaveLength(19);
    expect(report.reviewRows.every(r => r.reviewStatus === 'PENDING' && r.expected.decision === null && r.expected.eligibleAmount === null)).toBe(true);
    expect(files.map(hash)).toEqual(before);
  });
  it('can audit the tracked samples without depending on the local new directory', () => {
    const report = auditGroundTruth({ sourceDir: 'sample-data' });
    expect(report.summary).toMatchObject({ sourceRows: 266, scenarioAnnotations: 149, completeApprovedLabels: 0, combinedMatchesSeparate: true });
    expect(report.reviewRows.every(row => !row.sourceFile.endsWith('_final.xlsx') && row.reviewStatus === 'PENDING')).toBe(true);
  });
});
