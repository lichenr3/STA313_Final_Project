// vis1_main_new.js - Updated main application controller with separate filters

class App {
  constructor() {
    this.dataLoader = new DataLoaderPrecomputed();
    this.dataProcessor = null;
    this.pieFilterManager = null;
    this.barFilterManager = null;
    this.pieChart = null;
    this.barChart = null;

    this.init();
  }

  async init() {
    try {
      this.showLoading();

      const loadingMessage = document.querySelector('.loading p');
      if (loadingMessage) {
        loadingMessage.textContent = 'Loading precomputed data...';
      }

      await this.dataLoader.loadAll();

      if (loadingMessage) {
        loadingMessage.textContent = 'Initializing visualizations...';
      }

      this.dataProcessor = new DataProcessorPrecomputed(this.dataLoader);

      // Initialize separate filter managers
      this.pieFilterManager = new PieFilterManager();
      this.barFilterManager = new BarFilterManager();

      // Populate CMA options for both
      const cmaCodes = ['535', '462', '505', '933', '825', '835'];
      this.pieFilterManager.populateCMAOptions(cmaCodes);
      this.barFilterManager.populateCMAOptions(cmaCodes);

      // Set up filter change handlers
      this.pieFilterManager.onFilterChange = (state) => {
        this.renderPieChart();
      };

      this.barFilterManager.onFilterChange = (state) => {
        this.renderBarChart();
      };

      // Listen for CMA selection from pie chart
      document.addEventListener('cmaSelected', (e) => {
        const cmaCode = e.detail.cma;
        this.pieFilterManager.handleExternalCMASelection(cmaCode);
        this.barFilterManager.handleExternalCMASelection(cmaCode);
      });

      // Subscribe to global city changes
      if (typeof globalStateManager !== 'undefined') {
        globalStateManager.subscribe((detail) => {
          // Only respond to changes from other visualizations (not from our own pie/bar charts)
          if (detail.source !== 'vis1-pie' && detail.source !== 'vis1-bar') {
            console.log('Vis 1 received global city change:', detail.value);
            
            let cmaCode = detail.value;
            
            // If it's a name (from Vis2), convert to code using global mapping
            if (globalStateManager.nameToCma[detail.value]) {
              cmaCode = globalStateManager.nameToCma[detail.value];
            }
            
            this.pieFilterManager.handleExternalCMASelection(cmaCode);
            this.barFilterManager.handleExternalCMASelection(cmaCode);
          }
        });
      }

      if (loadingMessage) {
        loadingMessage.textContent = 'Rendering charts...';
      }

      this.hideLoading();
      this.initializeCharts();
      this.render();

      console.log('✓ Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      this.showError(error.message);
    }
  }

  initializeCharts() {
    const pieContainer = document.getElementById('pie-chart-container');
    const barContainer = document.getElementById('bar-chart-container');

    if (!pieContainer || !barContainer) {
      console.error('Chart containers not found!');
      return;
    }

    console.log('Initializing charts...');

    this.pieChart = new PieChart('#pie-chart-container', {
      width: 600,
      height: 500
    });

    this.barChart = new BarChart('#bar-chart-container', {
      width: 900,
      height: 450
    });

    console.log('Charts initialized');
  }

  render() {
    this.renderPieChart();
    this.renderBarChart();
  }

  renderPieChart() {
    const filterCriteria = this.pieFilterManager.getFilterCriteria();
    const filterState = this.pieFilterManager.getState();

    console.log('Rendering pie chart with criteria:', filterCriteria);

    const aggregatedData = this.dataProcessor.aggregateForPieChart(filterCriteria);
    console.log('Aggregated data:', aggregatedData);

    if (!aggregatedData.data2016 || aggregatedData.data2016.length === 0 ||
      !aggregatedData.data2021 || aggregatedData.data2021.length === 0) {
      console.warn('No data to display in pie chart');
      return;
    }

    this.pieChart.update(aggregatedData);
    this.updatePieInfoPanel(aggregatedData, filterState);
  }

  renderBarChart() {
    const filterCriteria = this.barFilterManager.getFilterCriteria();
    const filterState = this.barFilterManager.getState();

    console.log('Rendering bar chart with criteria:', filterCriteria);

    const aggregatedData = this.dataProcessor.aggregateForBarChart(filterCriteria);
    console.log('Aggregated data for bar:', aggregatedData);

    const chartOptions = this.barFilterManager.getChartOptions();
    console.log('Chart options:', chartOptions);

    if (!aggregatedData || !aggregatedData.modes || aggregatedData.modes.length === 0) {
      console.warn('No data to display in bar chart');
      return;
    }

    this.barChart.update(aggregatedData, chartOptions);
    this.updateBarInfoPanel(aggregatedData, filterState);
  }

  updatePieInfoPanel(data, filterState) {
    const infoPanel = document.getElementById('info-panel-pie');
    if (!infoPanel) return;

    let html = '<div class="info-content">';
    html += `<h3>Summary</h3>`;
    html += `<p><strong>Total Low-Income Essential Workers (2021):</strong> ${formatNumber(Math.round(data.total2021))}</p>`;
    html += `<p><strong>Change from 2016:</strong> ${formatNumber(Math.round(data.total2021 - data.total2016))} 
              (${formatPercent(((data.total2021 - data.total2016) / data.total2016) * 100)}%)</p>`;
    html += `<h4>Distribution by CMA (2021):</h4><ul>`;

    data.data2021.forEach(d => {
      const netChange = data.netChange[d.cma];
      const changeSymbol = netChange >= 0 ? '+' : '';
      const changeColor = netChange >= 0 ? '#43a047' : '#e53935';
      html += `<li><strong>${d.name}:</strong> ${formatPercent(d.percentage)}% 
                  (<span style="color:${changeColor}">${changeSymbol}${formatPercent(netChange)}pp</span>)</li>`;
    });
    html += '</ul></div>';
    infoPanel.innerHTML = html;
  }

  updateBarInfoPanel(data, filterState) {
    const infoPanel = document.getElementById('info-panel-bar');
    if (!infoPanel) return;

    let html = '<div class="info-content">';
    html += `<h3>Insights</h3>`;
    html += `<p>Interact with the bar chart to see details here.</p>`;
    html += `</div>`;
    infoPanel.innerHTML = html;
  }

  showLoading() {
    const container = document.getElementById('chart-container-pie');
    if (container) {
      container.innerHTML = `
        <div class="loading" style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column;">
          <div class="loading-spinner"></div>
          <p>Loading census data...</p>
          <p style="font-size: 0.9em; color: #666; margin-top: 1rem;">
            Loading large CSV files (may take 10-30 seconds)
          </p>
        </div>
      `;
    }
  }

  hideLoading() {
    const pieContainer = document.getElementById('chart-container-pie');
    const barContainer = document.getElementById('chart-container-bar');

    if (pieContainer) {
      pieContainer.innerHTML = `<div id="pie-chart-container" style="width: 100%; height: 100%;"></div>`;
    }
    if (barContainer) {
      barContainer.innerHTML = `<div id="bar-chart-container" style="width: 100%; height: 100%;"></div>`;
    }
  }

  showError(message) {
    const container = document.getElementById('chart-container-pie');
    if (container) {
      container.innerHTML = `
        <div class="error">
          <h3>Error Loading Data</h3>
          <p>${message}</p>
          <p>Please make sure all CSV files are present in the data/ folder:</p>
          <ul>
            <li>census_16_metro.csv</li>
            <li>census_21_metro.csv</li>
            <li>census_16_other.csv</li>
            <li>census_21_other.csv</li>
          </ul>
        </div>
      `;
    }
  }

  handleResize() {
    if (this.pieChart) {
      const pieContainer = document.getElementById('pie-chart-container');
      if (pieContainer) {
        this.pieChart.resize(pieContainer.clientWidth, 500);
      }
    }
    if (this.barChart) {
      const barContainer = document.getElementById('bar-chart-container');
      if (barContainer) {
        this.barChart.resize(barContainer.clientWidth, 450);
      }
    }
    this.render();
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();

  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      app.handleResize();
    }, 250);
  });

  window.app = app;
});
