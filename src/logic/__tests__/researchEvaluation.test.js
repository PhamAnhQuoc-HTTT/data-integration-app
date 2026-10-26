import { describe, it, expect } from 'vitest';
import { evaluateEntityLinks, evaluateMappings, evaluateNormalizedCells, evaluateReportGroups } from '../researchEvaluation';
const label = (recordId, decision, expectedEntityId = null, reviewStatus = 'APPROVED') => ({ recordId, decision, expectedEntityId, reviewStatus });
describe('independent evaluation accounting', () => {
  it('counts a wrong in-catalog link as FP+FN, correct abstention as TN and never credits pending candidates', () => {
    const labels = [label('a', 'MATCH', 'C1'), label('b', 'MATCH', 'C2'), label('c', 'NO_MATCH'), label('d', 'MATCH', 'C4'), label('e', 'MATCH', 'C5', 'PENDING')];
    const p = [{ recordId: 'a', linkedEntityId: 'C1', matchStatus: 'MATCHED_EXACT' }, { recordId: 'b', linkedEntityId: 'WRONG', matchStatus: 'MATCHED_EXACT' }, { recordId: 'c', linkedEntityId: null, matchStatus: 'UNRESOLVED' }, { recordId: 'd', linkedEntityId: 'C4', matchStatus: 'NEEDS_CONFIRMATION' }];
    expect(evaluateEntityLinks(p, labels)).toMatchObject({ tp: 1, fp: 1, fn: 2, tn: 1, pending: 1, evaluated: 4, unapproved: 1, precision: .5, recall: 1 / 3, f1: .4, labelCoverage: .8 });
  });
  it('keeps undetermined separate from true negatives and refuses duplicate or inconsistent labels', () => {
    expect(evaluateEntityLinks([], [label('u', 'UNDETERMINED')])).toMatchObject({ tn: 0, evaluated: 0, undetermined: 1, precision: null, recall: null, f1: null });
    expect(() => evaluateEntityLinks([], [label('a', 'MATCH')])).toThrow();
    expect(() => evaluateEntityLinks([], [label('a', 'NO_MATCH')])).toThrow('Thiếu dự đoán');
    expect(() => evaluateEntityLinks([{ recordId: 'extra', linkedEntityId: null, matchStatus: 'UNRESOLVED' }], [label('a', 'NO_MATCH')])).toThrow('ngoài tập');
    expect(() => evaluateEntityLinks([{ recordId: 'a', linkedEntityId: 'C1' }], [label('a', 'MATCH', 'C1')])).toThrow('matchStatus');
    expect(() => evaluateEntityLinks([], [label('a', 'MATCH', 'C1'), label('a', 'NO_MATCH')])).toThrow();
  });
  it('measures wrong mapping and false corrections using labelled denominators', () => {
    expect(evaluateMappings([{ recordId: 'q', sourceColumn: 3 }], [{ recordId: 'q', sourceColumn: 2, reviewStatus: 'APPROVED' }])).toMatchObject({ tp: 0, fp: 1, fn: 1 });
    expect(evaluateNormalizedCells([{ recordId: 'n', value: 0 }], [{ recordId: 'n', rawValue: null, expectedValue: null, reviewStatus: 'APPROVED' }])).toMatchObject({ accuracy: 0, falseCorrections: 1, falseCorrectionRate: 1 });
  });
  it('scores missing and extra groups only against a declared complete GT domain', () => {
    const truth = [{ recordId: 'a', expectedAmount: 100, reviewStatus: 'APPROVED' }];
    const predictions = [{ recordId: 'b', amount: 50 }];
    expect(evaluateReportGroups(predictions, truth, { completeDomain: true })).toMatchObject({ mae: 75, evaluated: 2 });
    expect(evaluateReportGroups(predictions, [])).toMatchObject({ mae: null, evaluated: 0 });
    expect(evaluateReportGroups([], [{ ...truth[0], reviewStatus: 'PENDING' }])).toMatchObject({ mae: null, evaluated: 0 });
    expect(() => evaluateReportGroups([{ recordId: 'a', amount: NaN }], truth)).toThrow();
  });
});
