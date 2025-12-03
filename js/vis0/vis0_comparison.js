/**
 * Vis0 Comparison Chart - Bidirectional bar chart comparing transit decline vs remote work growth
 * Extracted from 2222.html
 */

(function () {
    'use strict';

    // --- 1. DATA ---
    const originalData = [
        { city: "Toronto", delta_transit: -14.3, delta_wfh: 33.0, pop: 6.7, t16: 24.3, t21: 10.0, w16: 7.0, w21: 40.0 },
        { city: "Ottawa", delta_transit: -12.6, delta_wfh: 36.0, pop: 1.5, t16: 18.0, t21: 5.4, w16: 9.0, w21: 45.0 },
        { city: "Montreal", delta_transit: -10.0, delta_wfh: 29.5, pop: 4.4, t16: 22.0, t21: 12.0, w16: 5.5, w21: 35.0 },
        { city: "Vancouver", delta_transit: -9.0, delta_wfh: 24.0, pop: 2.8, t16: 20.0, t21: 11.0, w16: 8.0, w21: 32.0 },
        { city: "Calgary", delta_transit: -7.0, delta_wfh: 22.0, pop: 1.6, t16: 15.0, t21: 8.0, w16: 6.0, w21: 28.0 },
        { city: "Edmonton", delta_transit: -6.0, delta_wfh: 20.0, pop: 1.5, t16: 12.0, t21: 6.0, w16: 5.0, w21: 25.0 }
    ];

    let currentSortOrder = 'transit'; // 'transit', 'wfh', or 'population'

    // --- 1B. SORT DATA FUNCTION ---
    function getSortedData(sortBy) {
        const dataCopy = [...originalData];
        
        switch(sortBy) {
            case 'wfh':
                return dataCopy.sort((a, b) => b.delta_wfh - a.delta_wfh);
            case 'population':
                return dataCopy.sort((a, b) => b.pop - a.pop);
            case 'transit':
            default:
                return dataCopy.sort((a, b) => a.delta_transit - b.delta_transit);
        }
    }

    // --- 2. RENDER FUNCTION ---
    function renderChart(sortBy = 'transit') {
        console.log('Vis0 Comparison Chart rendering with sort:', sortBy);

        const container = document.getElementById('vis0-comparison-chart');
        if (!container) {
            console.error('Container vis0-comparison-chart not found');
            return;
        }

        // Clear any existing content
        container.innerHTML = '';

        // Get sorted data
        const data = getSortedData(sortBy);

        // Configuration
        const margin = { top: 60, right: 40, bottom: 40, left: 40 };
        const width = 900 - margin.left - margin.right;
        const height = 550 - margin.top - margin.bottom;

        const center = width / 2;
        const centerGap = 160;

        const svg = d3.select("#vis0-comparison-chart")
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // --- 3. SCALES ---
        const yScale = d3.scaleBand()
            .domain(data.map(d => d.city))
            .range([0, height])
            .padding(0.4);

        const xLeft = d3.scaleLinear().domain([0, 45]).range([center - centerGap / 2, 0]);
        const xRight = d3.scaleLinear().domain([0, 45]).range([center + centerGap / 2, width]);

        // --- 4. TOOLTIP LOGIC ---
        const tooltip = d3.select("body").append("div").attr("class", "vis0-comparison-tooltip");

        const showTooltip = (event, d, type) => {
            tooltip.transition().duration(100).style("opacity", 1);
            let content = "";

            // Header with Population Context included
            const header = `
                <span class="tt-header">
                    ${d.city}
                    <span class="tt-pop">Pop: ${d.pop}M</span>
                </span>`;

            if (type === "transit") {
                content = `
                    ${header}
                    <strong>Public Transit Share</strong><br>
                    2016: <span class="tt-val">${d.t16}%</span><br>
                    2021: <span class="tt-val">${d.t21}%</span><br>
                    <hr style="margin:6px 0; border:0; border-top:1px dashed #ccc;">
                    Net Change: <span class="tt-val" style="color:#c0392b">${d.delta_transit}%</span>
                `;
            } else if (type === "wfh") {
                content = `
                    ${header}
                    <strong>Remote Work Share</strong><br>
                    2016: <span class="tt-val">${d.w16}%</span><br>
                    2021: <span class="tt-val">${d.w21}%</span><br>
                    <hr style="margin:6px 0; border:0; border-top:1px dashed #ccc;">
                    Net Change: <span class="tt-val" style="color:#6c3483">+${d.delta_wfh}%</span>
                `;
            }

            tooltip.html(content)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 20) + "px");
        };

        const hideTooltip = () => tooltip.transition().duration(200).style("opacity", 0);

        // --- 5. DRAWING ---

        // Grid Lines
        const ticks = [15, 30, 45];
        svg.selectAll(".grid-l").data(ticks).enter().append("line")
            .attr("class", "vis0-grid-line").attr("y2", height)
            .attr("x1", d => xLeft(d)).attr("x2", d => xLeft(d));
        svg.selectAll(".grid-r").data(ticks).enter().append("line")
            .attr("class", "vis0-grid-line").attr("y2", height)
            .attr("x1", d => xRight(d)).attr("x2", d => xRight(d));

        // Axis Labels
        svg.selectAll(".axis-l").data(ticks).enter().append("text")
            .attr("class", "vis0-axis-text").attr("y", -10).attr("text-anchor", "middle")
            .attr("x", d => xLeft(d)).text(d => "-" + d + "%");
        svg.selectAll(".axis-r").data(ticks).enter().append("text")
            .attr("class", "vis0-axis-text").attr("y", -10).attr("text-anchor", "middle")
            .attr("x", d => xRight(d)).text(d => "+" + d + "%");

        // Headers
        svg.append("text").attr("class", "vis0-header-transit")
            .attr("x", xLeft(22)).attr("y", -35).attr("text-anchor", "middle")
            .text("Transit Decline");
        svg.append("text").attr("class", "vis0-header-wfh")
            .attr("x", xRight(22)).attr("y", -35).attr("text-anchor", "middle")
            .text("Remote Work Growth");

        // --- ROWS ---
        const rows = svg.selectAll(".row")
            .data(data).enter().append("g")
            .attr("class", "vis0-bar-group")
            .attr("transform", d => `translate(0, ${yScale(d.city)})`)
            .style("cursor", "default");

        // Spotlight Effect
        rows.on("mouseenter", function () {
            svg.selectAll(".vis0-bar-group").transition().duration(200).style("opacity", 0.3);
            d3.select(this).transition().duration(200).style("opacity", 1);
        })
            .on("mouseleave", function () {
                svg.selectAll(".vis0-bar-group").transition().duration(200).style("opacity", 1);
            });

        // LEFT BARS (Transit)
        rows.append("rect")
            .attr("class", "vis0-bar-hero-transit") // All dark
            .attr("x", d => xLeft(Math.abs(d.delta_transit)))
            .attr("width", d => (center - centerGap / 2) - xLeft(Math.abs(d.delta_transit)))
            .attr("height", yScale.bandwidth())
            .on("mouseover", (e, d) => showTooltip(e, d, "transit"))
            .on("mouseout", hideTooltip);

        // RIGHT BARS (WFH)
        rows.append("rect")
            .attr("class", "vis0-bar-hero-wfh") // All dark
            .attr("x", center + centerGap / 2)
            .attr("width", d => xRight(d.delta_wfh) - (center + centerGap / 2))
            .attr("height", yScale.bandwidth())
            .on("mouseover", (e, d) => showTooltip(e, d, "wfh"))
            .on("mouseout", hideTooltip);

        // CITY LABELS
        rows.append("text")
            .attr("class", "vis0-city-label is-hero") // All bold/dark
            .attr("x", center)
            .attr("y", yScale.bandwidth() / 2)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(d => d.city);

        // VALUE LABELS - Left
        rows.append("text")
            .attr("class", "vis0-val-label is-hero") // All visible
            .attr("x", d => xLeft(Math.abs(d.delta_transit)) - 6)
            .attr("y", yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "end")
            .text(d => d.delta_transit + "%");

        // VALUE LABELS - Right
        rows.append("text")
            .attr("class", "vis0-val-label is-hero") // All visible
            .attr("x", d => xRight(d.delta_wfh) + 6)
            .attr("y", yScale.bandwidth() / 2)
            .attr("dy", "0.35em")
            .attr("text-anchor", "start")
            .text(d => "+" + d.delta_wfh + "%");

        console.log('Vis0 Comparison Chart rendered successfully');
    }

    // --- 3. INITIALIZATION ---
    function init() {
        console.log('Vis0 Comparison Chart initializing...');

        // Initial render
        renderChart(currentSortOrder);

        // Bind sort selector
        const sortSelector = document.getElementById('vis0-sort-selector');
        if (sortSelector) {
            sortSelector.addEventListener('change', (e) => {
                currentSortOrder = e.target.value;
                renderChart(currentSortOrder);
            });
        }

        console.log('Vis0 Comparison Chart initialized successfully');
    }

    // Wait for DOM and D3 to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Also check if D3 is loaded
        if (typeof d3 !== 'undefined') {
            init();
        } else {
            console.error('D3.js is not loaded');
        }
    }

})();
