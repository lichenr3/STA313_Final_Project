// dataLoader.js - Data loading module

class DataLoader {
  constructor() {
    this.rawData = {
      metro2016: [],
      metro2021: [],
      other2016: [],
      other2021: []
    };
    this.loaded = false;
  }

  /**
   * Load all CSV files with streaming and filtering
   * @returns {Promise} Promise that resolves when all data is loaded
   */
  async loadAll() {
    try {
      console.log('Loading census data (this may take a moment for large files)...');

      // Load files sequentially to reduce memory pressure
      // Apply basic filtering during load to reduce memory usage
      const loadAndFilter = async (path, year) => {
        console.log(`Loading ${path}...`);
        const startTime = performance.now();

        const data = await d3.csv(path, (row) => {
          // Pre-filter: only keep relevant columns and valid rows
          // Skip rows with missing critical data
          if (!row.CMA || !row.POWST || !row.TotInc || !row.WEIGHT) {
            return null; // Skip this row
          }

          // Only keep rows for our target CMAs
          // CMAs to include: Toronto, Montreal, Ottawa, Vancouver, Calgary, Edmonton
          const targetCMAs = ['535', '462', '505', '933', '825', '835'];
          if (!targetCMAs.includes(row.CMA)) {
            return null;
          }

          // Only keep in-person workers (POWST 3 or 4)
          if (row.POWST !== '3' && row.POWST !== '4') {
            return null;
          }

          // Only keep rows with reasonable income values
          const income = parseFloat(row.TotInc);
          if (isNaN(income) || income <= 0 || income > 150000) {
            return null;
          }

          // Return only the columns we need to reduce memory
          return {
            CMA: row.CMA,
            TotInc: row.TotInc,
            POWST: row.POWST,
            MODE: row.MODE,
            NAICS: row.NAICS,
            WEIGHT: row.WEIGHT,
            year: year
          };
        });

        // Filter out null entries
        const filtered = data.filter(d => d !== null);

        const endTime = performance.now();
        console.log(`  Loaded ${filtered.length} relevant rows from ${path} in ${Math.round(endTime - startTime)}ms`);

        return filtered;
      };

      // Load files one by one to avoid overwhelming the browser
      // Use GitHub's raw content URL for LFS files on GitHub Pages
      const baseUrl = window.location.hostname === 'lichenr3.github.io' 
        ? 'https://github.com/lichenr3/STA313_Final_Project/raw/main/'
        : '';
      
      const metro16 = await loadAndFilter(baseUrl + 'data/census_16_metro.csv', '2016');
      const metro21 = await loadAndFilter(baseUrl + 'data/census_21_metro.csv', '2021');

      this.rawData.metro2016 = metro16;
      this.rawData.metro2021 = metro21;
      // other2016 and other2021 are no longer used

      this.loaded = true;

      const totalRows = metro16.length + metro21.length;
      console.log(`✓ Data loaded successfully: ${totalRows} total rows (filtered from source files)`);

      return this.rawData;
    } catch (error) {
      console.error('Error loading data:', error);
      throw new Error('Failed to load census data files. Please check that all CSV files are in the data/ folder.');
    }
  }

  /**
   * Get combined data for a specific year
   * @param {string} year - '2016' or '2021'
   * @returns {Array} Combined metro and other data
   */
  getYearData(year) {
    if (!this.loaded) {
      console.warn('Data not loaded yet');
      return [];
    }

    if (year === '2016') {
      return this.rawData.metro2016;
    } else if (year === '2021') {
      return this.rawData.metro2021;
    } else {
      console.warn(`Invalid year: ${year}`);
      return [];
    }
  }

  /**
   * Get data for specific CMAs
   * @param {Array} cmaCodes - Array of CMA codes (e.g., ['535', '462', '505'])
   * @param {string} year - '2016' or '2021'
   * @returns {Array} Filtered data
   */
  getCMAData(cmaCodes, year) {
    const yearData = this.getYearData(year);
    return yearData.filter(row => cmaCodes.includes(row.CMA));
  }

  /**
   * Get all available CMA codes from the data
   * @returns {Array} Unique CMA codes
   */
  getAllCMACodes() {
    if (!this.loaded) return [];

    const allData = [
      ...this.rawData.metro2016,
      ...this.rawData.metro2021
    ];

    const cmaCodes = new Set();
    allData.forEach(row => {
      if (row.CMA) {
        cmaCodes.add(row.CMA);
      }
    });

    return Array.from(cmaCodes).sort();
  }

  /**
   * Get unique MODE values from the data
   * @returns {Object} Object with modes for each year
   */
  getAllModes() {
    if (!this.loaded) return { 2016: [], 2021: [] };

    const modes2016 = new Set();
    const modes2021 = new Set();

    this.rawData.metro2016.forEach(row => {
      if (row.MODE) modes2016.add(row.MODE);
    });

    this.rawData.metro2021.forEach(row => {
      if (row.MODE) modes2021.add(row.MODE);
    });

    return {
      2016: Array.from(modes2016).sort(),
      2021: Array.from(modes2021).sort()
    };
  }

  /**
   * Check if data is loaded
   * @returns {boolean}
   */
  isLoaded() {
    return this.loaded;
  }

  /**
   * Get raw data object
   * @returns {Object}
   */
  getRawData() {
    return this.rawData;
  }
}

// Create singleton instance
const dataLoader = new DataLoader();
