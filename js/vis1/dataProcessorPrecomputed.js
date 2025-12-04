// dataProcessorPrecomputed.js - 处理预聚合数据的处理器

class DataProcessorPrecomputed {
  constructor(dataLoader) {
    this.dataLoader = dataLoader;
  }

  /**
   * 为饼图聚合数据
   * @param {Object} filters - Filter criteria
   * @returns {Object} Aggregated data for 2016, 2021, and net change
   */
  aggregateForPieChart(filters) {
    const {
      cma = 'overview',
      incomeMin = 0,
      incomeMax = 150000
    } = filters;

    const data = this.dataLoader.getData(cma, incomeMin, incomeMax);
    
    const counts2016 = data.cmaCounts2016;
    const counts2021 = data.cmaCounts2021;
    const total2016 = data.total2016;
    const total2021 = data.total2021;

    // 计算百分比
    const percentages2016 = {};
    const percentages2021 = {};
    const netChange = {};

    Object.keys({ ...counts2016, ...counts2021 }).forEach(cmaCode => {
      const count16 = counts2016[cmaCode] || 0;
      const count21 = counts2021[cmaCode] || 0;

      percentages2016[cmaCode] = total2016 > 0 ? (count16 / total2016) * 100 : 0;
      percentages2021[cmaCode] = total2021 > 0 ? (count21 / total2021) * 100 : 0;
      netChange[cmaCode] = percentages2021[cmaCode] - percentages2016[cmaCode];
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
      data2016: this.convertToChartData(percentages2016, counts2016),
      data2021: this.convertToChartData(percentages2021, counts2021)
    };
  }

  /**
   * 为柱状图聚合数据
   * @param {Object} filters - Filter criteria
   * @returns {Object} Aggregated data for bar chart
   */
  aggregateForBarChart(filters) {
    const {
      cma = 'overview',
      incomeMin = 0,
      incomeMax = 150000
    } = filters;

    const data = this.dataLoader.getData(cma, incomeMin, incomeMax);
    
    const counts2016 = data.modeCounts2016;
    const counts2021 = data.modeCounts2021;
    const total2016 = data.total2016;
    const total2021 = data.total2021;

    // 计算百分比
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

    // 计算绝对数量变化
    const netChangeAbsolute = {};
    allModes.forEach(mode => {
      const count16 = counts2016[mode] || 0;
      const count21 = counts2021[mode] || 0;
      netChangeAbsolute[mode] = count21 - count16;
    });

    return {
      counts2016,
      counts2021,
      total2016,
      total2021,
      percentages2016,
      percentages2021,
      netChange,
      netChangeAbsolute,
      modes: Array.from(allModes)
    };
  }

  /**
   * 转换聚合数据为图表友好的格式
   * @param {Object} percentages - Percentages by CMA
   * @param {Object} counts - Counts by CMA
   * @returns {Array} Chart data array
   */
  convertToChartData(percentages, counts) {
    const cmaNames = this.dataLoader.getCMANames();
    
    // 使用固定的 CMA 顺序
    const cmaOrder = ['535', '462', '505', '933', '825', '835'];
    
    return cmaOrder
      .filter(cma => percentages[cma] > 0)  // 只包含有数据的 CMA
      .map(cma => ({
        cma,
        name: cmaNames[cma] || cma,
        percentage: percentages[cma],
        count: counts[cma] || 0,
        color: getCMAColor(cma)  // 添加颜色
      }));
  }

  /**
   * 获取所有可用的 CMA 代码
   * @returns {Array} Array of CMA codes
   */
  getAvailableCMACodes() {
    const cmaNames = this.dataLoader.getCMANames();
    return Object.keys(cmaNames);
  }
}
