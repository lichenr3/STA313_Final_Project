// utils.js - Utility functions and constants

// CMA metadata
const CMA_METADATA = {
  '535': { name: 'Toronto', color: '#702040', colorLight: '#8D3B55' },
  '462': { name: 'Montréal', color: '#954050', colorLight: '#B0606F' },
  '505': { name: 'Ottawa-Gatineau', color: '#CC7A75', colorLight: '#E09B97' },
  '933': { name: 'Vancouver', color: '#E29886', colorLight: '#F0B8AA' },
  '825': { name: 'Calgary', color: '#E9BFB1', colorLight: '#F5D6CC' },
  '835': { name: 'Edmonton', color: '#EFE6DE', colorLight: '#F9F3EF' }
};

// Essential worker NAICS codes mapping
const ESSENTIAL_NAICS = {
  all: null, // null means all essential workers
  healthcare: ['62', '44-45', '31-33'], // Healthcare, pharmacies, medical supplies
  retail: ['44-45'], // Retail trade
  food: ['72'], // Food services
  education: ['61'], // Educational services
  transport: ['48-49'] // Transportation and warehousing
};

// Commute mode categories
const MODE_CATEGORIES = {
  sustainable: ['Public transit', 'Bicycle', 'Walk', 'Walked only', 'Bicycle only'],
  car: ['Car, driver', 'Car, passenger', 'Car, truck or van -- as a driver', 'Car, truck or van -- as a passenger'],
  other: ['Other method', 'Motorcycle', 'Taxicab']
};

// 定义通勤方式的固定顺序和颜色
const MODE_ORDER = ['Car, driver', 'Car, passenger', 'Public transit', 'Walk', 'Bicycle', 'Motorcycle', 'Taxicab', 'Other method'];

const MODE_COLORS = {
  'Car, driver': '#702040',      // Darkest red-brown
  'Car, passenger': '#8D3B55',   // Dark red-brown
  'Public transit': '#B0606F',   // Medium red-brown
  'Walk': '#CC7A75',             // Medium-light red-brown
  'Bicycle': '#E09B97',          // Light red-brown
  'Motorcycle': '#E9BFB1',       // Very light red-brown
  'Taxicab': '#F0B8AA',          // Pale red-brown
  'Other method': '#F5D6CC'      // Lightest red-brown
};

// Color scales
const COLOR_SCALES = {
  sustainable: d3.scaleOrdinal()
    .domain(['Public transit', 'Bicycle', 'Walk', 'Walked only', 'Bicycle only'])
    .range(['#43a047', '#66bb6a', '#1e88e5', '#a5d6a7', '#c8e6c9']),

  car: d3.scaleOrdinal()
    .domain(['Car, driver', 'Car, passenger', 'Car, truck or van -- as a driver', 'Car, truck or van -- as a passenger'])
    .range(['#e53935', '#ef5350', '#e57373', '#ef9a9a']),

  other: d3.scaleOrdinal()
    .domain(['Other method', 'Motorcycle', 'Taxicab'])
    .range(['#bdbdbd', '#757575', '#9e9e9e']),

  cma: d3.scaleOrdinal()
    .domain(['535', '462', '505', '933', '825', '835'])
    .range(['#e53935', '#43a047', '#1e88e5', '#fb8c00', '#8e24aa', '#00acc1'])
};

// Tooltip utilities
class Tooltip {
  constructor() {
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('background', '#fff')
      .style('border', '2px solid #3498db')
      .style('border-radius', '8px')
      .style('padding', '12px')
      .style('box-shadow', '0 2px 12px rgba(0,0,0,0.15)')
      .style('z-index', '1000')
      .style('font-size', '14px')
      .style('max-width', '300px');
  }

  show(html, event) {
    this.tooltip
      .html(html)
      .style('opacity', 1)
      .style('left', (event.pageX + 15) + 'px')
      .style('top', (event.pageY - 15) + 'px');
  }

  hide() {
    this.tooltip
      .style('opacity', 0);
  }

  remove() {
    this.tooltip.remove();
  }
}

// Format utilities
const formatNumber = d3.format(',');
const formatPercent = d3.format('.1f');
const formatCurrency = d3.format('$,');

// Helper to determine if a row is an essential worker
function isEssentialWorker(row, category) {
  if (category === 'all') return true;

  const naics = row.NAICS || '';
  const codes = ESSENTIAL_NAICS[category];

  if (!codes) return true;

  return codes.some(code => naics.startsWith(code));
}

// Helper to determine if a row is in-person worker
function isInPersonWorker(row) {
  const powst = row.POWST;
  return powst === '3' || powst === '4';
}

// Helper to determine if a row is low-income
function isLowIncome(row, threshold) {
  const income = parseFloat(row.TotInc);
  return !isNaN(income) && income > 0 && income < threshold;
}

// Helper to get mode category
function getModeCategory(mode) {
  if (!mode) return 'other';

  for (const [category, modes] of Object.entries(MODE_CATEGORIES)) {
    if (modes.some(m => mode.includes(m) || m.includes(mode))) {
      return category;
    }
  }
  return 'other';
}

// Commute mode codes mapping (based on Census PUMF)
const MODE_CODE_MAPPING = {
  '1': 'Car, driver',
  '2': 'Car, passenger',
  '3': 'Public transit',
  '4': 'Walk',
  '5': 'Bicycle',
  '6': 'Motorcycle',
  '7': 'Taxicab',
  '8': 'Other method'
};

// Helper to normalize mode names between 2016 and 2021
function normalizeMode(mode) {
  if (!mode) return 'Unknown';

  // Handle numeric codes
  if (MODE_CODE_MAPPING[mode]) {
    return MODE_CODE_MAPPING[mode];
  }

  // Normalize common variations
  const normalized = String(mode).trim();

  // Map 2021 format to 2016 format for consistency
  if (normalized.includes('Car, truck or van -- as a driver')) return 'Car, driver';
  if (normalized.includes('Car, truck or van -- as a passenger')) return 'Car, passenger';
  if (normalized.includes('Walked only')) return 'Walk';
  if (normalized.includes('Bicycle only')) return 'Bicycle';

  return normalized;
}

// Get color for a mode
function getModeColor(mode) {
  // 首先检查是否在固定颜色映射中
  if (MODE_COLORS[mode]) {
    return MODE_COLORS[mode];
  }

  // 否则按类别查找
  const category = getModeCategory(mode);

  if (category === 'sustainable') {
    return COLOR_SCALES.sustainable(mode) || '#4caf50';
  } else if (category === 'car') {
    return COLOR_SCALES.car(mode) || '#e53935';
  } else {
    return COLOR_SCALES.other(mode) || '#757575';
  }
}

// Get CMA name from code
function getCMAName(cmaCode) {
  return CMA_METADATA[cmaCode]?.name || `CMA ${cmaCode}`;
}

// Get CMA code from name (reverse lookup)
function getCMACode(cmaName) {
  // 处理特殊值
  if (cmaName === 'overview' || cmaName === 'all' || cmaName === 'All') {
    return 'overview';
  }
  
  // 标准化名称（移除空格和特殊字符，转为小写）
  const normalizedInput = cmaName.toLowerCase().replace(/[^a-z]/g, '');
  
  // 遍历查找匹配的CMA代码
  for (const [code, metadata] of Object.entries(CMA_METADATA)) {
    const normalizedMetaName = metadata.name.toLowerCase().replace(/[^a-z]/g, '');
    if (normalizedMetaName === normalizedInput) {
      return code;
    }
  }
  
  // 如果找不到，返回原值（可能已经是代码）
  return cmaName;
}

// Get CMA color
function getCMAColor(cmaCode) {
  return CMA_METADATA[cmaCode]?.color || '#757575';
}

// Animation helpers
function transitionDuration() {
  return 750;
}

function easeFunction() {
  return d3.easeCubicInOut;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CMA_METADATA,
    ESSENTIAL_NAICS,
    MODE_CATEGORIES,
    MODE_ORDER,
    MODE_COLORS,
    COLOR_SCALES,
    Tooltip,
    formatNumber,
    formatPercent,
    formatCurrency,
    isEssentialWorker,
    isInPersonWorker,
    isLowIncome,
    getModeCategory,
    normalizeMode,
    getModeColor,
    getCMAName,
    getCMAColor,
    transitionDuration,
    easeFunction
  };
}
