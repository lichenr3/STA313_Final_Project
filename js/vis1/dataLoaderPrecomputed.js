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
   * @param {string|Array} cma - CMA code(s) or 'overview', can be array for multiple CMAs
   * @param {number} incomeMin - Minimum income
   * @param {number} incomeMax - Maximum income
   * @returns {Object} Aggregated data for the filters
   */
  getData(cma, incomeMin, incomeMax) {
    if (!this.loaded) {
      throw new Error('Data not loaded yet');
    }

    // 支持传入数组或单个CMA
    let cmaArray = Array.isArray(cma) ? cma : [cma];
    
    // 如果包含'overview'或'all'，使用overview
    if (cmaArray.includes('overview') || cmaArray.includes('all') || cmaArray.includes('All')) {
      cmaArray = ['overview'];
    }

    // 初始化聚合变量
    let modeCounts2016 = {};
    let modeCounts2021 = {};
    let cmaCounts2016 = {};
    let cmaCounts2021 = {};
    let total2016 = 0;
    let total2021 = 0;

    // 获取CMA名称到代码的映射 (code -> name)
    const cmaNames = this.aggregatedData.cma_names || {};
    // 创建反向映射 (name -> code)
    const nameToCode = {};
    for (const [code, name] of Object.entries(cmaNames)) {
      nameToCode[name] = code;
    }
    
    // 城市名称标准化映射 (处理重音符号和名称差异)
    const nameNormalization = {
      'Montreal': 'Montréal',
      'Ottawa': 'Ottawa–Gatineau'
    };
    
    const selectedCmaCodes = cmaArray.map(name => {
      const normalizedName = nameNormalization[name] || name;
      return nameToCode[normalizedName] || name;
    }).filter(code => code !== 'overview');
    
    // 遍历所有选中的CMA
    for (const selectedCma of cmaArray) {
      // 将CMA名称转换为代码来访问数据
      if (selectedCma === 'overview') {
        var cmaKey = 'overview';
      } else {
        const normalizedName = nameNormalization[selectedCma] || selectedCma;
        var cmaKey = nameToCode[normalizedName] || selectedCma;
      }
      const cmaData = this.aggregatedData.data[cmaKey] || this.aggregatedData.data['overview'];
      
      // 遍历所有收入分段
      for (const [incomeKey, segmentData] of Object.entries(cmaData)) {
        const [segmentMin, segmentMax] = incomeKey.split('-').map(Number);
        
        // 检查这个分段是否与请求的收入范围有交集
        if (segmentMax > incomeMin && segmentMin < incomeMax) {
          // 合并 mode counts
          for (const [mode, count] of Object.entries(segmentData.mode_counts_2016)) {
            modeCounts2016[mode] = (modeCounts2016[mode] || 0) + count;
          }
          for (const [mode, count] of Object.entries(segmentData.mode_counts_2021)) {
            modeCounts2021[mode] = (modeCounts2021[mode] || 0) + count;
          }

          // 合并 CMA counts - 只包含被选中的CMA
          for (const [cmaCode, count] of Object.entries(segmentData.cma_counts_2016)) {
            // 如果是overview模式（选中所有CMA），包含所有sector
            // 否则只包含被选中的CMA的sector
            if (cmaArray.includes('overview') || selectedCmaCodes.includes(cmaCode)) {
              cmaCounts2016[cmaCode] = (cmaCounts2016[cmaCode] || 0) + count;
            }
          }
          for (const [cmaCode, count] of Object.entries(segmentData.cma_counts_2021)) {
            // 如果是overview模式（选中所有CMA），包含所有sector
            // 否则只包含被选中的CMA的sector
            if (cmaArray.includes('overview') || selectedCmaCodes.includes(cmaCode)) {
              cmaCounts2021[cmaCode] = (cmaCounts2021[cmaCode] || 0) + count;
            }
          }

          total2016 += segmentData.total_2016;
          total2021 += segmentData.total_2021;
        }
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
