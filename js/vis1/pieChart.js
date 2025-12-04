// pieChart.js - Concentric Donut chart component for CMA distribution

class PieChart {
  constructor(containerId, options = {}) {
    this.container = d3.select(containerId);
    this.data = { data2016: [], data2021: [] };

    // Chart dimensions
    this.width = options.width || 600;
    this.height = options.height || 500;
    this.margin = options.margin || { top: 40, right: 20, bottom: 60, left: 20 };

    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;

    // Donut dimensions
    this.radius = Math.min(this.innerWidth, this.innerHeight) / 2;

    // Concentric rings
    // Inner ring (2016): 40% to 65% radius
    // Outer ring (2021): 70% to 95% radius
    this.innerRadius2016 = this.radius * 0.40;
    this.outerRadius2016 = this.radius * 0.65;

    this.innerRadius2021 = this.radius * 0.70;
    this.outerRadius2021 = this.radius * 0.95;

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
      .attr('class', 'pie-chart');

    // Create main group
    this.g = this.svg.append('g')
      .attr('transform', `translate(${this.margin.left + this.innerWidth / 2}, ${this.margin.top + this.innerHeight / 2})`);

    // Create pie layout
    this.pie = d3.pie()
      .value(d => d.percentage)
      .sort(null); // Keep order consistent with data array

    // Create arc generators
    this.arc2016 = d3.arc()
      .innerRadius(this.innerRadius2016)
      .outerRadius(this.outerRadius2016);

    this.arc2021 = d3.arc()
      .innerRadius(this.innerRadius2021)
      .outerRadius(this.outerRadius2021);

    this.arcHover2016 = d3.arc()
      .innerRadius(this.innerRadius2016)
      .outerRadius(this.outerRadius2016 + 5);

    this.arcHover2021 = d3.arc()
      .innerRadius(this.innerRadius2021)
      .outerRadius(this.outerRadius2021 + 5);

    // Create groups
    this.arcs2016Group = this.g.append('g').attr('class', 'arcs-2016');
    this.arcs2021Group = this.g.append('g').attr('class', 'arcs-2021');
    this.centerGroup = this.g.append('g').attr('class', 'center-text');

    // Add title
    this.titleText = this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.margin.top - 15)
      .attr('text-anchor', 'middle')
      .attr('class', 'chart-title')
      .style('font-size', '18px')
      .style('font-weight', 'bold')
      .style('fill', '#702040') // Updated to match theme
      .text('Low-Income Essential Workers Distribution (2016 vs 2021)');

    // Add legend
    this.createLegend();
  }

  createLegend() {
    // Use CMA_METADATA from utils.js if available, otherwise hardcode
    const cmaCodes = ['535', '462', '505', '933', '825', '835'];
    const legendData = cmaCodes.map(code => ({
      name: getCMAName(code),
      color: getCMAColor(code)
    }));

    const legendY = this.height - this.margin.bottom + 10;
    const legend = this.svg.append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${this.margin.left}, ${legendY})`);

    // Calculate layout
    const itemsPerRow = 3; // Reduced to 3 to fit better
    const itemWidth = 140;
    const rowHeight = 25;

    const legendItems = legend.selectAll('.legend-item')
      .data(legendData)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;
        // Center the legend block
        const xOffset = (this.width - (itemsPerRow * itemWidth)) / 2;
        return `translate(${xOffset + col * itemWidth}, ${row * rowHeight})`;
      });

    legendItems.append('rect')
      .attr('width', 15)
      .attr('height', 15)
      .attr('fill', d => d.color)
      .attr('rx', 3); // Rounded corners

    legendItems.append('text')
      .attr('x', 20)
      .attr('y', 12)
      .style('font-size', '12px')
      .style('fill', '#333')
      .text(d => d.name);

    // Add Inner/Outer layer labels below legend
    const guideY = (Math.ceil(legendData.length / itemsPerRow) * rowHeight) + 15;
    const guideGroup = legend.append('g')
      .attr('transform', `translate(${this.width / 2}, ${guideY})`);

    guideGroup.append('text')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#666')
      .style('font-style', 'italic')
      .text('Inner Ring: 2016  |  Outer Ring: 2021');
  }

  update(data) {
    // data structure: { data2016: [], data2021: [], workerChangePercent: number }
    this.data = data;

    // Update center text with growth rate
    this.updateCenterText(data.workerChangePercent);

    // Render 2016 Ring (Inner)
    this.renderRing(
      this.arcs2016Group,
      data.data2016,
      this.arc2016,
      this.arcHover2016,
      '2016'
    );

    // Render 2021 Ring (Outer)
    this.renderRing(
      this.arcs2021Group,
      data.data2021,
      this.arc2021,
      this.arcHover2021,
      '2021'
    );
  }

  renderRing(group, data, arcGenerator, arcHoverGenerator, year) {
    // Bind data
    const arcs = group.selectAll('.arc')
      .data(this.pie(data), d => d.data.cma);

    // Enter
    const arcsEnter = arcs.enter()
      .append('g')
      .attr('class', 'arc');

    arcsEnter.append('path')
      .attr('fill', d => d.data.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', (event, d) => this.handleMouseOver(event, d, year, arcHoverGenerator))
      .on('mouseout', (event, d) => this.handleMouseOut(event, d, arcGenerator))
      .on('click', (event, d) => this.handleClick(event, d))
      .each(function(d) { this._current = { startAngle: 0, endAngle: 0 }; });

    // Merge enter + update
    arcs.merge(arcsEnter).select('path')
      .transition()
      .duration(transitionDuration())
      .ease(easeFunction())
      .attrTween('d', function (d) {
        const interpolate = d3.interpolate(this._current || { startAngle: 0, endAngle: 0 }, d);
        this._current = interpolate(1); // Store current state
        return function (t) {
          return arcGenerator(interpolate(t));
        };
      });

    // Exit
    arcs.exit()
      .transition()
      .duration(transitionDuration() / 2)
      .style('opacity', 0)
      .remove();
  }

  updateCenterText(changePercent) {
    this.centerGroup.selectAll('*').remove();

    const isPositive = changePercent >= 0;
    const color = isPositive ? '#43a047' : '#e53935';
    const arrow = isPositive ? '↑' : '↓';

    this.centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .style('font-size', '36px')
      .style('font-weight', 'bold')
      .style('fill', color)
      .text(`${arrow} ${Math.abs(Math.round(changePercent))}%`);

    this.centerGroup.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.2em')
      .style('font-size', '14px')
      .style('fill', '#666')
      .text('Growth (2016-2021)');
  }

  handleMouseOver(event, d, year, arcHoverGenerator) {
    // Enlarge arc
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('d', arcHoverGenerator);

    // Show tooltip
    const html = `
      <strong>${d.data.name} (${year})</strong><br/>
      <span style="color: ${d.data.color};">Percentage:</span> ${formatPercent(d.data.percentage)}%<br/>
      <span style="color: ${d.data.color};">Count:</span> ${formatNumber(Math.round(d.data.count))} workers
    `;
    this.tooltip.show(html, event);
  }

  handleMouseOut(event, d, arcGenerator) {
    // Restore arc
    d3.select(event.currentTarget)
      .transition()
      .duration(200)
      .attr('d', arcGenerator);

    // Hide tooltip
    this.tooltip.hide();
  }

  handleClick(event, d) {
    console.log('Clicked CMA:', d.data.cma);
    // Emit custom event for the main controller
    const customEvent = new CustomEvent('cmaSelected', {
      detail: { cma: d.data.cma, name: d.data.name }
    });
    document.dispatchEvent(customEvent);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    this.innerWidth = this.width - this.margin.left - this.margin.right;
    this.innerHeight = this.height - this.margin.top - this.margin.bottom;
    this.radius = Math.min(this.innerWidth, this.innerHeight) / 2;

    // Recalculate radii
    this.innerRadius2016 = this.radius * 0.40;
    this.outerRadius2016 = this.radius * 0.65;
    this.innerRadius2021 = this.radius * 0.70;
    this.outerRadius2021 = this.radius * 0.95;

    this.init();
    if (this.data.data2016 && this.data.data2016.length > 0) {
      this.update(this.data);
    }
  }

  destroy() {
    this.tooltip.remove();
    this.container.html('');
  }
}
