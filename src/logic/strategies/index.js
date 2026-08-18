/**
 * Strategy Registry & Rule Engine for Entity Resolution
 * Cung cấp kiến trúc Strategy Pattern tách biệt 100% các cơ chế giải quyết xung đột thực thể.
 */
import { executeCatalogStrategy } from "./catalogStrategy";
import { executeMasterSourceStrategy } from "./masterSourceStrategy";
import { executeClusteringStrategy } from "./clusteringStrategy";
import { executeBipartiteStrategy } from "./bipartiteStrategy";

export const RESOLUTION_STRATEGIES = {
  CATALOG: {
    id: "CATALOG",
    name: "Có sẵn Master Catalog (Chuẩn)",
    badge: "Chuẩn mực",
    description: "Đối chiếu trực tiếp đơn hàng với tệp danh mục chuẩn theo chiến lược 3 tầng.",
    execute: executeCatalogStrategy,
  },
  MASTER_SOURCE: {
    id: "MASTER_SOURCE",
    name: "Cơ chế 1: Chọn 1 nguồn làm chuẩn",
    badge: "Cơ chế 1",
    description: "Chọn 1 tệp đơn hàng làm nguồn chuẩn (Master Source) để đối chiếu các tệp còn lại.",
    execute: executeMasterSourceStrategy,
  },
  CLUSTERING: {
    id: "CLUSTERING",
    name: "Cơ chế 2: Tự động gom cụm (Clustering)",
    badge: "Cơ chế 2",
    description: "Tự động gom nhóm sản phẩm tương đồng từ đa nguồn bằng thuật toán gom cụm thông minh.",
    execute: executeClusteringStrategy,
  },
  BIPARTITE: {
    id: "BIPARTITE",
    name: "Cơ chế 3: Ghép cặp tối ưu toàn cục (Bipartite)",
    badge: "Cơ chế 3 (Khuyên dùng)",
    description: "Giải bài toán phân bổ tối ưu toàn cục 1-1 giữa các nguồn, loại trừ hoàn toàn tranh chấp khớp.",
    execute: executeBipartiteStrategy,
  },
};

export function runResolutionStrategy(strategyKey, context) {
  const strat = RESOLUTION_STRATEGIES[strategyKey] || RESOLUTION_STRATEGIES.BIPARTITE;
  return strat.execute(context);
}
