import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ScientificReportTab } from '../tabs/ScientificReportTab';
import { OverviewTab } from '../tabs/OverviewTab';
import { IssuesTab } from '../tabs/IssuesTab';
import { HitlWorkbenchTab } from '../tabs/HitlWorkbenchTab';
import { MasterDataGridTab } from '../tabs/MasterDataGridTab';
import { MetricStatCards } from '../dashboard/MetricStatCards';
import { MatchScoreBadge, SeverityBadge } from '../common/Badge';
import { MappingDetails } from '../upload/MappingDetails';
import { compactVND, linkingSummary } from '../../logic/uiPresentation';

describe('Accurate result presentation', () => {
  it('uses plain status labels with one vector icon rather than duplicate emoji', () => {
    for (const [severity, label] of [['AUTO_FIXED', 'Đã tự sửa'], ['NEEDS_CONFIRMATION', 'Cần bạn xem'], ['FLAGGED_ONLY', 'Đã gắn cờ']]) {
      const markup = renderToStaticMarkup(<SeverityBadge severity={severity} />);
      expect(markup).toContain(label);
      expect(markup).not.toMatch(/✅|🔔|👆/u);
      expect(markup.match(/<svg\b/g)).toHaveLength(1);
      expect(markup).toContain('whitespace-nowrap');
      expect(markup).toContain('h-6');
      expect(markup).toMatch(/<svg[^>]*class="[^"]*shrink-0/);
    }
  });
  it('aligns audit statuses in a shared column and lets long details wrap independently', () => {
    const details = ['Đã tách phần giờ khỏi trường ngày', 'ISBN-13 sai checksum: 9786042005269', 'Ngày dạng slash có thể là DD/MM hoặc MM/DD; cần đối soát nguồn.'];
    const markup = renderToStaticMarkup(<IssuesTab issueGroupFilter="ALL" setIssueGroupFilter={() => {}}
      integratedRows={[{ id: 'row-1', issues: details.map((detail, i) => ({ group: 'technical', severity: i ? 'FLAGGED_ONLY' : 'AUTO_FIXED', detail })) }]} />);
    expect(markup).toContain('grid-cols-[max-content_minmax(0,1fr)]');
    expect(markup.match(/w-full justify-center/g)).toHaveLength(3);
    expect(markup.match(/min-w-0 \[overflow-wrap:anywhere\]/g)).toHaveLength(3);
    details.forEach(detail => expect(markup).toContain(detail));
  });
  it('allows HITL badges and long source identifiers to wrap on narrow screens', () => {
    const markup = renderToStaticMarkup(<HitlWorkbenchTab
      pendingConfirmations={[{ rowIndex: 0, matchStatus: 'NEEDS_CONFIRMATION', matchScore: 85,
        ma_don: '580220600000000900', nguon: 'Don_Hang_TikTok_Shop_final.xlsx',
        matched: { ten_sp: 'Nhà Giả Kim', ma_dinh_danh: '9780306406157' } }]}
      manualConfirmations={new Map()} onManualDecision={() => {}}
      config={{ fuzzyConfirmThreshold: 70, fuzzyHighThreshold: 90 }} />);
    expect(markup).toContain('flex flex-wrap items-center gap-2');
    expect(markup.match(/min-w-0 \[overflow-wrap:anywhere\]/g)).toHaveLength(2);
    expect(markup).toContain('85% tương đồng');
  });
  it('keeps KPI notes visible and gives icon-only export buttons accessible names', () => {
    const markup = renderToStaticMarkup(<MetricStatCards result={{ stats: { totalRows: 266 }, issues: [], revenueTotal: 26644760,
      governanceAudit: { cancelledRevenuePrevented: 5711312 }, integrationMode: 'CATALOG' }}
      liveMatchRate={96} liveMatchedCount={255} acceptedManualCount={0} orderFilesCount={4} onNavigateTab={() => {}} />);
    expect(markup).not.toContain('truncate');
    expect(markup).toContain('Không cộng 5.711.312');
    const table = renderToStaticMarkup(<MasterDataGridTab integratedRows={[]} onExportCsv={() => {}} onExportExcel={() => {}} />);
    expect(table).toContain('aria-label="Xuất dữ liệu CSV"');
    expect(table).toContain('aria-label="Xuất dữ liệu Excel"');
    expect(table).toContain('w-full sm:w-auto');
  });
  const result = {
    integrationMode: 'BIPARTITE', strategyLabel: 'Ghép đa nguồn',
    stats: { totalRows: 4, matchedCount: 3 }, _base: { resolved: [{ matchStatus: 'MATCHED_EXACT' }, { matchStatus: 'MATCHED_FUZZY_HIGH' }, { matchStatus: 'NEEDS_CONFIRMATION' }, { matchStatus: 'UNRESOLVED' }] },
    integrated: [{ matchStatus: 'MATCHED_EXACT' }, { matchStatus: 'MATCHED_FUZZY_HIGH' }, { matchStatus: 'MATCHED_CONFIRMED_USER' }, { matchStatus: 'UNRESOLVED' }], revenueTotal: 0,
  };
  it('keeps automatic and finalized linking rates separate without a reference catalog', () => {
    expect(linkingSummary(result)).toEqual({ total: 4, automatic: 2, confirmed: 1, linked: 3, automaticRate: 50, linkedRate: 75 });
    const markup = renderToStaticMarkup(<ScientificReportTab result={result} />);
    expect(markup).toContain('2/4 dòng (50%)');
    expect(markup).toContain('3/4 dòng (75%)');
    expect(markup).not.toContain('Multi-tier tự động trước duyệt');
    expect(markup).not.toContain('Entity Resolution Benchmark');
  });
  it('shows explicit empty chart states and does not claim all top products are canonical', () => {
    const markup = renderToStaticMarkup(<OverviewTab revenueByChannel={[]} topProducts={[]} />);
    expect(markup).toContain('Chưa có giao dịch đủ điều kiện');
    expect(markup).toContain('Chưa có sản phẩm bán đủ điều kiện');
    expect(markup).not.toContain('Đã Quy Chuẩn');
    expect(markup).toContain('dòng chưa liên kết giữ riêng');
  });
  it('uses pending status, not a hardcoded threshold, to color scores; formats decimals concisely', () => {
    const markup = renderToStaticMarkup(<MatchScoreBadge score={92.3333333} status="NEEDS_CONFIRMATION" />);
    expect(markup).toContain('bg-amber-50');
    expect(markup).not.toContain('bg-emerald-50');
    expect(markup).toContain('92,3%');
    expect(renderToStaticMarkup(<MatchScoreBadge score={NaN} />)).toBe('');
    expect(renderToStaticMarkup(<MatchScoreBadge score={83} status="MATCHED_CONFIRMED_USER" />)).toContain('bg-emerald-50');
  });
  it('uses readable currency units for small and large values', () => {
    expect(compactVND(500)).toBe('500');
    expect(compactVND(25000)).toBe('25 nghìn');
    expect(compactVND(1500000)).toBe('1,5 tr');
    expect(compactVND(2e9)).toBe('2 tỷ');
  });
  it('shows exact source mapping, missing columns and the subtotal price basis', () => {
    const markup = renderToStaticMarkup(<MappingDetails fileState={{ headers: ['Tên gốc', 'Tổng tiền SP'], mapping: { ten_sp: 0, gia_dong: 1 } }} />);
    expect(markup).toContain('Tên gốc');
    expect(markup).toContain('(cột 1)');
    expect(markup).toContain('Chưa ánh xạ');
    expect(markup).toContain('không nhân tổng tiền dòng');
  });
});
