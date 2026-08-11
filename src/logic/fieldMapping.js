/**
 * Field mapping: nhận diện & ánh xạ tên cột từ file gốc về schema chuẩn.
 * Áp dụng chung cho mọi ngành hàng (sách, thời trang, giày dép, gia dụng, phụ kiện...) —
 * khi đổi ngành hàng CHỈ cần sửa FIELD_PATTERNS, không sửa logic ở các module khác.
 */
import { removeDiacritics } from "./normalize";

export const FIELD_PATTERNS = {
  ma_don: ["ma don", "ma hoa don", "order id", "ma dh", "so don", "ma giao dich"],
  ngay: ["ngay gio", "ngay dat", "ngay ban", "ngay", "date"],
  ten_sp: ["ten san pham", "san pham", "ten hang", "ten sp", "tieu de", "ten"],
  thuong_hieu: ["thuong hieu", "nha san xuat", "nha cung cap", "nha xuat ban", "nxb", "tac gia", "brand", "publisher", "manufacturer", "author"],
  so_luong: ["so luong", "sl", "qty", "quantity"],
  gia: ["gia ban", "don gia", "gia", "price"],
  ma_dinh_danh: ["isbn", "barcode", "ma vach", "upc", "ean", "sku", "ma dinh danh", "ma san pham chuan", "ma sp chuan", "ma san pham", "ma sp"],
  kenh: ["kenh", "channel"],
  danh_muc: ["the loai", "danh muc", "category", "genre", "phan loai"],
  gia_chuan: ["gia bia", "gia niem yet", "gia goc", "gia chuan", "list price"],
  trang_thai: ["trang thai", "status"],
};

export const FIELD_LABELS = {
  ma_don: "Mã đơn", ngay: "Ngày", ten_sp: "Tên sản phẩm", thuong_hieu: "Thương hiệu/NCC",
  so_luong: "Số lượng", gia: "Giá bán", ma_dinh_danh: "Mã định danh",
  kenh: "Kênh", danh_muc: "Danh mục", gia_chuan: "Giá chuẩn", trang_thai: "Trạng thái",
};

/** Dò cột nào trong file khớp với field nào của schema chuẩn, theo tên cột (đã bỏ dấu). */
export function detectFields(headers) {
  const norm = headers.map((h) => removeDiacritics(h).toLowerCase().trim());
  const mapping = {};
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS)) {
    let idx = -1;
    for (let i = 0; i < norm.length; i++) {
      if (patterns.some((p) => norm[i].includes(p))) { idx = i; break; }
    }
    mapping[field] = idx;
  }
  return mapping;
}

export function buildRows(dataRows, mapping) {
  return dataRows
    .map((r) => {
      const get = (f) => (mapping[f] >= 0 ? String(r[mapping[f]] ?? "").trim() : "");
      return {
        ma_don: get("ma_don"), ngay: get("ngay"), ten_sp: get("ten_sp"),
        thuong_hieu: get("thuong_hieu"), so_luong: get("so_luong"),
        gia: get("gia"), ma_dinh_danh: get("ma_dinh_danh"), kenh: get("kenh"),
        trang_thai: get("trang_thai"),
      };
    })
    .filter((r) => r.ten_sp || r.ma_don);
}

export function buildCatalog(dataRows, mapping) {
  return dataRows
    .map((r) => {
      const get = (f) => (mapping[f] >= 0 ? String(r[mapping[f]] ?? "").trim() : "");
      return {
        ma_dinh_danh: get("ma_dinh_danh"), ten_sp: get("ten_sp"), thuong_hieu: get("thuong_hieu"),
        danh_muc: get("danh_muc"), gia_chuan: get("gia_chuan"),
      };
    })
    .filter((r) => r.ten_sp || r.ma_dinh_danh);
}
