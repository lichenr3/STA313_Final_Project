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

    // 3. 填充选择器函数
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

    function populateCheckboxGroup(id, items, defaultText = 'All') {
        const group = document.getElementById(id);
        if (!group) {
            console.error(`Element with id '${id}' not found`);
            return;
        }
        
        // 构建dropdown内容
        const content = group.querySelector('.checkbox-dropdown-content');
        if (!content) {
            console.error('Dropdown content not found');
            return;
        }
        
        let html = `<label class="checkbox-item">
            <input type="checkbox" value="all" checked> ${defaultText}
        </label>`;
        
        const sortedItems = Array.from(items).sort();
        sortedItems.forEach(item => {
            // 默认所有城市都选中，与vis0/vis1保持一致
            html += `<label class="checkbox-item">
                <input type="checkbox" value="${item}" checked> ${item}
            </label>`;
        });
        
        content.innerHTML = html;
        
        // 初始化下拉功能
        initializeDropdown(group);
        
        // 绑定change事件
        const checkboxes = content.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                // 防止手动取消all
                if (cb.value === 'all' && !cb.checked) {
                    e.preventDefault();
                    cb.checked = true;
                    return;
                }
                
                // 防止取消最后一个选项
                const checkedCount = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
                if (checkedCount === 0) {
                    e.preventDefault();
                    cb.checked = true;
                    return;
                }
                
                handleAllExclusive(cb);
                updateDropdownText(group, checkboxes);
                updateAll();
                
                // Notify global state manager with selected city names
                const allCheckbox = Array.from(checkboxes).find(checkbox => checkbox.value === 'all');
                let valuesToSend;
                
                // 如果all被选中，只发送['All']
                if (allCheckbox && allCheckbox.checked) {
                    valuesToSend = ['All'];
                } else {
                    // 否则发送选中的城市名称（需要映射回HTML使用的名称）
                    valuesToSend = Array.from(checkboxes)
                        .filter(checkbox => checkbox.checked && checkbox.value !== 'all')
                        .map(checkbox => {
                            // 将vis2的完整城市名映射回HTML的简化名称
                            const value = checkbox.value;
                            if (value === 'Ottawa–Gatineau') return 'Ottawa';
                            if (value === 'Montréal') return 'Montreal';
                            return value;
                        });
                }
                
                // 通知其他可视化
                if (typeof globalStateManager !== 'undefined') {
                    globalStateManager.notifyCityChanged('vis2', valuesToSend.length > 0 ? valuesToSend : ['All']);
                }
            });
        });
    }

    // 下拉框功能
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
        const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'all');
        // Exclude the "all" checkbox from the count
        const checkedRegions = checked.filter(cb => cb.value !== 'all');

        if (checked.length === 0) {
            selectedText.textContent = 'Select regions...';
        } else if (allCheckbox && allCheckbox.checked) {
            // 如果overview被选中，显示"Overview (All CMAs)"
            selectedText.textContent = 'Overview (All CMAs)';
        } else if (checked.length === 1) {
            const label = checked[0].parentElement.textContent.trim();
            selectedText.textContent = label;
        } else {
            selectedText.textContent = `${checkedRegions.length} regions selected`;
        }
    }

    populateSelect('vis2-mode-select', modes, 'All Modes');
    populateCheckboxGroup('vis2-CMA-select', regions, 'Overview (All CMAs)');

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

    // all作为"全选"功能
    function handleAllExclusive(clickedCheckbox) {
        const checkboxGroup = document.getElementById('vis2-CMA-select');
        if (!checkboxGroup) return;

        const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]');
        const allCheckbox = Array.from(checkboxes).find(cb => cb.value === 'all');
        const regionCheckboxes = Array.from(checkboxes).filter(cb => cb.value !== 'all');
        
        const checkedRegions = regionCheckboxes.filter(cb => cb.checked);
        const allRegionsChecked = regionCheckboxes.length > 0 && checkedRegions.length === regionCheckboxes.length;

        if (!allCheckbox) return;

        // 如果点击的是all checkbox
        if (clickedCheckbox && clickedCheckbox.value === 'all') {
            if (allCheckbox.checked) {
                // all被选中，选中所有region
                regionCheckboxes.forEach(cb => cb.checked = true);
            } else {
                // all被取消，取消所有region
                regionCheckboxes.forEach(cb => cb.checked = false);
            }
        }
        // 如果点击的是region checkbox
        else {
            // 如果所有region都被选中，自动勾选all
            if (allRegionsChecked) {
                allCheckbox.checked = true;
            }
            // 如果不是所有region都被选中，自动取消all
            else {
                allCheckbox.checked = false;
            }
        }
    }

    // 获取选中的regions
    function getSelectedRegions() {
        const checkboxGroup = document.getElementById('vis2-CMA-select');
        if (!checkboxGroup) return ['all'];
        
        const checkboxes = checkboxGroup.querySelectorAll('input[type="checkbox"]:checked');
        const selected = Array.from(checkboxes).map(cb => cb.value);
        
        return selected.length > 0 ? selected : ['all'];
    }

    // 6. 核心逻辑：更新图表 + 表格
    function updateAll() {
        const modeSelect = document.getElementById('vis2-mode-select');

        if (!modeSelect) return;

        const selectedMode = modeSelect.value;
        const selectedRegions = getSelectedRegions();

        // --- A. 更新图表 ---
        if (selectedRegions.includes('all')) {
            // 显示所有region的原始多面板视图
            if (originalConfig === null) {
                originalConfig = JSON.parse(JSON.stringify(chartConfig));
            }
            
            // 使用透明度过滤模式
            const newOpacities = chartData.map(trace => {
                if (!trace._custom_mode || !trace._custom_region) return 1;
                const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
                return modeMatch ? 1 : 0.3;
            });

            const chartEl = document.getElementById(targetChartId);
            if (chartEl && chartEl._fullLayout && chartEl._fullLayout.annotations.length !== 9) {
                Plotly.newPlot(targetChartId, originalConfig.data, originalConfig.layout, originalConfig.config);
            }
            
            Plotly.restyle(targetChartId, {
                'visible': true,
                'marker.opacity': newOpacities,
                'opacity': newOpacities
            });

        } else if (selectedRegions.length > 1) {
            // 多选region：创建独立子图布局
            if (originalConfig === null) {
                originalConfig = JSON.parse(JSON.stringify(chartConfig));
            }

            const numRegions = selectedRegions.length;
            const cols = Math.min(3, numRegions); // 最多3列
            const rows = Math.ceil(numRegions / cols);

            // 过滤出选中regions的traces
            const filteredTraces = [];
            const annotations = [];

            selectedRegions.forEach((region, idx) => {
                const row = Math.floor(idx / cols);
                const col = idx % cols;

                // 计算subplot域
                const xDomain = [col / cols + 0.02, (col + 1) / cols - 0.02];
                const yDomain = [1 - (row + 1) / rows + 0.05, 1 - row / rows - 0.02];

                // 为该region添加所有mode的traces
                chartData.forEach(trace => {
                    if (trace._custom_region === region) {
                        const newTrace = JSON.parse(JSON.stringify(trace));
                        newTrace.xaxis = `x${idx + 1}`;
                        newTrace.yaxis = `y${idx + 1}`;

                        // 根据mode过滤设置透明度
                        const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
                        if (newTrace.marker) {
                            newTrace.marker.opacity = modeMatch ? 1 : 0.3;
                        }
                        newTrace.opacity = modeMatch ? 1 : 0.3;

                        newTrace._custom_region = trace._custom_region;
                        newTrace._custom_mode = trace._custom_mode;

                        filteredTraces.push(newTrace);
                    }
                });

                // 添加region标题annotation
                annotations.push({
                    text: region,
                    x: (xDomain[0] + xDomain[1]) / 2,
                    y: yDomain[1],
                    showarrow: false,
                    font: { color: 'rgba(26,26,26,1)', size: 12 },
                    xref: 'paper',
                    yref: 'paper',
                    xanchor: 'center',
                    yanchor: 'bottom'
                });
            });

            // 为每列添加x轴刻度标签 (0%, 25%, 50%, 75%, 100%)
            const tickLabels = ['0%', '25%', '50%', '75%', '100%'];
            const tickPositions = [0, 0.25, 0.5, 0.75, 1];
            
            for (let col = 0; col < cols; col++) {
                const colCenter = (col + 0.5) / cols;
                const colStart = col / cols + 0.02;
                const colEnd = (col + 1) / cols - 0.02;
                const colWidth = colEnd - colStart;
                
                // 为这一列添加刻度标签
                tickPositions.forEach((relPos, i) => {
                    const xPos = colStart + relPos * colWidth;
                    annotations.push({
                        text: tickLabels[i],
                        x: xPos,
                        y: -0.05,
                        showarrow: false,
                        font: { color: 'rgba(77,77,77,1)', size: 12 },
                        xref: 'paper',
                        yref: 'paper',
                        xanchor: 'center',
                        yanchor: 'top'
                    });
                });
            }
            
            // 添加全局x轴标题annotation (在刻度标签下方)
            annotations.push({
                text: 'Share of commuters',
                x: 0.5,
                y: -0.10,  // 在刻度标签下方
                showarrow: false,
                font: { color: 'rgba(0,0,0,1)', size: 14 },
                xref: 'paper',
                yref: 'paper',
                xanchor: 'center',
                yanchor: 'top'
            });

            // 创建布局
            const multiLayout = {
                margin: originalConfig.layout.margin,
                font: originalConfig.layout.font,
                annotations: annotations,
                showlegend: true,
                legend: originalConfig.layout.legend,
                hovermode: 'closest',
                barmode: 'relative',
                dragmode: 'zoom'
            };

            // 为每个subplot添加x和y轴配置
            selectedRegions.forEach((region, idx) => {
                const row = Math.floor(idx / cols);
                const col = idx % cols;
                const xDomain = [col / cols + 0.02, (col + 1) / cols - 0.02];
                const yDomain = [1 - (row + 1) / rows + 0.05, 1 - row / rows - 0.02];

                const xAxisKey = idx === 0 ? 'xaxis' : `xaxis${idx + 1}`;
                const yAxisKey = idx === 0 ? 'yaxis' : `yaxis${idx + 1}`;

                multiLayout[xAxisKey] = {
                    domain: xDomain,
                    automargin: true,
                    type: 'linear',
                    autorange: false,
                    range: [-0.05, 1.05],
                    tickmode: 'array',
                    ticktext: [],
                    tickvals: [],
                    showticklabels: false,  // 隐藏各个小图的x轴刻度标签
                    showline: false,
                    showgrid: false,
                    zeroline: false,
                    title: ''  // 移除各个小图的title
                };

                multiLayout[yAxisKey] = {
                    domain: yDomain,
                    automargin: true,
                    type: 'linear',
                    autorange: false,
                    range: [0.4, 2.6],
                    tickmode: 'array',
                    ticktext: ['2021', '2016'],
                    tickvals: [1, 2],
                    showticklabels: col === 0,
                    showline: false,
                    showgrid: true,
                    gridcolor: 'rgba(235,235,235,1)',
                    zeroline: false,
                    title: col === 0 ? 'Year' : ''
                };
            });

            Plotly.newPlot(targetChartId, filteredTraces, multiLayout, originalConfig.config);

        } else {
            // 单region视图：完全重建图表
            const selectedRegion = selectedRegions[0];
            
            if (originalConfig === null) {
                originalConfig = JSON.parse(JSON.stringify(chartConfig));
            }

            // 过滤出选定区域的traces
            const filteredTraces = chartData
                .filter(trace => trace._custom_region === selectedRegion)
                .map(trace => {
                    const newTrace = JSON.parse(JSON.stringify(trace));
                    newTrace.xaxis = 'x';
                    newTrace.yaxis = 'y';
                    
                    const modeMatch = (selectedMode === 'all') || (trace._custom_mode === selectedMode);
                    if (newTrace.marker) {
                        newTrace.marker.opacity = modeMatch ? 1 : 0.3;
                    }
                    newTrace.opacity = modeMatch ? 1 : 0.3;
                    
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

            Plotly.newPlot(targetChartId, filteredTraces, singleLayout, originalConfig.config);
        }

        // --- B. 更新表格数据 ---
        const filteredTableData = summaryDataCache.filter(item => {
            const modeMatch = (selectedMode === 'all') || (item.mode === selectedMode);
            const regionMatch = selectedRegions.includes('all') || selectedRegions.includes(item.region);
            return modeMatch && regionMatch;
        });

        renderTable(filteredTableData);
    }

    // 7. 绑定事件
    const modeSelect = document.getElementById('vis2-mode-select');
    const regionCheckboxGroup = document.getElementById('vis2-CMA-select');
    const resetBtn = document.getElementById('vis2-reset-btn');

    if (modeSelect) modeSelect.addEventListener('change', updateAll);

    // checkbox事件已在populateCheckboxGroup中绑定

    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (modeSelect) modeSelect.value = 'all';
            if (regionCheckboxGroup) {
                const checkboxes = regionCheckboxGroup.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => {
                    cb.checked = (cb.value === 'all');
                });
                // Notify global state manager
                if (typeof globalStateManager !== 'undefined') {
                    globalStateManager.notifyCityChanged('vis2', ['all']);
                }
            }
            updateAll();
        });
    }

    // 8. 订阅全局状态
    if (typeof globalStateManager !== 'undefined') {
        globalStateManager.subscribe((detail) => {
            if (detail.source !== 'vis2') {
                console.log('Vis2 received global update:', detail);
                
                // detail.value可能是单个值或数组
                let valuesToSet = Array.isArray(detail.value) ? detail.value : [detail.value];
                
                // 检查是否为全选信号
                const isAllSelected = valuesToSet.includes('All') || valuesToSet.includes('all') || valuesToSet.includes('overview');
                
                // 城市名称映射（HTML使用简化名称，vis2数据使用完整名称）
                const cityNameMap = {
                    'Ottawa': 'Ottawa–Gatineau',
                    'Montreal': 'Montréal',
                    'Montréal': 'Montréal'
                };
                
                if (regionCheckboxGroup) {
                    const checkboxes = regionCheckboxGroup.querySelectorAll('input[type="checkbox"]');
                    
                    if (isAllSelected) {
                        // 全选：选中所有checkbox
                        checkboxes.forEach(cb => cb.checked = true);
                    } else {
                        // 部分选择：映射城市名称并更新checkbox
                        const mappedValues = valuesToSet.map(v => cityNameMap[v] || v);
                        checkboxes.forEach(cb => {
                            cb.checked = mappedValues.includes(cb.value);
                        });
                    }
                    
                    // 更新下拉框显示文本
                    updateDropdownText(regionCheckboxGroup, checkboxes);
                    
                    updateAll();
                }
            }
        });
    }

    // 初始化：默认显示所有数据
    setTimeout(updateAll, 0);

    console.log("Interactive Focus logic initialized (Chart + Table + Global Sync).");

})();