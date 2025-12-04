// filters_new.js - Separate filter managers for pie and bar charts

// Base Filter Manager Class
class BaseFilterManager {
  constructor(idPrefix) {
    this.idPrefix = idPrefix;
    this.state = {
      cma: 'overview',
      incomeMin: 0,
      incomeMax: 150000
    };
    this.onFilterChange = null;
  }

  initializeUI() {
    // CMA Dropdown
    this.cmaSelect = document.getElementById(`cma-select-${this.idPrefix}`);
    if (this.cmaSelect) {
      this.cmaSelect.addEventListener('change', (e) => {
        this.state.cma = e.target.value;
        this.notifyChange();

        // Notify global state manager
        if (typeof globalStateManager !== 'undefined') {
          globalStateManager.notifyCityChanged(`vis1-${this.idPrefix}`, this.state.cma);
        }
      });
    }

    // Income Range Slider (Dual Handle)
    this.incomeMinInput = document.getElementById(`income-min-${this.idPrefix}`);
    this.incomeMaxInput = document.getElementById(`income-max-${this.idPrefix}`);
    this.incomeValueDisplay = document.getElementById(`income-value-${this.idPrefix}`);
    this.sliderTrack = document.querySelector(`#vis1-${this.idPrefix}-controls .slider-track`);

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

  populateCMAOptions(cmaCodes) {
    if (!this.cmaSelect) return;

    this.cmaSelect.innerHTML = '<option value="overview">Overview (All CMAs)</option>';

    cmaCodes.forEach(code => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = getCMAName(code);
      this.cmaSelect.appendChild(option);
    });

    this.cmaSelect.value = this.state.cma;
  }

  handleExternalCMASelection(cmaCode) {
    if (this.state.cma === cmaCode) return;

    this.state.cma = cmaCode;
    if (this.cmaSelect) {
      this.cmaSelect.value = cmaCode;
    }
    this.notifyChange();
  }

  getState() {
    return { ...this.state };
  }

  getFilterCriteria() {
    return {
      cma: this.state.cma,
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
