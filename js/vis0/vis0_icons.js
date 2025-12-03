/**
 * Vis0 Icons Chart - Icon-based visualization showing commuter mode distribution
 * Extracted from 111.html
 */
(function () {
    'use strict';

    // --- 1. DATASET ---
    // Total workforce numbers and distribution by commute mode
    const dataset = {
        "All": {
            2016: { total: 7200000, distribution: [{ t: "Car", c: 10 }, { t: "Transit", c: 4 }, { t: "Active", c: 1 }, { t: "WFH", c: 1 }] },
            2021: { total: 7600000, distribution: [{ t: "Car", c: 8 }, { t: "Transit", c: 2 }, { t: "Active", c: 1 }, { t: "WFH", c: 5 }] }
        },
        "Toronto": {
            2016: { total: 3200000, distribution: [{ t: "Car", c: 10 }, { t: "Transit", c: 4 }, { t: "Active", c: 1 }, { t: "WFH", c: 1 }] },
            2021: { total: 3400000, distribution: [{ t: "Car", c: 8 }, { t: "Transit", c: 2 }, { t: "Active", c: 1 }, { t: "WFH", c: 5 }] }
        },
        "Montreal": {
            2016: { total: 2100000, distribution: [{ t: "Car", c: 10 }, { t: "Transit", c: 4 }, { t: "Active", c: 1 }, { t: "WFH", c: 1 }] },
            2021: { total: 2200000, distribution: [{ t: "Car", c: 8 }, { t: "Transit", c: 2 }, { t: "Active", c: 2 }, { t: "WFH", c: 4 }] }
        },
        "Ottawa": {
            2016: { total: 750000, distribution: [{ t: "Car", c: 10 }, { t: "Transit", c: 3 }, { t: "Active", c: 2 }, { t: "WFH", c: 1 }] },
            2021: { total: 800000, distribution: [{ t: "Car", c: 7 }, { t: "Transit", c: 1 }, { t: "Active", c: 1 }, { t: "WFH", c: 7 }] }
        },
        "Vancouver": {
            2016: { total: 1300000, distribution: [{ t: "Car", c: 9 }, { t: "Transit", c: 3 }, { t: "Active", c: 3 }, { t: "WFH", c: 1 }] },
            2021: { total: 1400000, distribution: [{ t: "Car", c: 8 }, { t: "Transit", c: 2 }, { t: "Active", c: 2 }, { t: "WFH", c: 4 }] }
        },
        "Calgary": {
            2016: { total: 800000, distribution: [{ t: "Car", c: 12 }, { t: "Transit", c: 2 }, { t: "Active", c: 1 }, { t: "WFH", c: 1 }] },
            2021: { total: 820000, distribution: [{ t: "Car", c: 10 }, { t: "Transit", c: 1 }, { t: "Active", c: 1 }, { t: "WFH", c: 4 }] }
        },
        "Edmonton": {
            2016: { total: 700000, distribution: [{ t: "Car", c: 13 }, { t: "Transit", c: 2 }, { t: "Active", c: 0 }, { t: "WFH", c: 1 }] },
            2021: { total: 720000, distribution: [{ t: "Car", c: 11 }, { t: "Transit", c: 1 }, { t: "Active", c: 1 }, { t: "WFH", c: 3 }] }
        }
    };

    // Icon and color configuration
    const config = {
        "Car": { icon: "fa-car", label: "Private Vehicle", class: "bg-car" },
        "Transit": { icon: "fa-bus", label: "Public Transit", class: "bg-transit" },
        "Active": { icon: "fa-person-walking", label: "Active / Other", class: "bg-active" },
        "WFH": { icon: "fa-house-laptop", label: "Work From Home", class: "bg-wfh" }
    };

    // --- 2. RENDER FUNCTION ---
    function renderRow(year, cityData) {
        const container = document.getElementById(`vis0-icon-row-${year}`);
        if (!container) {
            console.error(`Container vis0-icon-row-${year} not found`);
            return;
        }

        container.innerHTML = '';

        // Calculate "People per Icon" for this year/city
        // 16 icons total. Value per icon = Total / 16
        const peoplePerIcon = cityData.total / 16;

        cityData.distribution.forEach(item => {
            const props = config[item.t];

            for (let i = 0; i < item.c; i++) {
                const box = document.createElement('div');
                box.className = `vis0-icon-box ${props.class} enter`;
                box.style.animationDelay = `${Math.random() * 0.2}s`;
                box.setAttribute('data-mode', item.t);

                const icon = document.createElement('i');
                icon.className = `fa-solid ${props.icon}`;

                // TOOLTIP LOGIC - Show both percentage and count
                box.onmouseenter = (e) => {
                    const tooltip = document.getElementById('vis0-icon-tooltip');
                    if (!tooltip) return;

                    tooltip.style.opacity = 1;

                    // Calculate both percentage and people count
                    const pct = (item.c * 6.25).toFixed(1);
                    const num = (item.c * peoplePerIcon).toLocaleString();

                    tooltip.innerHTML = `
                        <div class="tooltip-header">${props.label}</div>
                        <div style="margin-top: 4px;">
                            <strong>${pct}%</strong> of workforce<br>
                            <strong>${num}</strong> people
                        </div>
                    `;
                    tooltip.style.left = (e.pageX + 15) + 'px';
                    tooltip.style.top = (e.pageY - 40) + 'px';
                };
                box.onmouseleave = () => {
                    const tooltip = document.getElementById('vis0-icon-tooltip');
                    if (tooltip) tooltip.style.opacity = 0;
                };

                box.appendChild(icon);
                container.appendChild(box);
            }
        });
    }

    // --- 3. SUBTITLE UPDATER ---
    function updateSubtitle(cityName) {
        const subtitle = document.getElementById('vis0-icon-subtitle');
        if (!subtitle) return;

        subtitle.innerHTML = `Each icon represents approximately <span class="highlight-unit">6.25%</span> of the workforce. Hover over icons for detailed statistics.`;
    }

    // --- 3B. STATISTICS PANEL UPDATER ---
    function updateStatistics(cityName) {
        const statsContent = document.getElementById('vis0-stats-content');
        if (!statsContent) return;

        const cityData = dataset[cityName];
        if (!cityData) return;

        const data2016 = cityData[2016];
        const data2021 = cityData[2021];

        // Calculate changes
        const totalChange = data2021.total - data2016.total;
        const totalChangePercent = ((totalChange / data2016.total) * 100).toFixed(1);

        // Find WFH growth
        const wfh2016 = data2016.distribution.find(d => d.t === 'WFH')?.c || 0;
        const wfh2021 = data2021.distribution.find(d => d.t === 'WFH')?.c || 0;
        const wfhChange = ((wfh2021 - wfh2016) * 6.25).toFixed(1);

        // Find Transit change
        const transit2016 = data2016.distribution.find(d => d.t === 'Transit')?.c || 0;
        const transit2021 = data2021.distribution.find(d => d.t === 'Transit')?.c || 0;
        const transitChange = ((transit2021 - transit2016) * 6.25).toFixed(1);

        statsContent.innerHTML = `
            <p style="margin: 5px 0;"><strong>Total Workforce:</strong></p>
            <p style="margin: 5px 0 10px 10px; font-size: 0.9em;">
                2016: ${data2016.total.toLocaleString()}<br>
                2021: ${data2021.total.toLocaleString()} 
                <span style="color: ${totalChange > 0 ? 'green' : 'red'};">
                    (${totalChange > 0 ? '+' : ''}${totalChangePercent}%)
                </span>
            </p>
            <p style="margin: 5px 0;"><strong>Key Changes:</strong></p>
            <p style="margin: 5px 0 5px 10px; font-size: 0.9em;">
                WFH: <span style="color: ${wfhChange > 0 ? 'green' : 'inherit'}; font-weight: bold;">
                    ${wfhChange > 0 ? '+' : ''}${wfhChange}%
                </span>
            </p>
            <p style="margin: 5px 0 5px 10px; font-size: 0.9em;">
                Transit: <span style="color: ${transitChange < 0 ? 'red' : 'inherit'}; font-weight: bold;">
                    ${transitChange}%
                </span>
            </p>
        `;
    }

    // --- 4. CONTROLLER ---
    function updateChart() {
        const selector = document.getElementById('vis0-icon-city-selector');
        if (!selector) {
            console.error('Icon city selector not found');
            return;
        }

        const selectedCity = selector.value;
        const cityData = dataset[selectedCity];

        if (!cityData) {
            console.error(`No data for city: ${selectedCity}`);
            return;
        }

        // Update Subtitle logic
        updateSubtitle(selectedCity);

        // Update Statistics Panel
        updateStatistics(selectedCity);

        // Render Rows
        renderRow(2016, cityData[2016]);
        renderRow(2021, cityData[2021]);
    }

    // --- 5. CITY NAME MAPPING ---
    // Map vis0 city names to CMA codes for global state sync
    const cityNameToCmaCode = {
        'All': 'overview',
        'Toronto': '535',
        'Montreal': '462',
        'Montréal': '462',  // Support both spellings
        'Ottawa': '505',
        'Ottawa-Gatineau': '505',
        'Ottawa–Gatineau': '505',  // Support both dash types
        'Vancouver': '933',
        'Calgary': '825',
        'Edmonton': '835'
    };

    const cmaCodeToCityName = {
        'overview': 'All',
        '535': 'Toronto',
        '462': 'Montreal',
        '505': 'Ottawa',
        '933': 'Vancouver',
        '825': 'Calgary',
        '835': 'Edmonton'
    };

    // Also support incoming city names from other visualizations
    const normalizeCityName = (name) => {
        const normalized = {
            'all': 'All',
            'Montréal': 'Montreal',
            'Ottawa–Gatineau': 'Ottawa',
            'Ottawa-Gatineau': 'Ottawa'
        };
        return normalized[name] || name;
    };

    // --- 6. INITIALIZATION ---
    function init() {
        console.log('Vis0 Icons Chart initializing...');

        // Bind event listeners
        const selector = document.getElementById('vis0-icon-city-selector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                updateChart();
                
                // Notify global state manager
                const selectedCity = e.target.value;
                const cmaCode = cityNameToCmaCode[selectedCity];
                if (cmaCode && typeof globalStateManager !== 'undefined') {
                    globalStateManager.notifyCityChanged('vis0', cmaCode);
                }
            });
        }

        // Subscribe to global city changes
        if (typeof globalStateManager !== 'undefined') {
            globalStateManager.subscribe((detail) => {
                // Don't react to our own changes
                if (detail.source === 'vis0') return;

                let cityName;
                
                // Check if detail.value is a CMA code or a city name
                if (cmaCodeToCityName[detail.value]) {
                    // It's a CMA code (from vis1)
                    cityName = cmaCodeToCityName[detail.value];
                } else {
                    // It's a city name (from vis2), normalize it
                    cityName = normalizeCityName(detail.value);
                }
                
                if (cityName && selector) {
                    // Update selector without triggering change event
                    selector.value = cityName;
                    updateChart();
                }
            });
        }

        // Initial Load
        updateChart();
        
        console.log('Vis0 Icons Chart initialized successfully');
    }    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
