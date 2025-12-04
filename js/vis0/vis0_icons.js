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

        // 获取当前选中的城市信息
        const checkboxGroup = document.getElementById('vis0-icon-city-selector');
        if (!checkboxGroup) return;
        
        const allCheckboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');
        const checkedCheckboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]:checked');
        const allCheckbox = Array.from(allCheckboxes).find(cb => cb.value === 'All');
        const isAllChecked = allCheckbox && allCheckbox.checked;
        
        // 获取选中的城市（不包括All）
        const selectedCities = Array.from(checkedCheckboxes)
            .map(cb => cb.value)
            .filter(v => v !== 'All');
        
        let regionText = '';
        
        if (isAllChecked && selectedCities.length === 6) {
            // All被选中且所有6个城市都被选中
            regionText = 'Showing data for <strong>all 6 CMAs</strong>. ';
        } else if (isAllChecked) {
            // 只有All被选中（其他城市未全部选中）
            regionText = 'Showing <strong>aggregated data for all CMAs</strong>. ';
        } else if (selectedCities.length === 0) {
            // 没有任何选择（理论上不应该发生）
            regionText = 'No regions selected. ';
        } else if (selectedCities.length === 1) {
            // 只选中了一个城市
            regionText = `Showing data for <strong>${selectedCities[0]}</strong>. `;
        } else {
            // 选中了多个城市（但不包括All）
            const cityList = selectedCities.slice(0, -1).join(', ') + ' and ' + selectedCities[selectedCities.length - 1];
            regionText = `Showing data for <strong>${cityList}</strong>. `;
        }

        subtitle.innerHTML = `${regionText}Each icon represents approximately <span class="highlight-unit">6.25%</span> of the workforce. Hover over icons for detailed statistics.`;
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
        const checkboxGroup = document.getElementById('vis0-icon-city-selector');
        if (!checkboxGroup) {
            console.error('Icon city selector not found');
            return;
        }

        // 获取所有选中的城市
        const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]:checked');
        const selectedCities = Array.from(checkboxes).map(cb => cb.value);

        if (selectedCities.length === 0) {
            console.error('No cities selected');
            return;
        }

        // 如果选中了"All"或多个城市，使用"All"的数据
        let cityData;
        let displayName;

        if (selectedCities.includes('All') || selectedCities.length > 1) {
            cityData = dataset['All'];
            displayName = selectedCities.length > 1 
                ? selectedCities.join(' + ')
                : 'All';
        } else {
            // 单选情况
            const selectedCity = selectedCities[0];
            cityData = dataset[selectedCity];
            displayName = selectedCity;
        }

        if (!cityData) {
            console.error(`No data for cities: ${selectedCities.join(', ')}`);
            return;
        }

        // Update Subtitle logic
        updateSubtitle(displayName);

        // Update Statistics Panel
        updateStatistics(displayName);

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

    // --- 5B. OVERVIEW AS SELECT ALL LOGIC ---
    function handleOverviewExclusive(clickedCheckbox) {
        const checkboxGroup = document.getElementById('vis0-icon-city-selector');
        if (!checkboxGroup) return;

        const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');
        const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'All');
        const cityCheckboxes = Array.from(checkboxes).filter(cb => cb.value !== 'All');
        
        const checkedCities = cityCheckboxes.filter(cb => cb.checked);
        const allCitiesChecked = cityCheckboxes.length > 0 && checkedCities.length === cityCheckboxes.length;

        if (!allCheckbox) return;

        // 如果点击的是All checkbox
        if (clickedCheckbox && clickedCheckbox.value === 'All') {
            if (allCheckbox.checked) {
                // All被选中，选中所有城市
                cityCheckboxes.forEach(cb => cb.checked = true);
            } else {
                // All被取消，取消所有城市（但会被防止取消最后一个的逻辑拦截）
                cityCheckboxes.forEach(cb => cb.checked = false);
            }
        }
        // 如果点击的是城市checkbox
        else {
            // 如果所有城市都被选中，自动勾选All
            if (allCitiesChecked) {
                allCheckbox.checked = true;
            }
            // 如果不是所有城市都被选中，自动取消All
            else {
                allCheckbox.checked = false;
            }
        }
    }

    // --- 5C. DROPDOWN FUNCTIONALITY ---
    function initializeDropdown(container) {
        const toggle = container.querySelector('.checkbox-dropdown-toggle');
        const content = container.querySelector('.checkbox-dropdown-content');
        const arrow = container.querySelector('.checkbox-dropdown-arrow');

        if (!toggle || !content) return;

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            
            document.querySelectorAll('.checkbox-dropdown-content.open').forEach(el => {
                if (el !== content) {
                    el.classList.remove('open');
                    el.previousElementSibling?.classList.remove('open');
                    el.previousElementSibling?.querySelector('.checkbox-dropdown-arrow')?.classList.remove('open');
                }
            });

            const isCurrentlyOpen = content.classList.contains('open');
            if (isCurrentlyOpen) {
                content.classList.remove('open');
                toggle.classList.remove('open');
                arrow?.classList.remove('open');
            } else {
                content.classList.add('open');
                toggle.classList.add('open');
                arrow?.classList.add('open');
            }
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                content.classList.remove('open');
                toggle.classList.remove('open');
                arrow?.classList.remove('open');
            }
        });

        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    function updateDropdownText(container, checkboxes) {
        const selectedText = container.querySelector('.selected-text');
        if (!selectedText) return;

        const checked = Array.from(checkboxes).filter(cb => cb.checked);
        const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'All');
        // Exclude the "All" checkbox from the count
        const checkedCities = checked.filter(cb => cb.value !== 'All');

        if (checked.length === 0) {
            selectedText.textContent = 'Select cities...';
        } else if (allCheckbox && allCheckbox.checked) {
            // 如果overview被选中，显示"Overview (All CMAs)"
            selectedText.textContent = 'Overview (All CMAs)';
        } else if (checked.length === 1) {
            const label = checked[0].parentElement.textContent.trim();
            selectedText.textContent = label;
        } else {
            selectedText.textContent = `${checkedCities.length} cities selected`;
        }
    }

    // --- 6. INITIALIZATION ---
    function init() {
        console.log('Vis0 Icons Chart initializing...');

        // Bind event listeners to checkboxes
        const checkboxGroup = document.getElementById('vis0-icon-city-selector');
        if (checkboxGroup) {
            // Initialize dropdown
            initializeDropdown(checkboxGroup);
            
            const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');
            
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    // 防止手动取消Overview
                    const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'All');
                    if (checkbox.value === 'All' && !checkbox.checked) {
                        e.preventDefault();
                        checkbox.checked = true;
                        return;
                    }
                    
                    // 防止取消最后一个选项
                    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
                    if (checkedCount === 0) {
                        e.preventDefault();
                        checkbox.checked = true;
                        return;
                    }
                    
                    // 应用全选逻辑，传入被点击的checkbox
                    handleOverviewExclusive(checkbox);
                    
                    // 更新下拉框文本
                    updateDropdownText(checkboxGroup, checkboxes);
                    
                    updateChart();
                    
                    // Notify global state manager with selected city names
                    // 注意：handleOverviewExclusive可能已经改变了checkbox状态，所以这里需要重新读取
                    let valuesToSend;
                    
                    // 如果All被选中，只发送['All']
                    if (allCheckbox && allCheckbox.checked) {
                        valuesToSend = ['All'];
                    } else {
                        // 否则发送选中的城市名称（不是CMA codes）
                        valuesToSend = Array.from(checkboxes)
                            .filter(cb => cb.checked && cb.value !== 'All')
                            .map(cb => cb.value);
                    }
                    
                    // 即使valuesToSend是空数组，也要发送（让其他vis知道要取消所有选择）
                    // 但由于我们有"防止取消最后一个选项"的逻辑，这种情况不应该发生
                    if (typeof globalStateManager !== 'undefined') {
                        globalStateManager.notifyCityChanged('vis0', valuesToSend.length > 0 ? valuesToSend : ['All']);
                    }
                });
            });
        }

        // Subscribe to global city changes
        if (typeof globalStateManager !== 'undefined') {
            globalStateManager.subscribe((detail) => {
                // Don't react to our own changes
                if (detail.source === 'vis0') return;

                const checkboxes = checkboxGroup?.querySelectorAll('input[type="checkbox"]');
                if (!checkboxes) return;

                // detail.value 可能是单个值或数组
                const values = Array.isArray(detail.value) ? detail.value : [detail.value];
                
                // 检查是否为全选信号
                const isAllSelected = values.includes('All') || values.includes('all') || values.includes('overview');
                
                // 更新checkboxes状态
                checkboxes.forEach(checkbox => {
                    if (isAllSelected) {
                        // 全选：选中所有checkbox
                        checkbox.checked = true;
                    } else {
                        const cityName = checkbox.value;
                        const cmaCode = cityNameToCmaCode[cityName];
                        
                        // 检查是否应该被选中
                        const shouldCheck = values.some(v => {
                            return v === cityName || 
                                   v === cmaCode || 
                                   cmaCodeToCityName[v] === cityName;
                        });
                        
                        checkbox.checked = shouldCheck;
                    }
                });
                
                // 更新下拉框显示文本
                updateDropdownText(checkboxGroup, checkboxes);
                
                updateChart();
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
