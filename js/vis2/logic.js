(function () {
    // 配置
    const targetChartId = 'htmlwidget-1cd56ae51ed08c944d05';
    const chartConfig = config_htmlwidget_1cd56ae51ed08c944d05;
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

                // --- 提取表格所需数据 ---
                // trace.x数组: [val_2016, val_2021] (x[0]对应y=2即2016年, x[1]对应y=1即2021年)
                // trace.y数组: [2, 1] (2=2016年, 1=2021年)
                const val2016 = trace.x && trace.x[0] !== undefined ? trace.x[0] : 0;
                const val2021 = trace.x && trace.x[1] !== undefined ? trace.x[1] : 0;

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
    function populateSelect(id, items, defaultText = 'All') {
        const select = document.getElementById(id);
        if (!select) {
            console.error(`Element with id '${id}' not found`);
            return;
        }
        select.innerHTML = `<option value="all">${defaultText}</option>`;
        const sortedItems = Array.from(items).sort();
        sortedItems.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            select.appendChild(option);
        });
    }

    populateSelect('vis2-mode-select', modes, 'All Modes');
    populateSelect('vis2-CMA-select', regions, 'Overview (All CMAs)');

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

    // 5. 保存原始配置
    let originalConfig = null;

    // 6. 核心逻辑：更新图表 + 表格
    function updateAll() {
        const modeSelect = document.getElementById('vis2-mode-select');
        const regionSelect = document.getElementById('vis2-CMA-select');

        if (!modeSelect || !regionSelect) return;

        const selectedMode = modeSelect.value;
        const selectedRegion = regionSelect.value;

        // --- A. 更新图表 ---
        if (selectedRegion === 'all') {
            // 恢复原始多面板视图
            if (originalConfig === null) {
                // 第一次，保存原始配置
                originalConfig = JSON.parse(JSON.stringify(chartConfig));
            }
            
            // 使用透明度过滤模式
            const newOpacities = chartData.map(trace => {
                if (!trace._custom_mode || !trace._custom_region) return 1;
                const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
                return modeMatch ? 1 : 0.3;
            });

            // 如果当前不是原始布局，重新创建
            const chartEl = document.getElementById(targetChartId);
            if (chartEl && chartEl._fullLayout && chartEl._fullLayout.annotations.length !== 9) {
                Plotly.newPlot(targetChartId, originalConfig.data, originalConfig.layout, originalConfig.config);
            }
            
            // 应用透明度
            Plotly.restyle(targetChartId, {
                'visible': true,
                'marker.opacity': newOpacities,
                'opacity': newOpacities
            });

        } else {
            // 创建单区域视图：完全重建图表
            if (originalConfig === null) {
                originalConfig = JSON.parse(JSON.stringify(chartConfig));
            }

            // 过滤出选定区域的traces
            const filteredTraces = chartData
                .filter(trace => trace._custom_region === selectedRegion)
                .map(trace => {
                    // 深拷贝trace并修改axis引用
                    const newTrace = JSON.parse(JSON.stringify(trace));
                    newTrace.xaxis = 'x';
                    newTrace.yaxis = 'y';
                    
                    // 根据mode过滤设置透明度
                    const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
                    if (newTrace.marker) {
                        newTrace.marker.opacity = modeMatch ? 1 : 0.3;
                    }
                    newTrace.opacity = modeMatch ? 1 : 0.3;
                    
                    // 保留自定义属性
                    newTrace._custom_region = trace._custom_region;
                    newTrace._custom_mode = trace._custom_mode;
                    
                    return newTrace;
                });

            // 创建单面板布局
            const singleLayout = {
                margin: originalConfig.layout.margin,
                font: originalConfig.layout.font,
                xaxis: {
                    domain: [0, 1],
                    automargin: true,
                    type: 'linear',
                    autorange: false,
                    range: [-0.05, 1.05],
                    tickmode: 'array',
                    ticktext: ['0%', '25%', '50%', '75%', '100%'],
                    tickvals: [0, 0.25, 0.5, 0.75, 1],
                    showticklabels: true,
                    showline: false,
                    showgrid: false,
                    zeroline: false,
                    title: 'Share of commuters'
                },
                yaxis: {
                    domain: [0, 1],
                    automargin: true,
                    type: 'linear',
                    autorange: false,
                    range: [0.4, 2.6],
                    tickmode: 'array',
                    ticktext: ['2021', '2016'],
                    tickvals: [1, 2],
                    showticklabels: true,
                    showline: false,
                    showgrid: true,
                    gridcolor: 'rgba(235,235,235,1)',
                    zeroline: false,
                    title: 'Census year'
                },
                annotations: [{
                    text: selectedRegion,
                    x: 0.5,
                    y: 1,
                    showarrow: false,
                    font: {
                        color: 'rgba(26,26,26,1)',
                        size: 14
                    },
                    xref: 'paper',
                    yref: 'paper',
                    xanchor: 'center',
                    yanchor: 'bottom'
                }],
                showlegend: true,
                legend: originalConfig.layout.legend,
                hovermode: 'closest',
                barmode: 'relative',
                dragmode: 'zoom'
            };

            // 重新创建图表
            Plotly.newPlot(targetChartId, filteredTraces, singleLayout, originalConfig.config);
        }

        // --- B. 更新表格数据 ---
        const filteredTableData = summaryDataCache.filter(item => {
            const modeMatch = (selectedMode === 'all') || (item.mode === selectedMode);
            const regionMatch = (selectedRegion === 'all') || (item.region === selectedRegion);
            return modeMatch && regionMatch;
        });

        renderTable(filteredTableData);
    }

    // 7. 绑定事件
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

    // 8. 订阅全局状态
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