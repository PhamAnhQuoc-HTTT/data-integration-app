/**
 * Cấu hình quy tắc & kiến thức Đa Ngành Hàng (Multi-Domain Knowledge Base)
 * Cho phép hệ thống tích hợp dữ liệu linh hoạt cho:
 * 1. Sách & Xuất bản phẩm (Books)
 * 2. Thời trang & May mặc (Fashion / Apparel)
 * 3. Điện tử & Thiết bị gia dụng (Electronics / Home Appliances)
 * 4. Mỹ phẩm & Hàng tiêu dùng (Cosmetics / FMCG)
 */

export const DOMAINS = {
  general: {
    id: "general",
    name: "Đa ngành hàng tổng hợp",
    icon: "Layers",
    idFieldLabel: "Mã định danh (Barcode / SKU / ISBN)",
    brandFieldLabel: "Thương hiệu / Nhà sản xuất / NCC",
    sizeColorSupported: true,
  },
  books: {
    id: "books",
    name: "Sách & Xuất bản phẩm",
    icon: "BookOpen",
    idFieldLabel: "Mã ISBN-13 / Barcode",
    brandFieldLabel: "Nhà xuất bản / Tác giả",
    brands: [
      { canonical: "NXB Kim Đồng", aliases: ["kim dong", "nxb kim dong", "chi nhanh nha xuat ban kim dong"] },
      { canonical: "NXB Trẻ", aliases: ["tre", "nxb tre", "nha xuat ban tre"] },
      { canonical: "NXB Nhã Nam", aliases: ["nha nam", "nxb nha nam", "cong ty co phan van hoa nha nam"] },
      { canonical: "NXB Hội Nhà Văn", aliases: ["hoi nha van", "nxb hoi nha van"] },
      { canonical: "NXB Tổng Hợp TP.HCM", aliases: ["tong hop", "nxb tong hop", "nxb tong hop tphcm"] },
      { canonical: "NXB Thế Giới", aliases: ["the gioi", "nxb the gioi"] },
      { canonical: "NXB Giáo Dục", aliases: ["giao duc", "nxb giao duc"] },
      { canonical: "NXB Văn Học", aliases: ["van hoc", "nxb van hoc"] },
    ],
  },
  fashion: {
    id: "fashion",
    name: "Thời trang & May mặc",
    icon: "Shirt",
    idFieldLabel: "Mã SKU / Barcode",
    brandFieldLabel: "Thương hiệu thời trang",
    sizeVariants: ["XS", "S", "M", "L", "XL", "XXL", "2XL", "3XL", "Free Size"],
    colorVariants: ["Đen", "Trắng", "Xám", "Xanh Navy", "Be", "Nâu", "Đỏ", "Vàng", "Hồng"],
    brands: [
      { canonical: "Coolmate", aliases: ["coolmate", "cool mate", "coolmate vn"] },
      { canonical: "Canifa", aliases: ["canifa", "canifa official"] },
      { canonical: "Uniqlo", aliases: ["uniqlo", "uniqlo vn"] },
      { canonical: "Zara", aliases: ["zara", "zara vietnam"] },
      { canonical: "Nike", aliases: ["nike", "nike official", "nike vn"] },
      { canonical: "Adidas", aliases: ["adidas", "adidas vn"] },
      { canonical: "Ananas", aliases: ["ananas", "ananas vn"] },
      { canonical: "Biti's", aliases: ["bitis", "biti's", "biti s", "bitis hunter"] },
    ],
  },
  electronics: {
    id: "electronics",
    name: "Điện máy & Gia dụng",
    icon: "Tv",
    idFieldLabel: "Model / Mã thiết bị",
    brandFieldLabel: "Hãng sản xuất",
    brands: [
      { canonical: "Sunhouse", aliases: ["sunhouse", "sunhouse group", "sunhouse vn"] },
      { canonical: "Lock&Lock", aliases: ["lock&lock", "lock and lock", "locknlock"] },
      { canonical: "Philips", aliases: ["philips", "philips official"] },
      { canonical: "Panasonic", aliases: ["panasonic", "panasonic vn"] },
      { canonical: "Xiaomi", aliases: ["xiaomi", "xiaomi official", "mi"] },
      { canonical: "Samsung", aliases: ["samsung", "samsung electronics"] },
      { canonical: "Kangaroo", aliases: ["kangaroo", "kangaroo vn"] },
    ],
  },
  cosmetics: {
    id: "cosmetics",
    name: "Mỹ phẩm & Chăm sóc cá nhân",
    icon: "Sparkles",
    idFieldLabel: "Barcode EAN-13 / SKU",
    brandFieldLabel: "Hãng mỹ phẩm",
    brands: [
      { canonical: "Cocoon", aliases: ["cocoon", "cocoon vietnam", "my pham cocoon"] },
      { canonical: "L'Oréal", aliases: ["loreal", "l'oreal", "l oreal"] },
      { canonical: "La Roche-Posay", aliases: ["la roche posay", "laroche posay", "lrp"] },
      { canonical: "Innisfree", aliases: ["innisfree", "innisfree official"] },
      { canonical: "Simple", aliases: ["simple", "simple skincare"] },
      { canonical: "CeraVe", aliases: ["cerave", "cerave official"] },
    ],
  },
};
