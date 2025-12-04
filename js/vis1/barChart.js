// barChart.js - Bar chart component for commute mode distribution

class BarChart {
  constructor(containerId, options = {}) {
    this.container = d3.select(containerId);
    this.data = [];
    this.displayMode = 'percentage'; // 'percentage' or 'actual'
    this.showNetChange = false;

    // Chart dimensions
    this.width = options.width || 900;
    this.height = options.height || 450;
    this.margin = options.margin || { top: 60, right: 100, bottom: 140, left: 80 };

    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.tooltip = new Tooltip();

    this.init();
  }

  init() {
    // Clear container
    this.container.html('');

    // Create SVG
    this.svg = this.container
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'bar-chart');

    // Create main group
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    // Create axes groups
    this.xAxisGroup = this.g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${this.innerHeight})`);

    this.yAxisGroup = this.g.append('g')
      .attr('class', 'y-axis');

    // Create bars group
    this.barsGroup = this.g.append('g').attr('class', 'bars');

    // Add title
    this.titleText = this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.margin.top - 30)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', '#8e24aa');

    // Add axis labels
    this.yLabel = this.svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -this.height / 2)
      .attr('y', 20)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#666');

    this.xLabel = this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height - 10)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('fill', '#666')
      .text('Commute Mode');

    // Create scales
    this.xScale = d3.scaleBand()
      .range([0, this.innerWidth])
      .padding(0.2);

    this.yScale = d3.scaleLinear()
      .range([this.innerHeight, 0]);

    // Style axes
    this.styleAxes();
  }

  styleAxes() {
    this.svg.selectAll('.axis path, .axis line')
      .style('stroke', '#666')
      .style('stroke-width', 1);

    this.svg.selectAll('.axis text')
      .style('font-size', '12px')
      .style('fill', '#333');
  }

  update(aggregatedData, options = {}) {
    const {
      displayMode = 'percentage',
      showNetChange = false,
      year = '2021',
      showPublic = true,
      showPrivate = true,
      showOther = true
    } = options;

    this.displayMode = displayMode;
    this.showNetChange = showNetChange;

    // Prepare data based on options
    let chartData;

    if (showNetChange) {
      // Show net change
      chartData = this.prepareNetChangeData(aggregatedData, showPublic, showPrivate, showOther);
      this.updateTitle('Net Change in Commute Mode (2021 - 2016)');
      this.updateYLabel('Percentage Point Change (%)');
    } else {
      // Show percentage or actual counts
      const yearData = year === '2016'
        ? (displayMode === 'percentage' ? aggregatedData.percentages2016 : aggregatedData.counts2016)
        : (displayMode === 'percentage' ? aggregatedData.percentages2021 : aggregatedData.counts2021);

      chartData = this.prepareRegularData(yearData, showPublic, showPrivate, showOther);
      this.updateTitle(`Commute Mode Distribution (${year})`);
      this.updateYLabel(displayMode === 'percentage' ? 'Percentage (%)' : 'Number of Workers');
    }

    // Update scales
    this.xScale.domain(chartData.map(d => d.mode));

    const yExtent = d3.extent(chartData, d => d.value);
    const yMax = showNetChange
      ? Math.max(Math.abs(yExtent[0]), Math.abs(yExtent[1])) * 1.1
      : yExtent[1] * 1.1;
    const yMin = showNetChange ? -yMax : 0;

    this.yScale.domain([yMin, yMax]);

    // Update axes
    this.updateAxes();

    // Draw bars
    this.drawBars(chartData);

    // Draw zero line if showing net change
    if (showNetChange) {
      this.drawZeroLine();
    } else {
      this.g.selectAll('.zero-line').remove();
    }
  }

  prepareRegularData(data, showPublic, showPrivate, showOther) {
    // Convert data object to array
    let chartData = Object.keys(data).map(mode => ({
      mode,
      value: data[mode],
      category: getModeCategory(mode),
      color: getModeColor(mode)
    }));

    // Filter based on options
    chartData = chartData.filter(d => {
      if (d.category === 'sustainable' && !showPublic) return false;
      if (d.category === 'car' && !showPrivate) return false;
      if (d.category === 'other' && !showOther) return false;
      return true;
    });

    // Sort by value descending
    chartData.sort((a, b) => b.value - a.value);

    return chartData;
  }

  prepareNetChangeData(aggregatedData, showPublic, showPrivate, showOther) {
    // 使用固定顺序
    const orderedModes = typeof MODE_ORDER !== 'undefined' ? MODE_ORDER : Object.keys(aggregatedData.netChange);

    return orderedModes
      .filter(mode => mode in aggregatedData.netChange)
      .map(mode => ({
        mode,
        value: aggregatedData.netChange[mode],
        category: getModeCategory(mode),
        color: aggregatedData.netChange[mode] >= 0 ? '#43a047' : '#e53935'
      }))
      .filter(d => {
        if (d.category === 'sustainable' && !showPublic) return false;
        if (d.category === 'car' && !showPrivate) return false;
        if (d.category === 'other' && !showOther) return false;
        return true;
      });
  }

  updateAxes() {
    // X axis
    const xAxis = d3.axisBottom(this.xScale)
      .tickSize(0)
      .tickPadding(10);

    this.xAxisGroup
      .transition()
      .duration(transitionDuration())
      .call(xAxis);

    // Rotate x-axis labels and truncate long text
    this.xAxisGroup.selectAll('text')
      .style('text-anchor', 'end')
      .attr('dx', '-0.8em')
      .attr('dy', '0.15em')
      .attr('transform', 'rotate(-45)')
      .style('font-size', '10px')
      .each(function() {
        const text = d3.select(this);
        const originalText = text.text();
        // Truncate to max 15 characters
        if (originalText.length > 15) {
          text.text(originalText.substring(0, 13) + '...');
        }
      });

    // Y axis
    const yAxis = d3.axisLeft(this.yScale)
      .ticks(8)
      .tickFormat(d => {
        if (this.displayMode === 'percentage' || this.showNetChange) {
          return `${d}%`;
        } else {
          return formatNumber(d);
        }
      });

    this.yAxisGroup
      .transition()
      .duration(transitionDuration())
      .call(yAxis);

    this.styleAxes();
  }

  drawBars(data) {
    // Bind data
    const bars = this.barsGroup.selectAll('.bar')
      .data(data, d => d.mode);

    // Enter
    const barsEnter = bars.enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => this.xScale(d.mode))
      .attr('width', this.xScale.bandwidth())
      .attr('y', this.yScale(0))
      .attr('height', 0)
      .attr('fill', d => d.color)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.handleMouseOver(event, d))
      .on('mouseout', (event, d) => this.handleMouseOut(event, d));

    barsEnter.transition()
      .duration(transitionDuration())
      .ease(easeFunction())
      .attr('y', d => d.value >= 0 ? this.yScale(d.value) : this.yScale(0))
      .attr('height', d => Math.abs(this.yScale(d.value) - this.yScale(0)));

    // Update
    bars.transition()
      .duration(transitionDuration())
      .ease(easeFunction())
      .attr('x', d => this.xScale(d.mode))
      .attr('width', this.xScale.bandwidth())
      .attr('y', d => d.value >= 0 ? this.yScale(d.value) : this.yScale(0))
      .attr('height', d => Math.abs(this.yScale(d.value) - this.yScale(0)))
      .attr('fill', d => d.color);

    // Exit
    bars.exit()
      .transition()
      .duration(transitionDuration() / 2)
      .attr('y', this.yScale(0))
      .attr('height', 0)
      .style('opacity', 0)
      .remove();
  }

  drawZeroLine() {
    // Remove existing zero line
    this.g.selectAll('.zero-line').remove();

    // Add new zero line
    this.g.append('line')
      .attr('class', 'zero-line')
      .attr('x1', 0)
      .attr('x2', this.innerWidth)
      .attr('y1', this.yScale(0))
      .attr('y2', this.yScale(0))
      .attr('stroke', '#333')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5');
  }

  handleMouseOver(event, d) {
    // Highlight bar
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('opacity', 0.7);

    // Show tooltip
    let html = `<strong>${d.mode}</strong><br/>`;

    if (this.showNetChange) {
      html += `<span style="color: ${d.value >= 0 ? '#43a047' : '#e53935'};">`;
      html += `Net Change: ${d.value >= 0 ? '+' : ''}${formatPercent(d.value)}%</span>`;
    } else if (this.displayMode === 'percentage') {
      html += `<span style="color: #8e24aa;">Percentage: ${formatPercent(d.value)}%</span>`;
    } else {
      html += `<span style="color: #8e24aa;">Workers: ${formatNumber(Math.round(d.value))}</span>`;
    }

    this.tooltip.show(html, event);
  }

  handleMouseOut(event, d) {
    // Restore bar
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('opacity', 1);

    // Hide tooltip
    this.tooltip.hide();
  }

  updateTitle(text) {
    this.titleText.text(text);
  }

  updateYLabel(text) {
    this.yLabel.text(text);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    this.xScale.range([0, this.innerWidth]);
    this.yScale.range([this.innerHeight, 0]);

    this.init();
  }

  destroy() {
    this.tooltip.remove();
    this.container.html('');
  }
}
