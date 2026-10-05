import { describe, it, expect } from 'vitest';
import { extractUniqueEntitiesFromRows, matchBipartiteEntities } from '../bipartiteMatching';
import { executeClusteringStrategy } from '../strategies/clusteringStrategy';
import { resolveEntities } from '../entityResolution';
import { validateCatalog } from '../catalogValidation';
import { validateCrosswalk } from '../crosswalk';
import { checkPriceAnomaly, checkReferentialIntegrity, checkMatchStatus } from '../qualityRules';

const book = (ten_sp, ma_dinh_danh = '', __source = 'A', gia = 100) => ({ten_sp, ma_dinh_danh, __source, gia});
describe('book identity safeguards', () => {
  it('retains binding annotations in entity keys', () => {
    expect(extractUniqueEntitiesFromRows([book('Book (Bìa cứng)'), book('Book (Bìa mềm)')], 'A')).toHaveLength(2);
  });
  it('rejects incompatible editions sharing a source code', () => {
    expect(() => extractUniqueEntitiesFromRows([book('Book Tập 1','X'), book('Book Tập 2','X')], 'A')).toThrow('phiên bản');
  });
  it('does not trust matching local SKUs across sources', () => {
    const a = extractUniqueEntitiesFromRows([book('Alpha','SKU1')], 'A');
    const b = extractUniqueEntitiesFromRows([book('Zebra','SKU1')], 'B');
    expect(matchBipartiteEntities(a,b).matchedPairs).toHaveLength(0);
  });
  it('keeps a singleton cluster unresolved', () => {
    const result = executeClusteringStrategy({allRows:[book('Alpha','X')]});
    expect(result.resolved[0].matchStatus).toBe('UNRESOLVED');
    expect(result.stats.matchedCount).toBe(0);
  });
  it('does not include pending members in cluster price', () => {
    const result = executeClusteringStrategy({allRows:[book('abcdefghij','X'),book('abcdefgxyz','Y','B',900)], fuzzyConfirmThreshold:70});
    expect(result.resolved[1].matchStatus).toBe('NEEDS_CONFIRMATION');
    expect(result.catalog[0]).toMatchObject({gia_chuan:100,clusterSize:1,ten_sp:'abcdefghij'});
  });
  it('links shared ISBNs across sources', () => {
    const result = executeClusteringStrategy({allRows:[book('Book','9786043924400'),book('Book','9786043924400','B')]});
    expect(result.resolved.every(r => r.matchStatus === 'MATCHED_EXACT')).toBe(true);
  });
  it('requires review for tied high-scoring catalog candidates', () => {
    const result = resolveEntities([book('Book','RAW')],[book('Book','C1'),book('Book','C2')]);
    expect(result[0]).toMatchObject({matchStatus:'NEEDS_CONFIRMATION',matchScore:100});
  });
  it('requires review for tied bipartite candidates', () => {
    const a = extractUniqueEntitiesFromRows([book('Book','X')], 'A');
    const b = extractUniqueEntitiesFromRows([book('Book','Y'),book('Book','Z')], 'B');
    expect(matchBipartiteEntities(a,b).matchedPairs[0].status).toBe('NEEDS_CONFIRMATION');
  });
  it('rejects conflicting catalog codes and deduplicates identical ones', () => {
    expect(() => validateCatalog([book('Alpha','C1'),book('Zebra','C1')])).toThrow('mâu thuẫn');
    expect(validateCatalog([book('Alpha','C1'),book('Alpha','C1')])).toHaveLength(1);
  });
  it('rejects absent crosswalk targets', () => {
    expect(() => validateCrosswalk([{internal_code:'X',standard_code:'MISSING'}],new Set(['C1']))).toThrow();
  });
  it('supports the same local SKU with distinct source-scoped mappings', () => {
    const result = resolveEntities([book('Unknown','X','A'),book('Unknown','X','B')],[book('Alpha','C1'),book('Zebra','C2')],{
      crosswalk:[{source:'A',internal_code:'X',standard_code:'C1'},{source:'B',internal_code:'X',standard_code:'C2'}],
    });
    expect(result.map(r=>r.matched.ma_dinh_danh)).toEqual(['C1','C2']);
  });
  it('does not compare prices with an unconfirmed proposal', () => {
    const row = {gia:900,matched:{gia_chuan:100},matchStatus:'NEEDS_CONFIRMATION'};
    expect(checkPriceAnomaly([row])).toHaveLength(0);
    expect(checkPriceAnomaly([{...row,matchStatus:'MATCHED_CONFIRMED_USER'}])).toHaveLength(1);
  });
  it('does not report missing references when no reference catalog exists', () => {
    const row={ma_dinh_danh:'X',matchStatus:'UNRESOLVED',__hasReferenceCatalog:false};
    expect(checkReferentialIntegrity([row])).toHaveLength(0);
    expect(checkMatchStatus([row])).toHaveLength(0);
  });
});
