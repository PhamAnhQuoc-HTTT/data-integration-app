// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { MasterDataGridTab } from '../tabs/MasterDataGridTab';
import { PRESETS } from '../upload/PresetSelector';
import { createConfigDraft, sourceIndexAfterRemoval, validateUiConfig } from '../../logic/uiConfig';
import * as pipeline from '../../logic/pipeline';
import fs from 'node:fs';

// Chart rendering is outside the scope of these interaction tests.
vi.mock('../tabs/OverviewTab', () => ({ OverviewTab: () => <div>Tổng quan kết quả</div> }));

let root, container;
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  // JSDOM has no layout. Simulate visibility only for the focus-trap query.
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function () {
    if (this.closest('details:not([open])') && this.tagName !== 'SUMMARY') return [];
    return [{ width: 100, height: 30 }];
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
const render = async element => { await act(async () => root.render(element)); };
const button = text => [...document.querySelectorAll('button')].find(element => element.textContent.includes(text));
const click = async element => {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); await new Promise(resolve => setTimeout(resolve, 10)); });
};
const openConfig = async () => click(document.querySelector('button[aria-haspopup="dialog"]'));
const dialog = () => document.querySelector('[role="dialog"]');
const choosePreset = async key => click(dialog().querySelector('button[aria-label="' + PRESETS[key].name + '"]'));
const changeRange = async (field, value) => {
  const element = document.getElementById(field);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
const uploadCsv = async (selector, filename, csv) => {
  const file = new File([csv], filename, { type: 'text/csv' });
  const bytes = new TextEncoder().encode('\uFEFF' + csv);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buffer });
  const input = document.querySelector(selector);
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
};
const orders = 'Order ID,Product Name,Seller SKU,Quantity,Unit Price,Status\nTEST-1,Nhà Giả K,LOCAL,1,100000,Completed';
const catalog = 'ISBN,Tên sản phẩm,Giá chuẩn\n9780306406157,Nhà Giả Kim,100000';
const runReviewCase = async () => {
  await render(<App />);
  await uploadCsv('#bsi-file-orders', 'Shopee_test.csv', orders);
  await uploadCsv('#bsi-file-catalog', 'Danh_muc_test.csv', catalog);
  await click(button('Khởi Chạy Pipeline'));
  expect(document.body.textContent).toContain('Tích Hợp Hoàn Tất: 1 dòng dữ liệu');
  await click(button('HITL ('));
  expect(document.body.textContent).toContain('1 dòng cần duyệt');
  await click(button('Chấp thuận ghép'));
  expect(document.body.textContent).toContain('Đã chấp thuận');
};

const csvFile = (name, csv, withBom = true) => {
  const file = new File([csv], name, { type: 'text/csv' });
  const bytes = new TextEncoder().encode((withBom ? '\uFEFF' : '') + csv);
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  Object.defineProperty(file, 'arrayBuffer', { value: async () => buffer });
  return file;
};
const uploadBatch = async files => {
  const input = document.getElementById('bsi-file-orders');
  await act(async () => {
    Object.defineProperty(input, 'files', { configurable: true, value: files });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 10));
  });
};

describe('Upload batch and safe reset', () => {
  it('accepts every file in a drag/drop batch rather than only the first', async () => {
    await render(<App />);
    const dropzone = document.getElementById('bsi-file-orders').closest('label');
    await act(async () => {
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { files: [csvFile('Shopee.csv', orders), csvFile('POS.csv', orders)] } });
      dropzone.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    expect(document.body.textContent).toContain('Đã nạp thêm 2 tệp');
    expect(document.body.textContent).toContain('2/4 file');
  });
  it('warns on a multi-file catalog drop without silently selecting its first workbook', async () => {
    await render(<App />);
    const dropzone = document.getElementById('bsi-file-catalog').closest('label');
    await act(async () => {
      const event = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'dataTransfer', { value: { files: [csvFile('Master1.csv', catalog), csvFile('Master2.csv', catalog)] } });
      dropzone.dispatchEvent(event);
    });
    expect(document.body.textContent).toContain('Danh mục chỉ nhận một tệp');
    expect(document.getElementById('bsi-file-catalog')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Master1.csv');
  });
  it('reads a batch in selection order, reports excess files and does not hide them silently', async () => {
    await render(<App />);
    expect(document.getElementById('bsi-file-orders').multiple).toBe(true);
    await uploadBatch([1, 2, 3, 4, 5].map(i => csvFile('Shopee_' + i + '.csv', orders)));
    expect(document.body.textContent).toContain('Đã nạp thêm 4 tệp');
    expect(document.body.textContent).toContain('Chưa nạp do giới hạn 4 tệp: Shopee_5.csv');
    await openConfig();
    await click(button('Chọn một tệp đơn hàng'));
    expect([...document.getElementById('master-source').options].map(option => option.textContent)).toEqual([1, 2, 3, 4].map(i => 'Shopee_' + i + '.csv'));
  });
  it('reports duplicate names and invalid files while retaining other valid files', async () => {
    await render(<App />);
    await uploadBatch([csvFile('Shopee.csv', orders), csvFile('SHOPEE.csv', orders), csvFile('data.txt', orders), csvFile('POS.csv', orders)]);
    expect(document.body.textContent).toContain('Đã nạp thêm 2 tệp');
    expect(document.body.textContent).toContain('Bỏ qua tệp trùng tên: SHOPEE.csv');
    expect(document.body.textContent).toContain('Không đọc được: data.txt');
    expect(document.body.textContent).toContain('2/4 file');
  });
  it('reads UTF-8 CSV without BOM and preserves long order IDs as text', async () => {
    await render(<App />);
    await uploadBatch([csvFile('Shopee.csv', orders.replace('TEST-1', '580220600000000901'), false)]);
    await click(button('Khởi Chạy Pipeline'));
    await click(button('Bảng Dữ Liệu Tích Hợp'));
    expect(document.body.textContent).toContain('Nhà Giả K');
    expect(document.body.textContent).toContain('580220600000000901');
  });
  it('blocks starting the pipeline and adding/removing files while reading a batch', async () => {
    await render(<App />);
    const file = csvFile('Shopee.csv', orders);
    let finish;
    const deferred = new Promise(resolve => { finish = resolve; });
    const bytes = await file.arrayBuffer();
    const slowFile = { name: file.name, arrayBuffer: () => deferred };
    const input = document.getElementById('bsi-file-orders');
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [slowFile] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(input.disabled).toBe(true);
    expect(button('Khởi Chạy Pipeline').disabled).toBe(true);
    expect(document.body.textContent).toContain('Đang đọc tệp');
    await act(async () => finish(bytes));
    expect(button('Khởi Chạy Pipeline').disabled).toBe(false);
  });
  it('Cancel/Escape retains the result and HITL decisions; confirms explicitly before reset', async () => {
    await runReviewCase();
    const opener = button('Đổi file');
    opener.focus();
    await click(opener);
    expect(dialog().textContent).toContain('1 quyết định HITL');
    await click(button('Giữ kết quả'));
    expect(document.body.textContent).toContain('Đã chấp thuận');
    expect(document.activeElement).toBe(opener);
    await click(opener);
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(document.body.textContent).toContain('Đã chấp thuận');
    await click(opener);
    await click(button('Xóa và đổi file'));
    expect(dialog()).toBeNull();
    expect(document.getElementById('bsi-file-orders')).toBeTruthy();
    expect(document.body.textContent).not.toContain('Tích Hợp Hoàn Tất');
    expect(document.body.textContent).not.toContain('Đã chấp thuận');
  });
});

describe('Inventory UI', () => {
  it.skipIf(!fs.existsSync('sample-data/new/Danh_Muc_Sach_Master_Chuan_Hoa_inventory.xlsx'))('runs the current five Huy workbooks through upload, linking, reporting and inventory export preparation', async () => {
    await render(<App />);
    const files = fs.readdirSync('sample-data/new').filter(name => name.startsWith('Don_Hang_') && name.endsWith('_final.xlsx'));
    expect(files).toHaveLength(4);
    const workbookFile = name => {
      const bytes = fs.readFileSync('sample-data/new/' + name);
      const buffer = new ArrayBuffer(bytes.length);
      new Uint8Array(buffer).set(bytes);
      const file = new File([], name);
      Object.defineProperty(file, 'arrayBuffer', { value: async () => buffer });
      return file;
    };
    await uploadBatch(files.map(workbookFile));
    const input = document.getElementById('bsi-file-catalog');
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [workbookFile('Danh_Muc_Sach_Master_Chuan_Hoa_inventory.xlsx')] });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await click(button('Khởi Chạy Pipeline'));
    expect(document.body.textContent).toContain('Tích Hợp Hoàn Tất: 266 dòng');
    expect(document.body.textContent).toContain('255/266');
    await click(button('HITL ('));
    expect(document.body.textContent).toContain('0 dòng cần duyệt');
    expect(document.body.textContent).toContain('11 dòng chưa có liên kết');
    await click(button('Báo Cáo Học Thuật'));
    expect(document.body.textContent).toContain('26.644.760');
    await click(button('Tồn kho master'));
    const select = document.querySelector('select[aria-label="Cột tồn đầu kỳ trong master"]');
    // SL has no unambiguous stock meaning until the user selects it in a master.
    expect(select.value).toBe('-1');
    await act(async () => { select.value = '8'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(document.body.textContent).not.toContain('Cột tồn kho không được');
    expect(document.querySelectorAll('tbody tr')).toHaveLength(57);
    expect(button('Xuất master &').disabled).toBe(true);
    await click(document.querySelector('input[type="checkbox"]'));
    expect(button('Xuất master &').disabled).toBe(false);
  });
  it('requires opening-stock confirmation and displays recalculated quantities after HITL', async () => {
    await render(<App />);
    await uploadCsv('#bsi-file-orders', 'Shopee.csv', orders.replace('Order ID,', 'Date,Order ID,').replace('TEST-1,', '10/10/2026,TEST-1,'));
    await uploadCsv('#bsi-file-catalog', 'Master.csv', catalog.replace('Giá chuẩn', 'Giá chuẩn,Tồn kho').replace('Kim,100000', 'Kim,100000,10'));
    await click(button('Khởi Chạy Pipeline'));
    await click(button('Tồn kho master'));
    expect(document.body.textContent).toContain('SL giảm: 0');
    expect(button('Xuất master &').disabled).toBe(true);
    await click(document.querySelector('input[type="checkbox"]'));
    expect(button('Xuất master &').disabled).toBe(false);
    await click(button('HITL ('));
    await click(button('Chấp thuận ghép'));
    await click(button('Tồn kho master'));
    expect(document.body.textContent).toContain('SL giảm: 1');
    const cells = document.querySelector('tbody tr').querySelectorAll('td');
    expect(cells[3].textContent).toBe('9');
  });
  it('does not invent inventory from an order-generated catalog', async () => {
    await render(<App />);
    await uploadCsv('#bsi-file-orders', 'Shopee.csv', orders);
    await click(button('Khởi Chạy Pipeline'));
    await click(button('Tồn kho master'));
    expect(document.body.textContent).toContain('Danh mục tổng hợp từ đơn hàng không cung cấp tồn kho');
    expect(button('Xuất master &')).toBeUndefined();
  });
  it('shows why each integrated row is excluded and its report amount', async () => {
    await render(<MasterDataGridTab integratedRows={[{ id: 1, rowIndex: 0, ten_sp: 'Sách', thanh_tien: 100000, revenueDisposition: 'CANCELLED', matchStatus: 'UNRESOLVED' }]} />);
    expect(document.body.textContent).toContain('Không — đơn hủy hoặc trả hàng/hoàn tiền');
    const cells = document.querySelector('tbody tr').querySelectorAll('td');
    expect(cells[9].textContent).toContain('100.000');
    expect(cells[13].textContent).toContain('0');
  });
});

describe('Configuration validation', () => {
  const draft = () => createConfigDraft({
    activePresetId: 'balanced', config: PRESETS.balanced.config, selectedStrategy: 'BIPARTITE', masterSourceIndex: 0,
  });
  it('copies preset parameters without mutating the saved config', () => {
    const selection = draft();
    selection.config.fuzzyHighThreshold = 95;
    expect(PRESETS.balanced.config.fuzzyHighThreshold).toBe(90);
  });
  it('accepts all three presets and rejects reversed or non-finite thresholds', () => {
    for (const preset of Object.values(PRESETS)) expect(validateUiConfig({ ...draft(), config: preset.config })).toBe('');
    expect(validateUiConfig({ ...draft(), config: { ...draft().config, fuzzyHighThreshold: 75, fuzzyConfirmThreshold: 90 } })).toContain('nhỏ hơn hoặc bằng');
    expect(validateUiConfig({ ...draft(), config: { ...draft().config, fuzzyHighThreshold: NaN } })).toContain('75%–99%');
  });
  it('checks crosswalk compatibility and the selected master file', () => {
    expect(validateUiConfig(draft(), { crosswalkCount: 1 })).toContain('Crosswalk cần');
    expect(validateUiConfig(draft(), { crosswalkCount: 1, hasCatalog: true })).toBe('');
    expect(validateUiConfig({ ...draft(), selectedStrategy: 'MASTER_SOURCE' }, { crosswalkCount: 1 })).toBe('');
    expect(validateUiConfig({ ...draft(), selectedStrategy: 'MASTER_SOURCE', masterSourceIndex: 2 }, { orderFiles: [{}] })).toContain('chọn lại');
  });
  it('preserves the master source identity when an earlier file is removed', () => {
    expect(sourceIndexAfterRemoval(2, 0)).toBe(1);
    expect(sourceIndexAfterRemoval(2, 2)).toBe(0);
    expect(sourceIndexAfterRemoval(0, 2)).toBe(0);
  });
});

describe('Configuration UI interactions', () => {
  it('shows presets only inside the dialog; Cancel discards the draft, Apply commits it', async () => {
    await render(<App />);
    expect(document.querySelector('[aria-label="Chọn gói cấu hình nghiệp vụ"]')).toBeNull();
    await openConfig();
    expect(dialog().querySelectorAll('[aria-pressed]')).toHaveLength(6);
    await choosePreset('strict');
    expect(button('Gói cấu hình:').textContent).toContain('Tiêu Chuẩn');
    await click(button('Hủy'));
    expect(dialog()).toBeNull();
    expect(button('Gói cấu hình:').textContent).toContain('Tiêu Chuẩn');
    await openConfig();
    expect(dialog().querySelector('button[aria-label="' + PRESETS.balanced.name + '"]').getAttribute('aria-pressed')).toBe('true');
    await choosePreset('strict');
    await click(button('Áp dụng cấu hình'));
    expect(button('Gói cấu hình:').textContent).toContain('Nghiêm Ngặt');
  });
  it('blocks invalid thresholds and allows fixing them before applying', async () => {
    await render(<App />);
    await openConfig();
    await choosePreset('strict');
    await click(dialog().querySelector('summary'));
    await changeRange('fuzzyHighThreshold', 75);
    expect(dialog().textContent).toContain('nhỏ hơn hoặc bằng');
    expect(button('Áp dụng cấu hình').disabled).toBe(true);
    await changeRange('fuzzyConfirmThreshold', 70);
    expect(button('Áp dụng cấu hình').disabled).toBe(false);
    await click(button('Áp dụng cấu hình'));
    expect(button('Gói cấu hình:').textContent).toContain('Tùy chỉnh');
  });
  it('traps keyboard focus, cancels with Escape, restores focus and body scroll', async () => {
    await render(<App />);
    const opener = button('Gói cấu hình:');
    opener.focus();
    await openConfig();
    expect(document.body.style.overflow).toBe('hidden');
    const controls = dialog().querySelectorAll('button:not(:disabled)');
    controls[controls.length - 1].focus();
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(controls[0]);
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(controls[controls.length - 1]);
    await choosePreset('strict');
    await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(document.body.style.overflow).toBe('');
    expect(opener.textContent).toContain('Tiêu Chuẩn');
  });
  it('disables ineffective strategies when a catalog is uploaded', async () => {
    await render(<App />);
    await uploadCsv('#bsi-file-catalog', 'Danh_muc.csv', catalog);
    await openConfig();
    const strategyButtons = dialog().querySelector('[aria-labelledby="strategy-title"][role="group"]').querySelectorAll('button');
    expect([...strategyButtons].every(element => element.disabled)).toBe(true);
    expect(dialog().textContent).toContain('Các lựa chọn bên dưới chỉ có hiệu lực khi bỏ danh mục');
  });
  it('warns about an incompatible crosswalk before running, then permits a compatible strategy', async () => {
    await render(<App />);
    await uploadCsv('#bsi-file-orders', 'Shopee.csv', orders);
    await uploadCsv('input[type="file"]:not(#bsi-file-orders):not(#bsi-file-catalog)', 'crosswalk.csv',
      'internal_code,standard_code\nLOCAL,9780306406157');
    expect(button('Khởi Chạy Pipeline').disabled).toBe(true);
    expect(document.body.textContent).toContain('Crosswalk cần');
    expect(document.body.textContent).toContain('crosswalk.csv');
    await openConfig();
    await click(button('Chọn một tệp đơn hàng'));
    await click(button('Áp dụng cấu hình'));
    expect(button('Khởi Chạy Pipeline').disabled).toBe(false);
  });
  it('keeps existing results and HITL decisions when opening and cancelling rerun configuration', async () => {
    await runReviewCase();
    await click(button('Chạy lại với tham số khác'));
    await choosePreset('strict');
    expect(button('Áp dụng và chạy lại').disabled).toBe(true);
    await click(button('Hủy'));
    expect(document.body.textContent).toContain('Đã chấp thuận');
    expect(document.body.textContent).toContain('Gói: Tiêu Chuẩn');
  });
  it('requires acknowledgement before rerunning HITL, uses the new thresholds, and clears old decisions', async () => {
    await runReviewCase();
    const runSpy = vi.spyOn(pipeline, 'runPipeline');
    await openConfig();
    await choosePreset('strict');
    expect(button('Áp dụng và chạy lại').disabled).toBe(true);
    await click(dialog().querySelector('input[type="checkbox"]'));
    await click(button('Áp dụng và chạy lại'));
    expect(runSpy).toHaveBeenLastCalledWith(expect.any(Array), expect.any(Object),
      expect.objectContaining({ fuzzyHighThreshold: 95, fuzzyConfirmThreshold: 85 }));
    expect(dialog()).toBeNull();
    expect(document.body.textContent).toContain('Gói: Nghiêm Ngặt');
    await click(button('HITL ('));
    expect(document.body.textContent).toContain('0 dòng đã duyệt');
    expect(document.body.textContent).toContain('1 dòng chưa có liên kết');
    await click(button('Báo Cáo Học Thuật'));
    expect(document.body.textContent).toContain('0/1');
  });
  it('preserves the previous config, result and HITL decisions if rerunning fails', async () => {
    await runReviewCase();
    vi.spyOn(pipeline, 'runPipeline').mockImplementationOnce(() => { throw new Error('Lỗi đối soát thử nghiệm'); });
    await openConfig();
    await choosePreset('strict');
    await click(dialog().querySelector('input[type="checkbox"]'));
    await click(button('Áp dụng và chạy lại'));
    expect(document.body.textContent).toContain('Lỗi đối soát thử nghiệm');
    expect(document.body.textContent).toContain('Đã chấp thuận');
    expect(document.body.textContent).toContain('Gói: Tiêu Chuẩn');
    await openConfig();
    expect(dialog().querySelector('button[aria-label="' + PRESETS.balanced.name + '"]').getAttribute('aria-pressed')).toBe('true');
  });
});

describe('Integrated table feedback', () => {
  const row = (matchStatus, issues = []) => ({ id: matchStatus, ma_don: 'TEST', ten_sp: 'Sách', matchStatus, issues });
  it('separates linking status from quality warnings and uses finalized match statuses', async () => {
    await render(<MasterDataGridTab integratedRows={[
      row('MATCHED_EXACT', [{ detail: 'Sai ngày' }]), row('UNRESOLVED'), row('NEEDS_CONFIRMATION'),
      row('MATCHED_CONFIRMED_USER'), row('REJECTED_USER'), row('MATCHED_FUZZY_HIGH'),
      { ...row('MATCHED_EXACT'), id: 'cw', matchTier: 'tier2_crosswalk' },
    ]} />);
    const rows = document.querySelectorAll('tbody tr');
    expect(rows[0].cells[10].textContent).toBe('Khớp mã chính xác');
    expect(rows[0].cells[11].textContent).toBe('1 vấn đề');
    expect(rows[1].cells[10].textContent).toBe('Chưa có liên kết');
    expect(rows[1].cells[11].textContent).toBe('Không phát hiện vấn đề');
    expect(rows[2].cells[10].textContent).toBe('Chờ duyệt liên kết');
    expect(rows[3].cells[10].textContent).toBe('Đã duyệt ghép');
    expect(rows[4].cells[10].textContent).toBe('Đã từ chối ghép');
    expect(rows[5].cells[10].textContent).toBe('Tự động ghép theo tên');
    expect(rows[6].cells[10].textContent).toBe('Khớp qua Crosswalk');
  });
  it('reports clipboard rejection instead of displaying a false success', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    await render(<MasterDataGridTab integratedRows={[row('MATCHED_EXACT')]} />);
    await click(document.querySelector('button[title="Sao chép mã đơn"]'));
    expect(document.body.textContent).toContain('Không sao chép được mã đơn');
    expect(document.querySelector('button[title="Sao chép mã đơn"] svg').classList.contains('text-emerald-600')).toBe(false);
  });
});
