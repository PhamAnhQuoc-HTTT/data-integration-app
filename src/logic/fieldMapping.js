/**
 * Field mapping: nhận diện & ánh xạ tên cột từ file gốc về schema chuẩn.
 * Áp dụng chung cho mọi ngành hàng và định dạng báo cáo (bao gồm cả báo cáo đa chi nhánh như FAHASA).
 */
import { removeDiacritics } from "./normalize";

export const FIELD_PATTERNS = {
  ma_don: ["ma don", "ma hoa don", "order id", "order", "ma dh", "so don", "ma giao dich", "stt", "invoice id", "invoice"],
  ngay: ["ngay gio", "ngay dat", "ngay ban", "ngay", "date", "created at", "created", "order date", "time", "timestamp"],
  ten_sp: ["ten san pham", "san pham", "ten hang", "ten sp", "tieu de", "ten", "product name", "product", "item name", "title"],
  thuong_hieu: ["ten ncc", "nha cung cap", "ncc", "ma ncc", "thuong hieu", "nha san xuat", "nha xuat ban", "nxb", "tac gia", "brand", "publisher", "manufacturer", "author", "vendor"],
  so_luong: ["so luong", "sl", "qty", "quantity", "count", "amount"],
  gia: ["gia ban", "don gia", "gia", "price", "unit price", "gia bia", "gia niem yet", "cost", "selling price"],
  ma_dinh_danh: ["barcode", "isbn", "ma vach", "upc", "ean", "sku id", "sku", "ma dinh danh", "ma san pham chuan", "ma sp chuan", "ma san pham", "ma sp", "item code"],
  kenh: ["kenh", "channel", "chi nhanh", "nha sach", "cua hang", "platform"],
  danh_muc: ["the loai", "danh muc", "category", "genre", "phan loai"],
  gia_chuan: ["gia bia", "gia niem yet", "gia goc", "gia chuan", "list price"],
  trang_thai: ["trang thai", "status", "tinh trang", "order status", "state"],
};

export const FIELD_LABELS = {
  ma_don: "Mã đơn", ngay: "Ngày", ten_sp: "Tên sản phẩm", thuong_hieu: "Thương hiệu/NCC",
  so_luong: "Số lượng", gia: "Giá bán", ma_dinh_danh: "Mã định danh",
  kenh: "Kênh", danh_muc: "Danh mục", gia_chuan: "Giá chuẩn", trang_thai: "Trạng thái",
};

/**
 * Dò cột nào trong file khớp với field nào của schema chuẩn.
 * Tự động phát hiện các cột chi nhánh xuất bán (như FAHASA: GDNSBT, GDNSTD...)
 */
export function detectFields(headers) {
  // Chuẩn hóa header: bỏ dấu, viết thường, chuyển _, -, . thành khoảng trắng
  const norm = headers.map((h) =>
    removeDiacritics(String(h || ""))
      .toLowerCase()
      .replace(/[_\-.]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  const mapping = { branchColumns: [] };

  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    let idx = -1;
    for (let i = 0; i < norm.length; i++) {
      if (patterns.some((p) => norm[i].includes(p) || norm[i] === p)) {
        idx = i;
        break;
      }
    }
    mapping[field] = idx;
  }

  // Phát hiện các cột chi nhánh xuất bán (Wide format / Pivot columns)
  // Ví dụ: "GDNSBT - NS FAHASA Long Bình Tân", "GDNSTD - NS Thủ Đức"
  headers.forEach((h, idx) => {
    const raw = String(h || "").trim();
    const n = removeDiacritics(raw).toLowerCase();
    
    // Nếu là cột chi nhánh có mã GDNS hoặc NS FAHASA hoặc Chi nhánh
    if ((n.includes("gdns") || n.includes("ns fahasa") || n.includes("chi nhanh")) && idx !== mapping.ten_sp && idx !== mapping.thuong_hieu) {
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

  return mapping;
}

/**
 * Chuyển đổi các dòng dữ liệu thô sang danh sách đối tượng giao dịch chuẩn.
 * Hỗ trợ tự động Unpivot nếu file là bảng phân phối ngang theo chi nhánh (như FAHASA).
 */
export function buildRows(dataRows, mapping) {
  const rows = [];
  const get = (r, f) => (mapping[f] >= 0 ? String(r[mapping[f]] ?? "").trim() : "");

  dataRows.forEach((r, rowIdx) => {
    const ten_sp = get(r, "ten_sp");
    const ma_dinh_danh = get(r, "ma_dinh_danh");
    const raw_ma_don = get(r, "ma_don");
    const ma_don = raw_ma_don || `ROW-${rowIdx + 1}`;
    const ngay = get(r, "ngay");
    const thuong_hieu = get(r, "thuong_hieu");
    const gia = get(r, "gia") || get(r, "gia_chuan");
    const trang_thai = get(r, "trang_thai") || "Hoàn thành";

    // Trường hợp 1: File có các cột chi nhánh phân phối (Wide format như FAHASA)
    if (mapping.branchColumns && mapping.branchColumns.length > 0) {
      if (ten_sp || ma_dinh_danh) {
        mapping.branchColumns.forEach((branch, bIdx) => {
          const qtyVal = String(r[branch.index] ?? "").trim();
          const numQty = parseFloat(qtyVal.replace(/[^\d.-]/g, ""));

          // Chỉ sinh dòng giao dịch khi số lượng > 0
          if (!isNaN(numQty) && numQty > 0) {
            rows.push({
              ma_don: `${ma_don}-BR${bIdx + 1}`,
              ngay: ngay || "2025-07-01",
              ten_sp,
              thuong_hieu,
              so_luong: numQty,
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

      if (ten_sp || raw_ma_don || ma_dinh_danh) {
        rows.push({
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
      };
    })
    .filter((r) => r.ten_sp || r.ma_dinh_danh);
}
