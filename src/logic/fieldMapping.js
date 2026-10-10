/**
 * Field mapping: nhận diện & ánh xạ tên cột từ file gốc về schema chuẩn.
 * Áp dụng chung cho mọi ngành hàng và định dạng báo cáo (bao gồm cả báo cáo đa chi nhánh như FAHASA).
 */
import { removeDiacritics, normalizeNumber, normalizeText } from "./normalize";

export const FIELD_PATTERNS = {
  ma_don: ["ma don hang", "ma don", "ma hoa don", "order id", "order", "ma dh", "so don", "ma giao dich", "invoice id", "invoice"],
  ngay: ["ngay gio", "ngay dat", "ngay ban", "ngay", "date", "created at", "created", "order date", "time", "timestamp"],
  ten_sp: ["ten san pham", "san pham", "ten hang", "ten sp", "tieu de", "ten", "product name", "product", "item name", "title"],
  thuong_hieu: ["thuong hieu", "nha xuat ban", "nxb", "brand", "publisher"],
  ten_ncc: ["ten ncc", "nha cung cap", "supplier", "vendor"],
  ma_ncc: ["ma ncc", "supplier id"],
  tac_gia: ["tac gia", "author"],
  so_luong: ["so luong", "sl", "qty", "quantity", "count", "amount"],
  gia: ["gia ban", "don gia", "gia", "price", "unit price", "gia bia", "gia niem yet", "cost", "selling price"],
  ma_dinh_danh: ["barcode", "isbn", "ma vach", "upc", "ean", "sku id", "sku", "ma dinh danh", "ma san pham chuan", "ma sp chuan", "ma san pham", "ma sp", "item code"],
  kenh: ["kenh", "channel", "chi nhanh", "nha sach", "cua hang", "platform"],
  danh_muc: ["the loai", "danh muc", "category", "genre", "phan loai"],
  gia_chuan: ["gia bia", "gia niem yet", "gia chuan", "list price"],
  gia_goc: ["gia goc", "sku unit original price", "original price"],
  trang_thai: ["trang thai", "status", "tinh trang", "order status", "state"],
};

export const FIELD_LABELS = {
  ma_don: "Mã đơn", ngay: "Ngày", ten_sp: "Tên sản phẩm", thuong_hieu: "NXB/Thương hiệu (nguồn)",
  so_luong: "Số lượng", gia: "Giá bán", ma_dinh_danh: "Mã định danh",
  kenh: "Kênh", danh_muc: "Danh mục", gia_chuan: "Giá chuẩn", trang_thai: "Trạng thái",
  ten_ncc: "Nhà cung cấp", ma_ncc: "Mã NCC", tac_gia: "Tác giả", gia_goc: "Giá gốc nguồn", gia_bia: "Giá bìa",
  gia_dong: "Tổng tiền sản phẩm sau giảm giá", hoan_tra: "Trạng thái trả hàng/hoàn tiền", phan_loai: "Biến thể sách",
};

/**
 * Dò cột nào trong file khớp với field nào của schema chuẩn.
 * Tự động phát hiện các cột chi nhánh xuất bán (như FAHASA: GDNSBT, GDNSTD...)
 */
export function detectFields(headers) {
  // Chuẩn hóa header: bỏ dấu, viết thường, chuyển _, -, . thành khoảng trắng
  const norm = headers.map((h) =>
    removeDiacritics(String(h || ""))
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/[_\-.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  const mapping = { branchColumns: [] };
  const assignedCols = new Set();

  // Tính điểm khớp giữa 1 header chuẩn hóa và 1 field
  const computeScore = (headerNorm, field, patterns) => {
    if (!headerNorm) return 0;
    if (field === 'kenh' && /voucher|discount|giam gia|tro gia|shipping/.test(headerNorm)) return 0;
    if (field === 'gia' && /tong|total|subtotal|discount|fee|voucher|original|gia goc|uu dai/.test(headerNorm)) return 0;
    if (field === 'ma_don' && /item|substatus|sub status/.test(headerNorm)) return 0;
    if (field === "gia" && /gia bia|gia niem yet|gia chuan|list price/.test(headerNorm)) return 0;
    if (field === "ma_don" && /status|date|time|trang thai/.test(headerNorm)) return 0;

    // Loại trừ các trường hợp xung đột âm (Negative patterns)
    if (field === "gia" && headerNorm.includes("tac gia")) return 0;
    if (field === "gia" && (headerNorm.includes("ma ") || headerNorm.includes("don hang"))) return 0;
    if (field === "ten_sp" && (headerNorm.startsWith("ma ") || headerNorm.includes("ma sp") || headerNorm.includes("ma san pham"))) return 0;
    if (field === "ma_don" && headerNorm.includes("don gia")) return 0;
    if (field === "so_luong" && headerNorm.includes("don gia")) return 0;

    let bestScore = 0;
    for (const p of patterns) {
      if (headerNorm === p) {
        // Khớp chính xác 100%
        const score = 1000 + p.length;
        if (score > bestScore) bestScore = score;
      } else {
        // Khớp ranh giới từ (word boundary)
        const regex = new RegExp(`(^|\\s)${p.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\s|$)`);
        if (regex.test(headerNorm)) {
          const score = 100 + p.length;
          if (score > bestScore) bestScore = score;
        } else if (p.length >= 4 && headerNorm.includes(p)) {
          // Chuỗi con dài >= 4 ký tự
          const score = 10 + p.length;
          if (score > bestScore) bestScore = score;
        }
      }
    }
    return bestScore;
  };

  // Thứ tự ưu tiên nhận diện để tránh tranh chấp cột
  const fieldPriority = [
    "ma_don", "ma_dinh_danh", "ma_ncc", "ten_ncc", "tac_gia", "thuong_hieu", "ten_sp", "gia_chuan", "gia_goc", "gia",
    "so_luong", "ngay", "kenh", "trang_thai", "danh_muc"
  ];

  for (const field of fieldPriority) {
    const patterns = FIELD_PATTERNS[field] || [];
    let bestIdx = -1;
    let maxScore = 0;

    for (let i = 0; i < norm.length; i++) {
      if (assignedCols.has(i)) continue;
      const score = computeScore(norm[i], field, patterns);
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0 && maxScore > 0) {
      mapping[field] = bestIdx;
      assignedCols.add(bestIdx);
    } else {
      mapping[field] = -1;
    }
  }

  // Phát hiện các cột chi nhánh xuất bán (Wide format / Pivot columns)
  // Ví dụ: "GDNSBT - NS FAHASA Long Bình Tân", "GDNSTD - NS Thủ Đức"
  headers.forEach((h, idx) => {
    const raw = String(h || "").trim();
    const n = removeDiacritics(raw).toLowerCase();
    
    // Nếu là cột chi nhánh có mã GDNS hoặc NS FAHASA hoặc Chi nhánh
    if (/^gdns\w*\b/.test(n) || /^ns fahasa\s+\S/.test(n)) {
      // Trích xuất tên rút gọn dễ đọc cho chi nhánh
      let cleanBranchName = raw;
      if (raw.includes("-")) {
        cleanBranchName = raw.split("-").slice(1).join("-").trim();
      }
      mapping.branchColumns.push({
        index: idx,
        rawHeader: raw,
        branchName: cleanBranchName || raw,
      });
    }
  });

  // Explicit export schemas take precedence over generic substring matches.
  const pick = (field, aliases) => {
    const index = aliases.map(a => norm.indexOf(a)).find(i => i >= 0);
    if (index !== undefined) mapping[field] = index;
  };
  pick('ma_don', ['order number', 'order id', 'ma don hang', 'invoice id']);
  pick('ma_dinh_danh', ['isbn 13', 'isbn', 'seller sku', 'sku san pham', 'item code']);
  pick('ten_sp', ['item name', 'product name', 'ten san pham']);
  pick('ngay', ['thoi gian dat hang', 'create time', 'created time', 'sale date']);
  pick('trang_thai', ['order status', 'trang thai don hang', 'status']);
  pick('gia', ['gia uu dai', 'unit price', 'selling price']);
  pick('gia_goc', ['gia goc', 'sku unit original price', 'original price']);
  mapping.gia_bia = -1;
  pick('gia_bia', ['gia bia', 'gia niem yet', 'list price']);
  pick('phan_loai', ['ten phan loai hang', 'variation']);
  pick('hoan_tra', ['trang thai tra hang/hoan tien', 'cancelation/return status', 'cancellation/return status']);
  // These are product-line amounts, not payment totals or shipping fees.
  pick('gia_dong', ['sku subtotal after discount', 'item subtotal']);
  if (mapping.gia_dong >= 0) mapping.gia = -1;
  return mapping;
}

/**
 * Chuyển đổi các dòng dữ liệu thô sang danh sách đối tượng giao dịch chuẩn.
 * Hỗ trợ tự động Unpivot nếu file là bảng phân phối ngang theo chi nhánh (như FAHASA).
 */
export function buildRows(dataRows, mapping) {
  const rows = [];
  const get = (r, f) => mapping[f] >= 0 ? (r[mapping[f]] ?? "") : "";

  dataRows.forEach((r, rowIdx) => {
    const ten_sp = get(r, "ten_sp");
    const ma_dinh_danh = get(r, "ma_dinh_danh");
    const raw_ma_don = get(r, "ma_don");
    const ma_don = raw_ma_don || "";
    const ngay = get(r, "ngay");
    const thuong_hieu = get(r, "thuong_hieu");
    const lineTotal = get(r, 'gia_dong');
    const quantity = normalizeNumber(get(r, 'so_luong'));
    const amount = normalizeNumber(lineTotal);
    const gia = mapping.gia_dong >= 0 ? (amount !== null && quantity > 0 ? amount / quantity : '') : get(r, 'gia');
    const trang_thai = get(r, "trang_thai");
    const metadata = { __sourceRow: rowIdx + 2, gia_bia: get(r, mapping.gia_bia === undefined ? "gia_chuan" : "gia_bia"), gia_goc: get(r, "gia_goc"), ten_ncc: get(r, "ten_ncc"), ma_ncc: get(r, "ma_ncc"), tac_gia: get(r, "tac_gia"), __raw: [...r],
      gia_dong: mapping.gia_dong >= 0 ? amount : null,
      __priceBasis: mapping.gia_dong >= 0 ? 'PRODUCT_LINE_AFTER_DISCOUNT' : 'UNIT_PRICE',
      hoan_tra: normalizeText(get(r, 'hoan_tra')), phan_loai: normalizeText(get(r, 'phan_loai')) };

    // Trường hợp 1: File có các cột chi nhánh phân phối (Wide format như FAHASA)
    if (mapping.branchColumns && mapping.branchColumns.length > 0) {
      if (r.some(v => String(v ?? "").trim())) {
        mapping.branchColumns.forEach((branch, bIdx) => {
          const qtyVal = String(r[branch.index] ?? "").trim();

          // Chỉ sinh dòng giao dịch khi số lượng > 0
          if (qtyVal !== "") {
            rows.push({
              ...metadata,
              __branchIndex: bIdx,
              ma_don,
              ngay,
              ten_sp,
              thuong_hieu,
              so_luong: qtyVal,
              gia,
              ma_dinh_danh,
              kenh: branch.branchName,
              trang_thai,
              _isUnpivoted: true,
            });
          }
        });
      }
    }
    // Trường hợp 2: File đơn hàng dạng danh sách giao dịch chuẩn (Long format)
    else {
      const so_luong = get(r, "so_luong");
      const kenh = get(r, "kenh");

      if (r.some(v => String(v ?? "").trim())) {
        rows.push({
          ...metadata,
          ma_don,
          ngay,
          ten_sp,
          thuong_hieu,
          so_luong,
          gia,
          ma_dinh_danh,
          kenh,
          trang_thai,
        });
      }
    }
  });

  return rows;
}

export function buildCatalog(dataRows, mapping) {
  return dataRows
    .map((r) => {
      const get = (f) => (mapping[f] >= 0 ? String(r[mapping[f]] ?? "").trim() : "");
      return {
        ma_dinh_danh: get("ma_dinh_danh"),
        ten_sp: get("ten_sp"),
        thuong_hieu: get("thuong_hieu"),
        danh_muc: get("danh_muc") || "Sách & Văn hóa phẩm",
        gia_chuan: get("gia_chuan") || get("gia"),
        // Source/catalog reference prices are not inferred from discounted sales.
        gia_bia: get(mapping.gia_bia === undefined ? "gia_chuan" : "gia_bia"),
        ma_ncc: get("ma_ncc"), ten_ncc: get("ten_ncc"), tac_gia: get("tac_gia"),
        phan_loai: get("phan_loai"),
      };
    })
    .filter((r) => r.ten_sp || r.ma_dinh_danh);
}
