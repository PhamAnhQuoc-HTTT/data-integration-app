// A source-exclusive catalog entry is a retained source record, not a match proposal.
export function getReviewCandidate(row) {
  const original = row.original || row;
  return original.matchStatus === 'NEEDS_CONFIRMATION' ? original.matched || null : null;
}

export function reconciliationCounts(rows, decisions) {
  const proposals = rows.filter(getReviewCandidate);
  return {
    pending: proposals.filter(row => !decisions.has(row.rowIndex)).length,
    reviewed: proposals.filter(row => decisions.has(row.rowIndex)).length,
    unlinked: rows.length - proposals.length,
  };
}
