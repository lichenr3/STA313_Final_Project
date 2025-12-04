// barChart.js - Bar chart component for commute mode distribution

class BarChart {
  constructor(containerId, options = {}) {
    this.container = d3.select(containerId);
    this.containerId = containerId;
    this.data = [];
    this.displayMode = 'percentage'; // 'percentage' or 'actual'
    this.showNetChange = false;

    // Chart dimensions - will be calculated based on container
    this.margin = options.margin || { top: 60, right: 100, bottom: 140, left: 80 };

    this.tooltip = new Tooltip();

    this.calculateDimensions();
    this.init();
    
    // Add resize listener
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }
  
  calculateDimensions() {
    // Get container dimensions
    const containerNode = this.container.node();
    let containerWidth = containerNode ? containerNode.getBoundingClientRect().width : 900;
    let containerHeight = containerNode ? containerNode.getBoundingClientRect().height : 500;
    
    // If container is hidden or has 0 width, use default values
    if (containerWidth < 100) containerWidth = 900;
    if (containerHeight < 100) containerHeight = 500;
    
    // Set dimensions based on container, with reasonable limits
    this.width = Math.min(Math.max(containerWidth - 40, 600), 1200);
    this.height = Math.min(Math.max(containerHeight - 40, 400), 600);
    
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;
  }
  
  handleResize() {
    // Debounce resize
    clearTimeout(this.resizeTimer);
    this.resizeTimer = setTimeout(() => {
      const oldWidth = this.width;
      const oldHeight = this.height;
      
      this.calculateDimensions();
      
      // Only re-render if dimensions changed significantly
      if (Math.abs(this.width - oldWidth) > 50 || Math.abs(this.height - oldHeight) > 50) {
        // Check if we have saved data before reinitializing
        if (this.currentAggregatedData && this.currentOptions) {
          this.init();
          this.redraw();
        }
      }
    }, 250);
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

    // Create legend group
    this.legendGroup = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.width - this.margin.right + 10}, ${this.margin.top})`);

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
    
    // Save current state for redraw
    this.currentAggregatedData = aggregatedData;
    this.currentOptions = options;

    // Prepare data based on options
    let chartData;

    if (showNetChange) {
      // Show net change
      chartData = this.prepareNetChangeData(aggregatedData, showPublic, showPrivate, showOther);
      this.updateTitle('Net Change in Commute Mode (2021 - 2016)');
      
      // 根据displayMode设置y轴标签
      if (displayMode === 'percentage') {
        this.updateYLabel('Percentage Point Change (%)');
      } else {
        this.updateYLabel('Change in Number of Workers');
      }
      
      // Update scales for single bars
      this.xScale.domain(chartData.map(d => d.mode));
      const yExtent = d3.extent(chartData, d => d.value);
      const yMax = Math.max(Math.abs(yExtent[0]), Math.abs(yExtent[1])) * 1.1;
      this.yScale.domain([-yMax, yMax]);
      
      // Update axes and draw
      this.updateAxes();
      this.drawBars(chartData);
      this.drawZeroLine();
      this.hideLegend();
    } else {
      // Show grouped bars (2016 vs 2021)
      chartData = this.prepareGroupedData(aggregatedData, displayMode, showPublic, showPrivate, showOther);
      this.updateTitle('Commute Mode Distribution (2016 vs 2021)');
      this.updateYLabel(displayMode === 'percentage' ? 'Percentage (%)' : 'Number of Workers');
      
      // Update scales for grouped bars
      this.xScale.domain(chartData.map(d => d.mode));
      
      // Create sub-scale for years within each mode
      this.xSubScale = d3.scaleBand()
        .domain(['2016', '2021'])
        .range([0, this.xScale.bandwidth()])
        .padding(0.05);
      
      const allValues = chartData.flatMap(d => [d.value2016, d.value2021]);
      const yMax = d3.max(allValues) * 1.1;
      this.yScale.domain([0, yMax]);
      
      // Update axes and draw
      this.updateAxes();
      this.drawGroupedBars(chartData);
      this.g.selectAll('.zero-line').remove();
      this.showLegend();
    }
  }

  showLegend() {
    // Clear existing legend
    this.legendGroup.selectAll('*').remove();

    // Add title for legend
    this.legendGroup.append('text')
      .attr('x', 0)
      .attr('y', -5)
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .style('fill', '#666')
      .text('Year:');

    // Add 2016 legend item with pattern showing lighter shade
    const legend2016 = this.legendGroup.append('g')
      .attr('transform', 'translate(0, 10)');
    
    // Create a small gradient bar showing lighter color
    legend2016.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#999')  // Generic gray to represent "lighter"
      .attr('opacity', 0.7)
      .attr('rx', 2);
    
    legend2016.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', '#333')
      .text('2016 (lighter)');

    // Add 2021 legend item with pattern showing darker shade
    const legend2021 = this.legendGroup.append('g')
      .attr('transform', 'translate(0, 32)');
    
    legend2021.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', '#666')  // Darker gray to represent "darker"
      .attr('opacity', 1)
      .attr('rx', 2);
    
    legend2021.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '11px')
      .style('fill', '#333')
      .text('2021 (darker)');
    
    // Add note about colors
    this.legendGroup.append('text')
      .attr('x', 0)
      .attr('y', 60)
      .style('font-size', '9px')
      .style('fill', '#888')
      .style('font-style', 'italic')
      .text('Each mode has')
      .append('tspan')
      .attr('x', 0)
      .attr('dy', 11)
      .text('its own color');
  }

  hideLegend() {
    this.legendGroup.selectAll('*').remove();
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

  prepareGroupedData(aggregatedData, displayMode, showPublic, showPrivate, showOther) {
    const data2016 = displayMode === 'percentage' ? aggregatedData.percentages2016 : aggregatedData.counts2016;
    const data2021 = displayMode === 'percentage' ? aggregatedData.percentages2021 : aggregatedData.counts2021;
    
    // 使用固定顺序
    const orderedModes = typeof MODE_ORDER !== 'undefined' ? MODE_ORDER : Object.keys(data2016);
    
    let chartData = orderedModes
      .filter(mode => mode in data2016 && mode in data2021)
      .map(mode => ({
        mode,
        value2016: data2016[mode] || 0,
        value2021: data2021[mode] || 0,
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

    // Sort by 2021 value descending (most recent data)
    chartData.sort((a, b) => b.value2021 - a.value2021);

    return chartData;
  }

  prepareNetChangeData(aggregatedData, showPublic, showPrivate, showOther) {
    // 使用固定顺序
    const orderedModes = typeof MODE_ORDER !== 'undefined' ? MODE_ORDER : Object.keys(aggregatedData.netChange);

    // 根据displayMode选择使用百分比变化或绝对数量变化
    const changeData = this.displayMode === 'percentage' 
      ? aggregatedData.netChange 
      : aggregatedData.netChangeAbsolute;

    const chartData = orderedModes
      .filter(mode => mode in changeData)
      .map(mode => ({
        mode,
        value: changeData[mode],
        category: getModeCategory(mode),
        color: changeData[mode] >= 0 ? '#43a047' : '#e53935'
      }))
      .filter(d => {
        if (d.category === 'sustainable' && !showPublic) return false;
        if (d.category === 'car' && !showPrivate) return false;
        if (d.category === 'other' && !showOther) return false;
        return true;
      });
    
    // Sort by absolute value descending (biggest changes first)
    chartData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    
    return chartData;
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
        if (this.displayMode === 'percentage') {
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
    // Clear grouped bars if they exist
    this.barsGroup.selectAll('.bar-group').remove();
    
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

  drawGroupedBars(data) {
    // Clear existing bars
    this.barsGroup.selectAll('.bar').remove();
    this.barsGroup.selectAll('.bar-group').remove();

    // Create groups for each mode
    const barGroups = this.barsGroup.selectAll('.bar-group')
      .data(data, d => d.mode)
      .join('g')
      .attr('class', 'bar-group')
      .attr('transform', d => `translate(${this.xScale(d.mode)}, 0)`);

    // Draw 2016 bars
    barGroups.append('rect')
      .attr('class', 'bar bar-2016')
      .attr('x', this.xSubScale('2016'))
      .attr('width', this.xSubScale.bandwidth())
      .attr('y', this.yScale(0))
      .attr('height', 0)
      .attr('fill', d => d.color)
      .attr('opacity', 0.7)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.handleGroupedMouseOver(event, d, '2016'))
      .on('mouseout', (event, d) => this.handleMouseOut(event, d))
      .transition()
      .duration(transitionDuration())
      .ease(easeFunction())
      .attr('y', d => this.yScale(d.value2016))
      .attr('height', d => this.yScale(0) - this.yScale(d.value2016));

    // Draw 2021 bars
    barGroups.append('rect')
      .attr('class', 'bar bar-2021')
      .attr('x', this.xSubScale('2021'))
      .attr('width', this.xSubScale.bandwidth())
      .attr('y', this.yScale(0))
      .attr('height', 0)
      .attr('fill', d => d.color)
      .attr('opacity', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.handleGroupedMouseOver(event, d, '2021'))
      .on('mouseout', (event, d) => this.handleMouseOut(event, d))
      .transition()
      .duration(transitionDuration())
      .ease(easeFunction())
      .attr('y', d => this.yScale(d.value2021))
      .attr('height', d => this.yScale(0) - this.yScale(d.value2021));
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
      if (this.displayMode === 'percentage') {
        html += `Net Change: ${d.value >= 0 ? '+' : ''}${formatPercent(d.value)}%</span>`;
      } else {
        html += `Net Change: ${d.value >= 0 ? '+' : ''}${formatNumber(Math.round(d.value))} workers</span>`;
      }
    } else if (this.displayMode === 'percentage') {
      html += `<span style="color: #8e24aa;">Percentage: ${formatPercent(d.value)}%</span>`;
    } else {
      html += `<span style="color: #8e24aa;">Workers: ${formatNumber(Math.round(d.value))}</span>`;
    }

    this.tooltip.show(html, event);
  }

  handleGroupedMouseOver(event, d, year) {
    // Highlight bar
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .style('stroke', '#333')
      .style('stroke-width', '2px');

    // Show tooltip
    const value = year === '2016' ? d.value2016 : d.value2021;
    const otherValue = year === '2016' ? d.value2021 : d.value2016;
    const change = value - otherValue;
    const changePercent = otherValue !== 0 ? (change / otherValue) * 100 : 0;
    
    let html = `<strong>${d.mode}</strong><br/>`;
    html += `<span style="color: #666;">Year: ${year}</span><br/>`;
    
    if (this.displayMode === 'percentage') {
      html += `<span style="color: ${d.color};">Percentage: ${formatPercent(value)}%</span><br/>`;
      html += `<span style="color: ${change >= 0 ? '#43a047' : '#e53935'}; font-size: 0.9em;">`;
      html += `Change: ${change >= 0 ? '+' : ''}${formatPercent(change)}pp</span>`;
    } else {
      html += `<span style="color: ${d.color};">Workers: ${formatNumber(Math.round(value))}</span><br/>`;
      html += `<span style="color: ${change >= 0 ? '#43a047' : '#e53935'}; font-size: 0.9em;">`;
      html += `Change: ${change >= 0 ? '+' : ''}${formatNumber(Math.round(change))} (${changePercent >= 0 ? '+' : ''}${formatPercent(changePercent)}%)</span>`;
    }

    this.tooltip.show(html, event);
  }

  handleMouseOut(event, d) {
    // Restore bar
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('opacity', function() {
        return d3.select(this).classed('bar-2016') ? 0.7 : 1;
      })
      .style('stroke', 'none');

    // Hide tooltip
    this.tooltip.hide();
  }

  updateTitle(text) {
    this.titleText.text(text);
  }

  updateYLabel(text) {
    this.yLabel.text(text);
  }

  redraw() {
    // Re-render with saved state
    if (this.currentAggregatedData && this.currentOptions) {
      this.update(this.currentAggregatedData, this.currentOptions);
    }
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
    window.removeEventListener('resize', this.handleResize);
  }
}
