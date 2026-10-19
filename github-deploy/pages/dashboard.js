// Page renderer extracted from app.js. Depends on shared helpers/globals in app.js.

function renderDashboard() {
  const period = dashboardPeriod();
  const range = dashboardPeriodRange(period);
  const financialRange = dashboardReportRange(period, range);
  const merchantCode = dashboardMerchantCode();
  requestDashboardFinancialSummary(financialRange);
  if (typeof requestReportOrderSummary === "function") requestReportOrderSummary(financialRange);
  const periodOrders = state.orders.filter(order => orderMatchesMerchant(order, merchantCode) && isDashboardOrderInRange(order, range));
  const completed = periodOrders.filter(order => order.status === "Selesai" || order.paymentStatus === "Lunas");
  const orderSummary = typeof reportOrderSummary === "function"
    ? reportOrderSummary(financialRange, merchantCode)
    : { loaded: false, byType: {}, totalDone: 0 };
  const financialRecords = dashboardFinancialRecords(financialRange, merchantCode);
  const sales = financialRecords.reduce((sum, record) => sum + Number(record.total || 0), 0);
  const profit = financialRecords.reduce((sum, record) => sum + Number(record.profit || 0), 0);
  const paidTransactionCount = financialRecords.reduce((sum, record) => sum + Number(record.count || record.transaction_count || 1), 0);
  const transactionCount = Math.max(paidTransactionCount, periodOrders.length);
  const availableProducts = state.products.filter(product => product.active && !product.soldOut).length;
  const categories = productCategories();
  const topItems = completed
    .flatMap(order => order.items || order.cart || [])
    .reduce((list, item) => {
      const name = item.name || "Produk";
      const found = list.find(row => row.name === name);
      if (found) {
        found.qty += Number(item.qty || 0);
        found.total += cartItemTotal(item);
      } else {
        list.push({ name, qty: Number(item.qty || 0), total: cartItemTotal(item) });
      }
      return list;
    }, [])
    .sort((a, b) => b.qty - a.qty || b.total - a.total)
    .slice(0, 3);
  const quickStats = [
    ["Omzet", money(sales)],
    ["Laba Bersih", money(profit)],
    ["Transaksi", transactionCount.toLocaleString("id-ID")]
  ];
  const transactionsByType = ORDER_TYPES.map(type => ({
    id: type.id,
    count: Number(orderSummary.byType[type.id] || 0) + periodOrders.filter(order =>
      order.type === type.id && order.status !== "Dibatalkan" && !isReportableOrder(order)
    ).length
  }));
  return `
    ${activeRole() !== "kasir" ? renderMerchantScopeFilter("dashboard", merchantCode) : ""}
    ${dashboardPeriodFilter(period)}
    <section class="dashboard-hero">
      <div class="dashboard-quick-stats">
        ${quickStats.map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`).join("")}
      </div>
    </section>
    <div class="dashboard-main-grid">
      <div class="card dashboard-status-card">
        <div class="section-title">
          <div><h3>Operasional</h3><p>Kondisi toko yang perlu dipantau.</p></div>
        </div>
        <div class="dashboard-status-list">
          ${transactionsByType.map(type => `
            <div class="status-row ${type.id === "Dine In" ? "info" : "warn"}">
              <i>${navIcon(type.id === "Dine In" ? "kitchen" : "cart")}</i>
              <span>${type.id === "Dine In" ? "Ditempat" : "Bungkus"}</span>
              <strong>${type.count.toLocaleString("id-ID")}</strong>
            </div>
          `).join("")}
          <div class="status-row success"><i>${navIcon("products")}</i><span>Produk aktif</span><strong>${availableProducts} produk</strong></div>
          <div class="status-row warn"><i>${navIcon("dashboard")}</i><span>Kategori</span><strong>${categories.length} tersedia</strong></div>
        </div>
      </div>
      <div class="card dashboard-trend-card">
        <div class="section-title">
          <div><h3>Produk Terlaris</h3><p>Diambil dari transaksi selesai pada periode ini.</p></div>
          <button class="btn ghost" onclick="openTodayProductSalesReport()">Lihat Semua</button>
        </div>
        <div class="dashboard-top-products">
          ${topItems.map(item => `
            <div class="dashboard-top-product-row">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${Number(item.qty || 0).toLocaleString("id-ID")}</span>
            </div>
          `).join("") || `<div class="dashboard-empty-state"><span></span><p>Belum ada produk terjual pada periode ini.</p></div>`}
        </div>
      </div>
    </div>
  `;
}

function openTodayProductSalesReport() {
  sessionStorage.setItem("report_section", "productSales");
  sessionStorage.setItem("report_period", "day");
  sessionStorage.removeItem("product_report_query");
  go("reports");
}

function dashboardPeriodFilter(activePeriod) {
  const items = [
    ["today", "Hari ini"],
    ["yesterday", "Kemarin"],
    ["week", "Minggu ini"],
    ["month", "Bulan ini"]
  ];
  return `
    <div class="dashboard-period-filter transaction-period-menu" role="tablist" aria-label="Filter periode dashboard">
      ${items.map(([key, label]) => `
        <button type="button" role="tab" aria-selected="${key === activePeriod}" class="${key === activePeriod ? "active" : ""}" onclick="setDashboardPeriod('${key}')">
          ${label}
        </button>
      `).join("")}
    </div>
  `;
}

function dashboardPeriod() {
  const period = sessionStorage.getItem("dashboard_period") || "today";
  return ["today", "yesterday", "week", "month"].includes(period) ? period : "today";
}

function setDashboardPeriod(period) {
  sessionStorage.setItem("dashboard_period", period);
  render();
}

function dashboardPeriodLabel(period) {
  return {
    today: "Hari ini",
    yesterday: "Kemarin",
    week: "Minggu ini",
    month: "Bulan ini"
  }[period] || "Hari ini";
}

function dashboardPeriodRange(period) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);

  if (period === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate());
    return { start, end };
  }

  if (period === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    end.setTime(start.getTime());
    end.setDate(end.getDate() + 7);
    return { start, end };
  }

  if (period === "month") {
    start.setDate(1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 1);
    return { start, end };
  }

  end.setDate(end.getDate() + 1);
  return { start, end };
}

function dashboardReportRange(period, range) {
  const end = new Date(range.end);
  end.setMilliseconds(end.getMilliseconds() - 1);
  return {
    period: `dashboard-${period || "today"}`,
    start: range.start,
    end,
    label: dashboardPeriodLabel(period),
    group: period === "month" || period === "week" ? "day" : "hour"
  };
}

function dashboardFinancialMonths(range) {
  const months = [];
  const current = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
  const last = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
  while (current <= last) {
    months.push({ year: current.getFullYear(), month: current.getMonth() + 1 });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function requestDashboardFinancialSummary(range) {
  if (!supabaseReadable() || !range) return;
  const staleMonths = dashboardFinancialMonths(range).filter(({ year, month }) => {
    const key = legacyProfitSummaryCacheKey("days", year, month);
    const loadedAt = Math.max(
      Number(profitSummaryLoadedAt.get(key) || 0),
      Number(legacyProfitSummaryLoadedAt.get(key) || 0)
    );
    return !profitSummaryLoadingKeys.has(key) && Date.now() - loadedAt >= 60000;
  });
  if (!staleMonths.length) return;
  Promise.all(staleMonths.map(({ year, month }) => loadProfitSummary("days", year, month, false))).then(() => {
    if (view === "dashboard" && !isBlockingInteractionActive()) render();
  });
}

function dashboardFinancialSummary(range) {
  if (!range) return [];
  const months = dashboardFinancialMonths(range);
  const loaded = months.every(({ year, month }) => {
    const key = legacyProfitSummaryCacheKey("days", year, month);
    return profitSummaryLoadedAt.has(key) || legacyProfitSummaryLoadedAt.has(key);
  });
  const rows = months
    .flatMap(({ year, month }) => profitSummaryCache.days[`${year}-${month}`] || [])
    .filter(row => {
      const date = new Date(`${row.salesDate || todayKey(new Date(row.year, Number(row.month || 1) - 1, row.day || 1))}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= range.start && date <= range.end;
    });
  return { loaded, rows };
}

function dashboardFallbackFinancialRecords(range, merchantCode = "all") {
  return reportSourceRecords(range, merchantCode).map(record => ({
    total: Number(record.total || 0),
    profit: Number(record.profit || 0),
    count: 1
  }));
}

function dashboardFinancialRecords(range, merchantCode = "all") {
  const summary = dashboardFinancialSummary(range);
  const fallback = dashboardFallbackFinancialRecords(range, merchantCode);
  if (merchantCode !== "all") return fallback;
  const hasSummaryValue = summary.rows.some(row => Number(row.total || 0) || Number(row.profit || 0));
  if (summary.loaded && (hasSummaryValue || !fallback.length)) {
    return summary.rows;
  }
  return fallback;
}

function isDashboardOrderInRange(order, range) {
  const value = order?.createdAt ? new Date(order.createdAt) : null;
  if (!value || Number.isNaN(value.getTime())) return false;
  return value >= range.start && value < range.end;
}

