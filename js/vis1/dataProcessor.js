// dataProcessor.js - Data filtering and aggregation module

class DataProcessor {
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * Filter data based on criteria
   * @param {Array} data - Raw data array
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered data
   */
  filterData(data, filters) {
    const {
      cma = null,
      incomeMin = 0,
      incomeMax = 150000,
      essentialCategory = 'all',
      includeCMAs = ['535', '462', '505', '933', '825', '835', '999']
    } = filters;

    const filtered = data.filter(row => {
      // Filter by CMA
      if (cma && cma !== 'overview') {
        if (row.CMA !== cma) return false;
      } else if (!includeCMAs.includes(row.CMA)) {
        return false;
      }

      // Filter by income
      const income = parseFloat(row.TotInc);
      if (isNaN(income) || income < incomeMin || income > incomeMax) return false;

      // Filter by essential worker
      if (!isEssentialWorker(row, essentialCategory)) return false;

      // Note: POWST filtering already done in dataLoader

      return true;
    });

    console.log(`Filtered ${filtered.length} rows from ${data.length} rows`);
    return filtered;
  }

  /**
   * Aggregate data by CMA for pie chart
   * @param {Object} filters - Filter criteria
   * @returns {Object} Aggregated data for 2016, 2021, and net change
   */
  aggregateForPieChart(filters) {
    const data2016 = this.dataLoader.getYearData('2016');
    const data2021 = this.dataLoader.getYearData('2021');

    console.log(`Raw data - 2016: ${data2016.length}, 2021: ${data2021.length}`);

    const filtered2016 = this.filterData(data2016, filters);
    const filtered2021 = this.filterData(data2021, filters);

    console.log(`Filtered data - 2016: ${filtered2016.length}, 2021: ${filtered2021.length}`);

    // Count by CMA with weights
    const counts2016 = this.countByCMA(filtered2016);
    const counts2021 = this.countByCMA(filtered2021);

    console.log('Counts by CMA - 2016:', counts2016);
    console.log('Counts by CMA - 2021:', counts2021);

    // Calculate totals
    const total2016 = d3.sum(Object.values(counts2016));
    const total2021 = d3.sum(Object.values(counts2021));

    // Calculate percentages
    const percentages2016 = {};
    const percentages2021 = {};
    const netChange = {};

    Object.keys({ ...counts2016, ...counts2021 }).forEach(cma => {
      const count16 = counts2016[cma] || 0;
      const count21 = counts2021[cma] || 0;

      percentages2016[cma] = total2016 > 0 ? (count16 / total2016) * 100 : 0;
      percentages2021[cma] = total2021 > 0 ? (count21 / total2021) * 100 : 0;
      netChange[cma] = percentages2021[cma] - percentages2016[cma];
    });

    const workerChangePercent = total2016 > 0 ? ((total2021 - total2016) / total2016) * 100 : 0;

    return {
      counts2016,
      counts2021,
      total2016,
      total2021,
      percentages2016,
      percentages2021,
      netChange,
      workerChangePercent,
      // For donut chart
      data2016: this.convertToChartData(percentages2016, counts2016),
      data2021: this.convertToChartData(percentages2021, counts2021)
    };
  }

  /**
   * Aggregate data by MODE for bar chart
   * @param {Object} filters - Filter criteria
   * @returns {Object} Aggregated data by mode
   */
  aggregateForBarChart(filters) {
    const data2016 = this.dataLoader.getYearData('2016');
    const data2021 = this.dataLoader.getYearData('2021');

    const filtered2016 = this.filterData(data2016, filters);
    const filtered2021 = this.filterData(data2021, filters);

    // Count by MODE with weights
    const counts2016 = this.countByMode(filtered2016);
    const counts2021 = this.countByMode(filtered2021);

    // Calculate totals
    const total2016 = d3.sum(Object.values(counts2016));
    const total2021 = d3.sum(Object.values(counts2021));

    // Calculate percentages
    const percentages2016 = {};
    const percentages2021 = {};
    const netChange = {};

    const allModes = new Set([...Object.keys(counts2016), ...Object.keys(counts2021)]);

    allModes.forEach(mode => {
      const count16 = counts2016[mode] || 0;
      const count21 = counts2021[mode] || 0;

      percentages2016[mode] = total2016 > 0 ? (count16 / total2016) * 100 : 0;
      percentages2021[mode] = total2021 > 0 ? (count21 / total2021) * 100 : 0;
      netChange[mode] = percentages2021[mode] - percentages2016[mode];
    });

    return {
      counts2016,
      counts2021,
      total2016,
      total2021,
      percentages2016,
      percentages2021,
      netChange,
      modes: Array.from(allModes)
    };
  }

  /**
   * Count records by CMA with weights
   * @param {Array} data - Filtered data
   * @returns {Object} Counts by CMA
   */
  countByCMA(data) {
    const counts = {};

    data.forEach(row => {
      const cma = row.CMA;
      const weight = parseFloat(row.WEIGHT) || 1;

      if (!counts[cma]) {
        counts[cma] = 0;
      }
      counts[cma] += weight;
    });

    return counts;
  }

  /**
   * Count records by MODE with weights
   * @param {Array} data - Filtered data
   * @returns {Object} Counts by MODE
   */
  countByMode(data) {
    const counts = {};

    data.forEach(row => {
      const mode = normalizeMode(row.MODE);
      const weight = parseFloat(row.WEIGHT) || 1;

      if (!mode || mode === 'Unknown') return;

      if (!counts[mode]) {
        counts[mode] = 0;
      }
      counts[mode] += weight;
    });

    return counts;
  }

  /**
   * Convert aggregated data to chart-friendly format
   * @param {Object} percentages - Percentages by CMA
   * @param {Object} counts - Counts by CMA
   * @returns {Array} Array of objects for chart
   */
  convertToChartData(percentages, counts) {
    return Object.entries(percentages)
      .map(([cma, percentage]) => ({
        cma,
        name: getCMAName(cma),
        percentage,
        count: counts[cma] || 0,
        color: getCMAColor(cma)
      }))
      .sort((a, b) => a.cma.localeCompare(b.cma)); // Sort by CMA code for consistent ordering
  }

  /**
   * Get summary statistics
   * @param {Object} filters - Filter criteria
   * @returns {Object} Summary statistics
   */
  getSummaryStats(filters) {
    const pieData = this.aggregateForPieChart(filters);
    const barData = this.aggregateForBarChart(filters);

    const total16 = pieData.total2016 || 0;
    const total21 = pieData.total2021 || 0;

    return {
      totalWorkers2016: total16,
      totalWorkers2021: total21,
      workerChange: total21 - total16,
      workerChangePercent: total16 > 0
        ? ((total21 - total16) / total16) * 100
        : 0,
      topCMA2016: pieData.data2016[0]?.name || 'N/A',
      topCMA2021: pieData.data2021[0]?.name || 'N/A',
      topMode2016: this.getTopMode(barData.percentages2016),
      topMode2021: this.getTopMode(barData.percentages2021)
    };
  }

  /**
   * Get the mode with highest percentage
   * @param {Object} percentages - Percentages by mode
   * @returns {string} Top mode name
   */
  getTopMode(percentages) {
    const sorted = Object.entries(percentages)
      .sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || 'N/A';
  }

  /**
   * Filter modes by category for display
   * @param {Array} modes - Array of mode names
   * @param {Object} showCategories - Which categories to show
   * @returns {Array} Filtered modes
   */
  filterModesByCategory(modes, showCategories) {
    const { showPublic, showPrivate, showOther } = showCategories;

    return modes.filter(mode => {
      const category = getModeCategory(mode);

      if (category === 'sustainable' && !showPublic) return false;
      if (category === 'car' && !showPrivate) return false;
      if (category === 'other' && !showOther) return false;

      return true;
    });
  }
}
