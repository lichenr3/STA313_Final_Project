// filters_new.js - Separate filter managers for pie and bar charts

// Base Filter Manager Class
class BaseFilterManager {
  constructor(idPrefix) {
    this.idPrefix = idPrefix;
    this.state = {
      cma: ['overview'],  // 改为数组以支持多选
      incomeMin: 0,
      incomeMax: 150000
    };
    this.onFilterChange = null;
  }

  initializeUI() {
    // CMA Checkbox Dropdown
    this.cmaCheckboxGroup = document.getElementById(`cma-select-${this.idPrefix}`);
    if (this.cmaCheckboxGroup) {
      // 初始化下拉功能
      this.initializeDropdown(this.cmaCheckboxGroup);
      
      // 获取所有checkbox
      this.cmaCheckboxes = this.cmaCheckboxGroup.querySelectorAll('input[type="checkbox"]');
      
      this.cmaCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
          const clickedCheckbox = e.target;
          
          // 防止手动取消overview - overview只能被勾选，不能被手动取消
          if (clickedCheckbox.value === 'overview' && !clickedCheckbox.checked) {
            e.preventDefault();
            clickedCheckbox.checked = true;
            return;
          }
          
          // 防止取消最后一个选项
          const checkedCount = Array.from(this.cmaCheckboxes).filter(cb => cb.checked).length;
          if (checkedCount === 0) {
            e.preventDefault();
            clickedCheckbox.checked = true;
            return;
          }
          
          this.updateCMASelection(clickedCheckbox);
          this.updateDropdownText();
          this.notifyChange();

          // Notify global state manager
          if (typeof globalStateManager !== 'undefined') {
            // 检查overview是否被选中
            const overviewCheckbox = Array.from(this.cmaCheckboxes).find(cb => cb.value === 'overview');
            let valuesToSend = this.state.cma;
            
            // 如果overview被选中（表示所有城市都选中），只发送['All']
            if (overviewCheckbox && overviewCheckbox.checked) {
              valuesToSend = ['All'];
            }
            
            globalStateManager.notifyCityChanged(`vis1-${this.idPrefix}`, valuesToSend);
          }
        });
      });
      
      // 初始化state以匹配HTML中的默认checkbox状态
      this.updateCMASelection(null);
      this.updateDropdownText();
    }

    // Income Range Slider (Dual Handle)
    this.incomeMinInput = document.getElementById(`income-min-${this.idPrefix}`);
    this.incomeMaxInput = document.getElementById(`income-max-${this.idPrefix}`);
    this.incomeValueDisplay = document.getElementById(`income-value-${this.idPrefix}`);
    
    // 找到当前控制section下的slider-track
    const controlSection = document.getElementById(`vis1-${this.idPrefix}-controls`);
    this.sliderTrack = controlSection ? controlSection.querySelector('.slider-track') : null;

    if (this.incomeMinInput && this.incomeMaxInput) {
      // Update min slider - ensure it doesn't exceed max
      this.incomeMinInput.addEventListener('input', () => {
        let minVal = parseInt(this.incomeMinInput.value);
        let maxVal = parseInt(this.incomeMaxInput.value);

        // Constrain: min cannot be greater than max
        if (minVal > maxVal) {
          minVal = maxVal;
          this.incomeMinInput.value = minVal;
        }

        this.state.incomeMin = minVal;
        this.state.incomeMax = maxVal;

        if (this.incomeValueDisplay) {
          this.incomeValueDisplay.textContent = `${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`;
        }

        this.updateSliderTrack();
        this.notifyChange();
      });

      // Update max slider - ensure it doesn't go below min
      this.incomeMaxInput.addEventListener('input', () => {
        let minVal = parseInt(this.incomeMinInput.value);
        let maxVal = parseInt(this.incomeMaxInput.value);

        // Constrain: max cannot be less than min
        if (maxVal < minVal) {
          maxVal = minVal;
          this.incomeMaxInput.value = maxVal;
        }

        this.state.incomeMin = minVal;
        this.state.incomeMax = maxVal;

        if (this.incomeValueDisplay) {
          this.incomeValueDisplay.textContent = `${formatCurrency(minVal)} - ${formatCurrency(maxVal)}`;
        }

        this.updateSliderTrack();
        this.notifyChange();
      });

      this.updateSliderTrack();
    }
    
    // 订阅全局状态变化
    if (typeof globalStateManager !== 'undefined') {
      globalStateManager.subscribe((detail) => {
        // 不响应自己的变化
        if (detail.source === `vis1-${this.idPrefix}`) return;
        
        if (!this.cmaCheckboxGroup) return;
        
        // detail.value 可能是单个值或数组
        const values = Array.isArray(detail.value) ? detail.value : [detail.value];
        
        // 检查是否接收到全选信号
        const isAllSelected = values.includes('All') || values.includes('all');
        
        // 更新checkboxes状态
        this.cmaCheckboxes.forEach(checkbox => {
          const checkboxValue = checkbox.value;
          
          // 如果接收到全选信号，选中所有checkbox
          if (isAllSelected) {
            checkbox.checked = true;
          } else {
            // 检查是否应该被选中
            const shouldCheck = values.some(v => {
              // 处理各种可能的值格式
              if (v === checkboxValue) return true;
              if (v === 'overview' && checkboxValue === 'overview') return true;
              // 处理城市名称匹配（忽略大小写和特殊字符）
              const normalizedV = String(v).toLowerCase().replace(/[^a-z]/g, '');
              const normalizedCheckbox = String(checkboxValue).toLowerCase().replace(/[^a-z]/g, '');
              return normalizedV === normalizedCheckbox;
            });
            
            checkbox.checked = shouldCheck;
          }
        });
        
        // 更新下拉框显示文本
        this.updateDropdownText();
        
        // 更新内部状态
        this.updateCMASelection(null);
        
        // 触发数据更新（但不通知全局状态，避免循环）
        if (this.onFilterChange) {
          this.onFilterChange(this.state);
        }
      });
    }
  }

  updateSliderTrack() {
    if (!this.incomeMinInput || !this.incomeMaxInput || !this.sliderTrack) return;

    const min = parseInt(this.incomeMinInput.min);
    const max = parseInt(this.incomeMinInput.max);
    const currentMin = this.state.incomeMin;
    const currentMax = this.state.incomeMax;

    const percent1 = ((currentMin - min) / (max - min)) * 100;
    const percent2 = ((currentMax - min) / (max - min)) * 100;

    this.sliderTrack.style.background = `linear-gradient(to right, #dadae5 ${percent1}%, #3498db ${percent1}%, #3498db ${percent2}%, #dadae5 ${percent2}%)`;
  }

  // 初始化下拉框功能
  initializeDropdown(container) {
    const toggle = container.querySelector('.checkbox-dropdown-toggle');
    const content = container.querySelector('.checkbox-dropdown-content');
    const arrow = container.querySelector('.checkbox-dropdown-arrow');

    if (!toggle || !content) return;

    // 点击toggle展开/收起
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      
      // 关闭其他所有下拉框
      document.querySelectorAll('.checkbox-dropdown-content.open').forEach(el => {
        if (el !== content) {
          el.classList.remove('open');
          el.previousElementSibling?.classList.remove('open');
          el.previousElementSibling?.querySelector('.checkbox-dropdown-arrow')?.classList.remove('open');
        }
      });

      // 切换当前下拉框
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

    // 点击外部关闭
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        content.classList.remove('open');
        toggle.classList.remove('open');
        arrow?.classList.remove('open');
      }
    });

    // 阻止点击checkbox时关闭下拉框
    content.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  // 更新下拉框显示的文本
  updateDropdownText() {
    if (!this.cmaCheckboxGroup) return;

    const selectedText = this.cmaCheckboxGroup.querySelector('.selected-text');
    if (!selectedText) return;

    const checked = Array.from(this.cmaCheckboxes)
      .filter(cb => cb.checked);
    const overviewCheckbox = Array.from(this.cmaCheckboxes).find(cb => cb.value === 'overview');
    // Exclude the "overview" checkbox from the count
    const checkedRegions = checked.filter(cb => cb.value !== 'overview');

    if (checked.length === 0) {
      selectedText.textContent = 'Select regions...';
    } else if (overviewCheckbox && overviewCheckbox.checked) {
      // 如果overview被选中，显示"Overview (All CMAs)"
      selectedText.textContent = 'Overview (All CMAs)';
    } else if (checked.length === 1) {
      const label = checked[0].parentElement.textContent.trim();
      selectedText.textContent = label;
    } else {
      selectedText.textContent = `${checkedRegions.length} regions selected`;
    }
  }

  // 更新CMA选择状态 - 与vis0和vis2保持一致的逻辑
  updateCMASelection(clickedCheckbox) {
    if (!this.cmaCheckboxGroup) return;

    // 获取所有CMA checkbox (排除overview)
    const allCmaCheckboxes = Array.from(this.cmaCheckboxes).filter(cb => cb.value !== 'overview');
    const overviewCheckbox = Array.from(this.cmaCheckboxes).find(cb => cb.value === 'overview');
    
    if (!overviewCheckbox) return;

    // 如果点击的是overview
    if (clickedCheckbox && clickedCheckbox.value === 'overview') {
      // overview被点击时，选中所有CMA (overview只能被勾选，不能被手动取消)
      allCmaCheckboxes.forEach(cb => cb.checked = true);
      // 保存所有城市的值
      this.state.cma = allCmaCheckboxes.map(cb => cb.value);
    }
    // 如果点击的是其他CMA
    else {
      const checkedCmas = allCmaCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
      const allCmasChecked = allCmaCheckboxes.length > 0 && checkedCmas.length === allCmaCheckboxes.length;
      
      // 如果所有CMA都被选中，自动勾选overview
      if (allCmasChecked) {
        overviewCheckbox.checked = true;
        // 保存所有选中的城市，而不是'overview'
        this.state.cma = checkedCmas.length > 0 ? checkedCmas : ['overview'];
      }
      // 否则自动取消overview，使用选中的CMA
      else {
        overviewCheckbox.checked = false;
        this.state.cma = checkedCmas.length > 0 ? checkedCmas : ['overview'];
      }
    }
  }

  populateCMAOptions(cmaCodes) {
    if (!this.cmaCheckboxGroup) return;

    // 找到 checkbox-dropdown-content 容器
    const dropdownContent = this.cmaCheckboxGroup.querySelector('.checkbox-dropdown-content');
    if (!dropdownContent) return;

    // 构建checkbox HTML - 保留overview checkbox，并默认选中所有选项
    let html = '<label class="checkbox-item"><input type="checkbox" value="overview" checked> Overview (All CMAs)</label>';

    cmaCodes.forEach(code => {
      html += `<label class="checkbox-item">
        <input type="checkbox" value="${code}" checked> ${getCMAName(code)}
      </label>`;
    });

    // 只替换 dropdown-content 的内容，保留下拉框结构
    dropdownContent.innerHTML = html;

    // 重新绑定事件监听器
    this.cmaCheckboxes = this.cmaCheckboxGroup.querySelectorAll('input[type="checkbox"]');
    this.cmaCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const clickedCheckbox = e.target;
        
        // 防止手动取消overview
        if (clickedCheckbox.value === 'overview' && !clickedCheckbox.checked) {
          e.preventDefault();
          clickedCheckbox.checked = true;
          return;
        }
        
        // 防止取消最后一个选项
        const checkedCount = Array.from(this.cmaCheckboxes).filter(cb => cb.checked).length;
        if (checkedCount === 0) {
          e.preventDefault();
          clickedCheckbox.checked = true;
          return;
        }
        
        this.updateCMASelection(clickedCheckbox);
        this.updateDropdownText();
        this.notifyChange();

        if (typeof globalStateManager !== 'undefined') {
          // 现在state.cma始终包含实际选中的城市列表
          let valuesToSend = [...this.state.cma];
          
          // 检查是否所有城市都被选中
          const allCmaCheckboxes = Array.from(this.cmaCheckboxes).filter(cb => cb.value !== 'overview');
          const allSelected = allCmaCheckboxes.every(cb => cb.checked);
          
          // 如果所有城市都选中，在列表开头添加'All'
          if (allSelected && !valuesToSend.includes('All') && !valuesToSend.includes('overview')) {
            valuesToSend = ['All', ...valuesToSend];
          }
          
          globalStateManager.notifyCityChanged(`vis1-${this.idPrefix}`, valuesToSend);
        }
      });
    });
    
    // 更新下拉框显示文本
    this.updateDropdownText();
  }

  getState() {
    return { ...this.state };
  }

  getFilterCriteria() {
    // 将城市名称转换为CMA代码，以便与数据处理器兼容
    let cmaForData = this.state.cma;
    
    // 如果是数组，转换每个元素
    if (Array.isArray(cmaForData)) {
      cmaForData = cmaForData.map(name => getCMACode(name));
    } else if (typeof cmaForData === 'string') {
      cmaForData = getCMACode(cmaForData);
    }
    
    return {
      cma: cmaForData,
      incomeMin: this.state.incomeMin,
      incomeMax: this.state.incomeMax
    };
  }

  notifyChange() {
    if (this.onFilterChange) {
      this.onFilterChange(this.state);
    }
  }
}

// Pie Chart Filter Manager
class PieFilterManager extends BaseFilterManager {
  constructor() {
    super('pie');
    this.initializeUI();
  }
}

// Bar Chart Filter Manager
class BarFilterManager extends BaseFilterManager {
  constructor() {
    super('bar');

    // Additional state for bar chart
    this.state = {
      ...this.state,
      dataType: 'percentage',
      showPublic: true,
      showPrivate: true,
      showNetChange: false
    };

    this.initializeUI();
    this.initializeBarSpecificUI();
  }

  initializeBarSpecificUI() {
    // Data Type Radio Buttons
    this.dataTypeRadios = document.querySelectorAll('input[name="data-type-bar"]');
    this.dataTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.state.dataType = e.target.value;
          this.notifyChange();
        }
      });
    });

    // Transport Type Checkboxes
    this.publicCheckbox = document.getElementById('show-public-bar');
    if (this.publicCheckbox) {
      this.publicCheckbox.addEventListener('change', (e) => {
        this.state.showPublic = e.target.checked;
        this.notifyChange();
      });
    }

    this.privateCheckbox = document.getElementById('show-private-bar');
    if (this.privateCheckbox) {
      this.privateCheckbox.addEventListener('change', (e) => {
        this.state.showPrivate = e.target.checked;
        this.notifyChange();
      });
    }

    // Net Change Checkbox
    this.netChangeCheckbox = document.getElementById('show-net-change-bar');
    if (this.netChangeCheckbox) {
      this.netChangeCheckbox.addEventListener('change', (e) => {
        this.state.showNetChange = e.target.checked;
        this.notifyChange();
      });
    }
  }

  getChartOptions() {
    return {
      displayMode: this.state.dataType,  // barChart.js expects 'displayMode', not 'dataType'
      showPublic: this.state.showPublic,
      showPrivate: this.state.showPrivate,
      showNetChange: this.state.showNetChange,
      year: '2021'  // Default year when not showing net change
    };
  }
}
