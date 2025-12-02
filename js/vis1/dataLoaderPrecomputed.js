// dataLoaderPrecomputed.js - 使用预聚合数据的加载器

class DataLoaderPrecomputed {
  constructor() {
    this.aggregatedData = null;
    this.loaded = false;
  }

  /**
   * 加载预聚合的 JSON 数据
   * @returns {Promise} Promise that resolves when data is loaded
   */
  async loadAll() {
    try {
      console.log('Loading precomputed aggregated data...');
      const startTime = performance.now();

      const response = await fetch('data/vis1_aggregated.json');
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }

      this.aggregatedData = await response.json();
      this.loaded = true;

      const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✓ Data loaded successfully in ${loadTime}s`);
      console.log(`  CMAs: ${Object.keys(this.aggregatedData.data).length}`);
      console.log(`  Income bins: ${this.aggregatedData.income_bins.length - 1}`);

      return this;
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  /**
   * 获取指定 CMA 和收入范围的数据
   * @param {string} cma - CMA code or 'overview'
   * @param {number} incomeMin - Minimum income
   * @param {number} incomeMax - Maximum income
   * @returns {Object} Aggregated data for the filters
   */
  getData(cma, incomeMin, incomeMax) {
    if (!this.loaded) {
      throw new Error('Data not loaded yet');
    }

    const cmaData = this.aggregatedData.data[cma] || this.aggregatedData.data['overview'];
    
    // 合并所有符合收入范围的数据
    let modeCounts2016 = {};
    let modeCounts2021 = {};
    let cmaCounts2016 = {};
    let cmaCounts2021 = {};
    let total2016 = 0;
    let total2021 = 0;

    // 遍历所有收入分段
    for (const [incomeKey, segmentData] of Object.entries(cmaData)) {
      const [segmentMin, segmentMax] = incomeKey.split('-').map(Number);
      
      // 检查这个分段是否与请求的收入范围有交集
      // 交集条件：分段的最大值 > 范围最小值 AND 分段的最小值 < 范围最大值
      if (segmentMax > incomeMin && segmentMin < incomeMax) {
        // 合并 mode counts
        for (const [mode, count] of Object.entries(segmentData.mode_counts_2016)) {
          modeCounts2016[mode] = (modeCounts2016[mode] || 0) + count;
        }
        for (const [mode, count] of Object.entries(segmentData.mode_counts_2021)) {
          modeCounts2021[mode] = (modeCounts2021[mode] || 0) + count;
        }

        // 合并 CMA counts
        for (const [cmaCode, count] of Object.entries(segmentData.cma_counts_2016)) {
          cmaCounts2016[cmaCode] = (cmaCounts2016[cmaCode] || 0) + count;
        }
        for (const [cmaCode, count] of Object.entries(segmentData.cma_counts_2021)) {
          cmaCounts2021[cmaCode] = (cmaCounts2021[cmaCode] || 0) + count;
        }

        total2016 += segmentData.total_2016;
        total2021 += segmentData.total_2021;
      }
    }

    return {
      modeCounts2016,
      modeCounts2021,
      cmaCounts2016,
      cmaCounts2021,
      total2016,
      total2021
    };
  }

  getCMANames() {
    return this.loaded ? this.aggregatedData.cma_names : {};
  }

  isLoaded() {
    return this.loaded;
  }
}
