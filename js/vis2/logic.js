(function () {
    // 配置
    const targetChartId = 'vis2-chart-main';
    const chartConfig = config_htmlwidget_523a716e2cfe1cabd60a;
    const chartData = chartConfig.data;

    // 1. 初始化集合与数据缓存
    const modes = new Set();
    const regions = new Set();
    const summaryDataCache = []; // 用于存储提取好的干净数据

    // 2. 解析数据 (一次性完成)
    chartData.forEach((trace) => {
        if (trace.key && trace.key.length > 0) {
            const keyStr = trace.key[0];
            const parts = keyStr.split('__');

            if (parts.length >= 2) {
                const region = parts[0];
                const mode = parts[1];

                regions.add(region);
                modes.add(mode);

                trace._custom_region = region;
                trace._custom_mode = mode;

                // --- 新增：提取表格所需数据 ---
                // trace.y[0] 是 2016年数据, trace.y[1] 是 2021年数据
                // 假设数据是小数 (如 0.71)，我们需要转成百分比
                const val2016 = trace.y[0] || 0;
                const val2021 = trace.y[1] || 0;

                // 计算变化 (Percentage Points)
                const changePP = (val2021 - val2016) * 100;

                // 计算变化率 (Percentage Change)
                // 避免除以零
                let changePercent = 0;
                if (val2016 !== 0) {
                    changePercent = ((val2021 - val2016) / val2016) * 100;
                }

                summaryDataCache.push({
                    region: region,
                    mode: mode,
                    val2016: (val2016 * 100).toFixed(1) + '%',
                    val2021: (val2021 * 100).toFixed(1) + '%',
                    changePP: changePP.toFixed(2), // 保留两位小数
                    changePercent: changePercent.toFixed(1) + '%'
                });
            }
        }
    });

    // 3. 填充下拉菜单函数
    function populateSelect(id, items) {
        const select = document.getElementById(id);
        if (!select) {
            console.error(`Element with id '${id}' not found`);
            return;
        }
        select.innerHTML = '<option value="all">All</option>';
        const sortedItems = Array.from(items).sort();
        sortedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    }

    populateSelect('vis2-mode-select', modes);
    populateSelect('vis2-CMA-select', regions);

    // 4. 渲染表格函数
    function renderTable(data) {
        const tbody = document.querySelector('#vis2-summary-table tbody');
        if (!tbody) return;

        tbody.innerHTML = ''; // 清空旧数据

        const noDataMsg = document.getElementById('vis2-no-data-msg');
        if (data.length === 0) {
            if (noDataMsg) noDataMsg.style.display = 'block';
            return;
        } else {
            if (noDataMsg) noDataMsg.style.display = 'none';
        }

        data.forEach(row => {
            const tr = document.createElement('tr');

            // 根据涨跌设置颜色 (可选优化)
            const colorClass = parseFloat(row.changePP) >= 0 ? 'text-green' : 'text-red';

            tr.innerHTML = `
                <td>${row.region}</td>
                <td>${row.mode}</td>
                <td>${row.val2016}</td>
                <td>${row.val2021}</td>
                <td style="color: ${parseFloat(row.changePP) > 0 ? 'green' : (parseFloat(row.changePP) < 0 ? 'red' : 'inherit')}">${row.changePP > 0 ? '+' : ''}${row.changePP}</td>
                <td>${row.changePercent}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 5. 核心逻辑：更新图表 + 表格
    function updateAll() {
        const modeSelect = document.getElementById('vis2-mode-select');
        const regionSelect = document.getElementById('vis2-CMA-select');

        if (!modeSelect || !regionSelect) return;

        const selectedMode = modeSelect.value;
        const selectedRegion = regionSelect.value;

        // --- A. 更新图表透明度 ---
        const newOpacities = chartData.map(trace => {
            if (!trace._custom_mode || !trace._custom_region) return 1;
            const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
            const regionMatch = (selectedRegion === 'all') || (trace._custom_region === selectedRegion);
            return (modeMatch && regionMatch) ? 1 : 0.1;
        });

        Plotly.restyle(targetChartId, {
            'marker.opacity': newOpacities,
            'opacity': newOpacities
        });

        // --- B. 更新表格数据 ---
        // 筛选符合条件的行
        const filteredTableData = summaryDataCache.filter(item => {
            const modeMatch = (selectedMode === 'all') || (item.mode === selectedMode);
            const regionMatch = (selectedRegion === 'all') || (item.region === selectedRegion);
            return modeMatch && regionMatch;
        });

        // 渲染表格
        renderTable(filteredTableData);
    }

    // 6. 绑定事件
    const modeSelect = document.getElementById('vis2-mode-select');
    const regionSelect = document.getElementById('vis2-CMA-select');
    const resetBtn = document.getElementById('vis2-reset-btn');

    if (modeSelect) modeSelect.addEventListener('change', updateAll);

    if (regionSelect) {
        regionSelect.addEventListener('change', (e) => {
            updateAll();
            // Notify global state manager
            if (typeof globalStateManager !== 'undefined') {
                globalStateManager.notifyCityChanged('vis2', e.target.value);
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (modeSelect) modeSelect.value = 'all';
            if (regionSelect) {
                regionSelect.value = 'all';
                // Notify global state manager
                if (typeof globalStateManager !== 'undefined') {
                    globalStateManager.notifyCityChanged('vis2', 'all');
                }
            }
            updateAll(); // 重置并刷新
        });
    }

    // 7. 订阅全局状态
    if (typeof globalStateManager !== 'undefined') {
        globalStateManager.subscribe((detail) => {
            // Ignore updates from self to avoid loops
            if (detail.source !== 'vis2') {
                console.log('Vis2 received global update:', detail);
                let cmaName = detail.value;

                // If it's a code (from Vis1), convert to name using global mapping
                if (globalStateManager.cmaNames[detail.value]) {
                    cmaName = globalStateManager.cmaNames[detail.value];
                } else if (detail.value === 'overview') {
                    cmaName = 'all';
                }

                if (regionSelect) {
                    // Check if the option exists in the dropdown
                    const options = Array.from(regionSelect.options).map(o => o.value);
                    if (options.includes(cmaName)) {
                        regionSelect.value = cmaName;
                        updateAll();
                    } else if (cmaName === 'all') {
                        regionSelect.value = 'all';
                        updateAll();
                    }
                }
            }
        });
    }

    // 初始化：默认显示所有数据
    setTimeout(updateAll, 0);

    console.log("Interactive Focus logic initialized (Chart + Table + Global Sync).");

})();