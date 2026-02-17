// Stock Screener Prototype Script

// Mock Stock Data
const mockStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', marketCap: 'mega', price: 182.52, changePercent: 2.3, changeAbsolute: 4.10, rsi: 65.3, macdSignal: 'bullish', volumeSpike: null, catalysts: [{ type: 'earnings', description: 'Earnings: Mar 1' }] },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', marketCap: 'mega', price: 410.25, changePercent: 1.1, changeAbsolute: 4.50, rsi: 58.7, macdSignal: 'neutral', volumeSpike: null, catalysts: [{ type: 'insider_buy', description: 'Insider Buy' }] },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto', marketCap: 'large', price: 195.80, changePercent: -0.8, changeAbsolute: -1.55, rsi: 42.1, macdSignal: 'bearish', volumeSpike: 2.3, catalysts: [{ type: 'high_oi', description: 'High OI ⚠️' }] },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', marketCap: 'mega', price: 735.42, changePercent: 3.9, changeAbsolute: 27.80, rsi: 71.2, macdSignal: 'bullish', volumeSpike: 1.8, catalysts: [] },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', marketCap: 'mega', price: 141.80, changePercent: 0.5, changeAbsolute: 0.70, rsi: 54.3, macdSignal: 'neutral', volumeSpike: null, catalysts: [] },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer', marketCap: 'mega', price: 178.35, changePercent: -1.2, changeAbsolute: -2.15, rsi: 48.9, macdSignal: 'bearish', volumeSpike: null, catalysts: [] },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', marketCap: 'mega', price: 495.22, changePercent: 2.8, changeAbsolute: 13.50, rsi: 68.5, macdSignal: 'bullish', volumeSpike: null, catalysts: [] },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', marketCap: 'large', price: 195.47, changePercent: 0.3, changeAbsolute: 0.58, rsi: 52.1, macdSignal: 'neutral', volumeSpike: null, catalysts: [] },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Financials', marketCap: 'large', price: 278.90, changePercent: 1.5, changeAbsolute: 4.12, rsi: 61.7, macdSignal: 'bullish', volumeSpike: null, catalysts: [] },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Consumer', marketCap: 'large', price: 165.23, changePercent: -0.4, changeAbsolute: -0.66, rsi: 45.8, macdSignal: 'neutral', volumeSpike: null, catalysts: [] }
];

// State
let currentFilters = {
  technical: {
    rsiMin: 0,
    rsiMax: 100,
    macdBullish: false,
    macdBearish: false,
    macdNeutral: false,
    ma50: false,
    ma200: false,
    goldenCross: false,
    volumeSpike: 1.0
  },
  fundamental: {
    capMicro: false,
    capSmall: false,
    capMid: true,
    capLarge: true,
    capMega: false,
    peRatio: 100,
    earningsGrowth: 0,
    sector: 'all'
  },
  momentum: {
    highOI: false,
    ivRank: false,
    insiderBuy: false,
    insiderSell: false,
    earningsWeek: false,
    analystUpgrade: false,
    priceMomentum: 0
  },
  logic: 'AND'
};

let currentPage = 1;
let pageSize = 10;
let sortBy = 'symbol';
let sortOrder = 'asc';
let autoUpdate = true;

// Preset Configurations
const presets = {
  all: { name: 'All Stocks', filters: {} },
  oversold: {
    name: '🔴 High RSI Oversold',
    filters: {
      technical: { rsiMin: 0, rsiMax: 30, volumeSpike: 1.0 }
    }
  },
  overbought: {
    name: '🟢 High RSI Overbought',
    filters: {
      technical: { rsiMin: 70, rsiMax: 100 }
    }
  },
  macd: {
    name: '📈 MACD Bullish Crossover',
    filters: {
      technical: { macdBullish: true, ma50: true }
    }
  },
  earnings: {
    name: '📅 Earnings This Week',
    filters: {
      momentum: { earningsWeek: true }
    }
  },
  value: {
    name: '💼 Large Cap Value',
    filters: {
      fundamental: { capLarge: true, capMega: true, peRatio: 15 }
    }
  },
  unusual: {
    name: '⚠️ Unusual Options Activity',
    filters: {
      momentum: { highOI: true, ivRank: true }
    }
  },
  insider: {
    name: '👔 Insider Buying',
    filters: {
      momentum: { insiderBuy: true }
    }
  },
  momentum: {
    name: '🚀 Momentum Breakout',
    filters: {
      technical: { ma50: true, volumeSpike: 2.0, rsiMin: 60, rsiMax: 100 }
    }
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeFilters();
  initializeEventListeners();
  updateResults();
});

function initializeFilters() {
  // Set initial values from state
  document.getElementById('rsiMin').value = currentFilters.technical.rsiMin;
  document.getElementById('rsiMax').value = currentFilters.technical.rsiMax;
  document.getElementById('rsiMinValue').textContent = currentFilters.technical.rsiMin;
  document.getElementById('rsiMaxValue').textContent = currentFilters.technical.rsiMax;
  
  document.getElementById('volumeSpike').value = currentFilters.technical.volumeSpike;
  document.getElementById('volumeSpikeValue').textContent = currentFilters.technical.volumeSpike.toFixed(1);
  
  document.getElementById('autoUpdate').checked = autoUpdate;
}

function initializeEventListeners() {
  // Preset dropdown
  const presetDropdown = document.getElementById('presetDropdown');
  const presetMenu = document.getElementById('presetMenu');
  
  presetDropdown.addEventListener('click', () => {
    const isOpen = presetMenu.hidden;
    presetMenu.hidden = !isOpen;
    presetDropdown.setAttribute('aria-expanded', isOpen);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!presetDropdown.contains(e.target) && !presetMenu.contains(e.target)) {
      presetMenu.hidden = true;
      presetDropdown.setAttribute('aria-expanded', 'false');
    }
  });

  // Preset items
  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      const presetId = item.dataset.preset;
      applyPreset(presetId);
      presetMenu.hidden = true;
      presetDropdown.setAttribute('aria-expanded', 'false');
    });
  });

  // Clear filters
  document.getElementById('clearFilters').addEventListener('click', clearAllFilters);

  // Auto-update toggle
  document.getElementById('autoUpdate').addEventListener('change', (e) => {
    autoUpdate = e.target.checked;
  });

  // Filter tabs
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchFilterTab(tab);
    });
  });

  // RSI sliders
  document.getElementById('rsiMin').addEventListener('input', (e) => {
    currentFilters.technical.rsiMin = parseInt(e.target.value);
    document.getElementById('rsiMinValue').textContent = e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  document.getElementById('rsiMax').addEventListener('input', (e) => {
    currentFilters.technical.rsiMax = parseInt(e.target.value);
    document.getElementById('rsiMaxValue').textContent = e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  // RSI quick buttons
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const [min, max] = btn.dataset.rsi.split(',').map(Number);
      currentFilters.technical.rsiMin = min;
      currentFilters.technical.rsiMax = max;
      document.getElementById('rsiMin').value = min;
      document.getElementById('rsiMax').value = max;
      document.getElementById('rsiMinValue').textContent = min;
      document.getElementById('rsiMaxValue').textContent = max;
      if (autoUpdate) updateResults();
    });
  });

  // MACD checkboxes
  ['macdBullish', 'macdBearish', 'macdNeutral'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      currentFilters.technical[id] = e.target.checked;
      if (autoUpdate) debounceUpdate();
    });
  });

  // Moving average checkboxes
  ['ma50', 'ma200', 'goldenCross'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      currentFilters.technical[id] = e.target.checked;
      if (autoUpdate) debounceUpdate();
    });
  });

  // Volume spike slider
  document.getElementById('volumeSpike').addEventListener('input', (e) => {
    currentFilters.technical.volumeSpike = parseFloat(e.target.value);
    document.getElementById('volumeSpikeValue').textContent = parseFloat(e.target.value).toFixed(1);
    if (autoUpdate) debounceUpdate();
  });

  // Fundamental filters
  ['capMicro', 'capSmall', 'capMid', 'capLarge', 'capMega'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      currentFilters.fundamental[id] = e.target.checked;
      if (autoUpdate) debounceUpdate();
    });
  });

  document.getElementById('peRatio').addEventListener('input', (e) => {
    currentFilters.fundamental.peRatio = parseInt(e.target.value);
    document.getElementById('peRatioValue').textContent = e.target.value === '100' ? 'Off' : e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  document.getElementById('earningsGrowth').addEventListener('input', (e) => {
    currentFilters.fundamental.earningsGrowth = parseInt(e.target.value);
    document.getElementById('earningsGrowthValue').textContent = e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  document.getElementById('sectorSelect').addEventListener('change', (e) => {
    currentFilters.fundamental.sector = e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  // Momentum filters
  ['highOI', 'ivRank', 'insiderBuy', 'insiderSell', 'earningsWeek', 'analystUpgrade'].forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      currentFilters.momentum[id] = e.target.checked;
      if (autoUpdate) debounceUpdate();
    });
  });

  document.getElementById('priceMomentum').addEventListener('input', (e) => {
    currentFilters.momentum.priceMomentum = parseInt(e.target.value);
    document.getElementById('priceMomentumValue').textContent = e.target.value;
    if (autoUpdate) debounceUpdate();
  });

  // Filter logic
  document.getElementById('filterLogic').addEventListener('change', (e) => {
    currentFilters.logic = e.target.value;
    if (autoUpdate) updateResults();
  });

  // Sort
  document.getElementById('sortBy').addEventListener('change', (e) => {
    sortBy = e.target.value;
    updateResults();
  });

  // Page size
  document.getElementById('pageSize').addEventListener('change', (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    updateResults();
  });

  // Pagination
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      updateResults();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    const filteredStocks = filterStocks(mockStocks);
    const totalPages = Math.ceil(filteredStocks.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      updateResults();
    }
  });

  // Sortable columns
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.column;
      if (sortBy === column) {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        sortBy = column;
        sortOrder = 'asc';
      }
      updateResults();
    });
  });

  // Empty state clear button
  document.getElementById('emptyStateClear').addEventListener('click', clearAllFilters);
}

let updateTimeout;
function debounceUpdate() {
  clearTimeout(updateTimeout);
  updateTimeout = setTimeout(() => {
    updateResults();
  }, 500);
}

function switchFilterTab(tab) {
  // Update tab states
  document.querySelectorAll('.filter-tab').forEach(t => {
    t.classList.remove('active');
    t.setAttribute('aria-selected', 'false');
  });
  tab.classList.add('active');
  tab.setAttribute('aria-selected', 'true');

  // Show corresponding panel
  const tabId = tab.id;
  const panelId = tabId.replace('-tab', '-panel');
  
  document.querySelectorAll('.filter-content').forEach(panel => {
    panel.hidden = true;
  });
  document.getElementById(panelId).hidden = false;
}

function applyPreset(presetId) {
  const preset = presets[presetId];
  if (!preset) return;

  // Clear current filters
  clearAllFilters(false);

  // Apply preset filters
  if (preset.filters.technical) {
    Object.assign(currentFilters.technical, preset.filters.technical);
    
    // Update UI
    if (preset.filters.technical.rsiMin !== undefined) {
      document.getElementById('rsiMin').value = preset.filters.technical.rsiMin;
      document.getElementById('rsiMinValue').textContent = preset.filters.technical.rsiMin;
    }
    if (preset.filters.technical.rsiMax !== undefined) {
      document.getElementById('rsiMax').value = preset.filters.technical.rsiMax;
      document.getElementById('rsiMaxValue').textContent = preset.filters.technical.rsiMax;
    }
    if (preset.filters.technical.volumeSpike !== undefined) {
      document.getElementById('volumeSpike').value = preset.filters.technical.volumeSpike;
      document.getElementById('volumeSpikeValue').textContent = preset.filters.technical.volumeSpike.toFixed(1);
    }
    if (preset.filters.technical.macdBullish) {
      document.getElementById('macdBullish').checked = true;
    }
    if (preset.filters.technical.ma50) {
      document.getElementById('ma50').checked = true;
    }
  }

  if (preset.filters.fundamental) {
    Object.assign(currentFilters.fundamental, preset.filters.fundamental);
    
    if (preset.filters.fundamental.capLarge) {
      document.getElementById('capLarge').checked = true;
    }
    if (preset.filters.fundamental.capMega) {
      document.getElementById('capMega').checked = true;
    }
    if (preset.filters.fundamental.peRatio !== undefined) {
      document.getElementById('peRatio').value = preset.filters.fundamental.peRatio;
      document.getElementById('peRatioValue').textContent = preset.filters.fundamental.peRatio;
    }
  }

  if (preset.filters.momentum) {
    Object.assign(currentFilters.momentum, preset.filters.momentum);
    
    Object.keys(preset.filters.momentum).forEach(key => {
      const elem = document.getElementById(key);
      if (elem && elem.type === 'checkbox') {
        elem.checked = true;
      }
    });
  }

  // Update preset dropdown label
  document.getElementById('selectedPreset').textContent = preset.name;

  // Update results
  updateResults();
}

function clearAllFilters(updateUI = true) {
  // Reset filters to defaults
  currentFilters = {
    technical: {
      rsiMin: 0,
      rsiMax: 100,
      macdBullish: false,
      macdBearish: false,
      macdNeutral: false,
      ma50: false,
      ma200: false,
      goldenCross: false,
      volumeSpike: 1.0
    },
    fundamental: {
      capMicro: false,
      capSmall: false,
      capMid: true,
      capLarge: true,
      capMega: false,
      peRatio: 100,
      earningsGrowth: 0,
      sector: 'all'
    },
    momentum: {
      highOI: false,
      ivRank: false,
      insiderBuy: false,
      insiderSell: false,
      earningsWeek: false,
      analystUpgrade: false,
      priceMomentum: 0
    },
    logic: 'AND'
  };

  if (updateUI) {
    // Reset all form inputs
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.id === 'capMid' || cb.id === 'capLarge' || cb.id === 'autoUpdate') {
        cb.checked = true;
      } else {
        cb.checked = false;
      }
    });

    document.getElementById('rsiMin').value = 0;
    document.getElementById('rsiMax').value = 100;
    document.getElementById('rsiMinValue').textContent = '0';
    document.getElementById('rsiMaxValue').textContent = '100';
    
    document.getElementById('volumeSpike').value = 1.0;
    document.getElementById('volumeSpikeValue').textContent = '1.0';
    
    document.getElementById('peRatio').value = 100;
    document.getElementById('peRatioValue').textContent = 'Off';
    
    document.getElementById('earningsGrowth').value = 0;
    document.getElementById('earningsGrowthValue').textContent = '0';
    
    document.getElementById('priceMomentum').value = 0;
    document.getElementById('priceMomentumValue').textContent = '0';
    
    document.getElementById('sectorSelect').value = 'all';
    document.getElementById('filterLogic').value = 'AND';
    
    document.getElementById('selectedPreset').textContent = 'All Stocks';

    updateResults();
  }
}

function filterStocks(stocks) {
  return stocks.filter(stock => {
    const technicalMatch = 
      stock.rsi >= currentFilters.technical.rsiMin && 
      stock.rsi <= currentFilters.technical.rsiMax &&
      (!currentFilters.technical.macdBullish || stock.macdSignal === 'bullish') &&
      (!currentFilters.technical.macdBearish || stock.macdSignal === 'bearish') &&
      (!currentFilters.technical.macdNeutral || stock.macdSignal === 'neutral') &&
      (currentFilters.technical.volumeSpike <= 1.0 || (stock.volumeSpike && stock.volumeSpike >= currentFilters.technical.volumeSpike));

    const marketCapMatch = 
      (currentFilters.fundamental.capMicro && stock.marketCap === 'micro') ||
      (currentFilters.fundamental.capSmall && stock.marketCap === 'small') ||
      (currentFilters.fundamental.capMid && stock.marketCap === 'mid') ||
      (currentFilters.fundamental.capLarge && stock.marketCap === 'large') ||
      (currentFilters.fundamental.capMega && stock.marketCap === 'mega');

    const sectorMatch = 
      currentFilters.fundamental.sector === 'all' || 
      stock.sector.toLowerCase() === currentFilters.fundamental.sector;

    const momentumMatch = 
      (!currentFilters.momentum.highOI || stock.catalysts.some(c => c.type === 'high_oi')) &&
      (!currentFilters.momentum.insiderBuy || stock.catalysts.some(c => c.type === 'insider_buy')) &&
      (!currentFilters.momentum.earningsWeek || stock.catalysts.some(c => c.type === 'earnings'));

    const fundamentalMatch = marketCapMatch && sectorMatch;

    if (currentFilters.logic === 'AND') {
      return technicalMatch && fundamentalMatch && momentumMatch;
    } else {
      return technicalMatch || fundamentalMatch || momentumMatch;
    }
  });
}

function sortStocks(stocks) {
  return stocks.sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
}

function updateResults() {
  // Show loading
  const tbody = document.getElementById('resultsBody');
  const skeleton = document.getElementById('skeletonLoader');
  const emptyState = document.getElementById('emptyState');
  
  tbody.innerHTML = '';
  skeleton.hidden = false;
  emptyState.hidden = true;

  // Simulate API delay
  setTimeout(() => {
    const filteredStocks = filterStocks(mockStocks);
    const sortedStocks = sortStocks(filteredStocks);
    const totalResults = filteredStocks.length;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalResults);
    const paginatedStocks = sortedStocks.slice(startIndex, endIndex);

    skeleton.hidden = true;

    // Update results count
    document.getElementById('resultsCount').textContent = totalResults;
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages || 1;

    // Update pagination buttons
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage >= totalPages;

    // Show empty state if no results
    if (totalResults === 0) {
      emptyState.hidden = false;
      updateActiveFilterBadges();
      return;
    }

    // Render rows
    tbody.innerHTML = paginatedStocks.map(stock => `
      <tr>
        <td>
          <div class="stock-symbol">${stock.symbol}</div>
        </td>
        <td>
          <div class="stock-name">${stock.name}</div>
          <div class="stock-sector">${stock.sector} • ${formatMarketCap(stock.marketCap)}</div>
          ${stock.catalysts.length > 0 ? `<div class="catalyst-badge">${stock.catalysts[0].description}</div>` : ''}
        </td>
        <td>
          <div class="stock-price">$${stock.price.toFixed(2)}</div>
        </td>
        <td>
          <div class="stock-change ${stock.changePercent >= 0 ? 'change-positive' : 'change-negative'}">
            ${stock.changePercent >= 0 ? '↑' : '↓'} ${Math.abs(stock.changePercent).toFixed(1)}%
          </div>
          <div class="stock-sector" style="margin-top: 2px;">
            ${stock.changePercent >= 0 ? '+' : ''}$${stock.changeAbsolute.toFixed(2)}
          </div>
        </td>
        <td>
          <div class="rsi-value">${stock.rsi.toFixed(1)}</div>
        </td>
        <td>
          <svg class="mini-chart" width="80" height="30" data-symbol="${stock.symbol}">
            ${generateSparkline()}
          </svg>
        </td>
        <td>
          <button class="view-options-btn" onclick="viewOptions('${stock.symbol}')" aria-label="View options for ${stock.name}">
            Options →
          </button>
        </td>
      </tr>
    `).join('');

    updateActiveFilterBadges();
  }, 300);
}

function formatMarketCap(cap) {
  const caps = {
    micro: 'Micro Cap',
    small: 'Small Cap',
    mid: 'Mid Cap',
    large: 'Large Cap',
    mega: 'Mega Cap'
  };
  return caps[cap] || cap;
}

function generateSparkline() {
  // Generate random 30-day price data for prototype
  const points = 30;
  const width = 80;
  const height = 30;
  const data = Array.from({ length: points }, () => Math.random() * 20 + 10);
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const pathData = data.map((value, index) => {
    const x = (index / (points - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const trend = data[data.length - 1] > data[0] ? '#66bb6a' : '#ef5350';
  
  return `<path d="${pathData}" fill="none" stroke="${trend}" stroke-width="2"/>`;
}

function updateActiveFilterBadges() {
  const badges = document.getElementById('filterBadges');
  const badgesArray = [];

  // Technical filters
  if (currentFilters.technical.rsiMin > 0 || currentFilters.technical.rsiMax < 100) {
    badgesArray.push({ text: `RSI: ${currentFilters.technical.rsiMin}-${currentFilters.technical.rsiMax}`, filter: 'rsi' });
  }
  if (currentFilters.technical.macdBullish) {
    badgesArray.push({ text: 'MACD Bullish ✓', filter: 'macdBullish' });
  }
  if (currentFilters.technical.macdBearish) {
    badgesArray.push({ text: 'MACD Bearish ✓', filter: 'macdBearish' });
  }
  if (currentFilters.technical.ma50) {
    badgesArray.push({ text: 'Price > 50 MA ✓', filter: 'ma50' });
  }
  if (currentFilters.technical.volumeSpike > 1.0) {
    badgesArray.push({ text: `Volume > ${currentFilters.technical.volumeSpike.toFixed(1)}x`, filter: 'volumeSpike' });
  }

  // Fundamental filters
  const caps = [];
  if (currentFilters.fundamental.capMicro) caps.push('Micro');
  if (currentFilters.fundamental.capSmall) caps.push('Small');
  if (currentFilters.fundamental.capMid) caps.push('Mid');
  if (currentFilters.fundamental.capLarge) caps.push('Large');
  if (currentFilters.fundamental.capMega) caps.push('Mega');
  
  // Only show cap filter if not all selected (default state)
  const allCapsSelected = caps.length === 2 && caps.includes('Mid') && caps.includes('Large');
  if (caps.length > 0 && caps.length < 5 && !allCapsSelected) {
    badgesArray.push({ text: `Cap: ${caps.join(', ')}`, filter: 'marketCap' });
  }

  if (currentFilters.fundamental.sector !== 'all') {
    badgesArray.push({ text: `Sector: ${currentFilters.fundamental.sector}`, filter: 'sector' });
  }

  // Momentum filters
  if (currentFilters.momentum.highOI) {
    badgesArray.push({ text: 'High OI ⚠️', filter: 'highOI' });
  }
  if (currentFilters.momentum.insiderBuy) {
    badgesArray.push({ text: 'Insider Buy 👔', filter: 'insiderBuy' });
  }
  if (currentFiltersmomentum.earningsWeek) {
    badgesArray.push({ text: 'Earnings This Week 📅', filter: 'earningsWeek' });
  }

  badges.innerHTML = badgesArray.map(badge => `
    <div class="filter-badge">
      ${badge.text}
      <button class="filter-badge-remove" onclick="removeFilter('${badge.filter}')" aria-label="Remove ${badge.text} filter">✕</button>
    </div>
  `).join('');
}

function removeFilter(filterKey) {
  // Remove specific filter
  switch (filterKey) {
    case 'rsi':
      currentFilters.technical.rsiMin = 0;
      currentFilters.technical.rsiMax = 100;
      document.getElementById('rsiMin').value = 0;
      document.getElementById('rsiMax').value = 100;
      document.getElementById('rsiMinValue').textContent = '0';
      document.getElementById('rsiMaxValue').textContent = '100';
      break;
    case 'macdBullish':
      currentFilters.technical.macdBullish = false;
      document.getElementById('macdBullish').checked = false;
      break;
    case 'macdBearish':
      currentFilters.technical.macdBearish = false;
      document.getElementById('macdBearish').checked = false;
      break;
    case 'ma50':
      currentFilters.technical.ma50 = false;
      document.getElementById('ma50').checked = false;
      break;
    case 'volumeSpike':
      currentFilters.technical.volumeSpike = 1.0;
      document.getElementById('volumeSpike').value = 1.0;
      document.getElementById('volumeSpikeValue').textContent = '1.0';
      break;
    case 'marketCap':
      currentFilters.fundamental.capMid = true;
      currentFilters.fundamental.capLarge = true;
      currentFilters.fundamental.capMicro = false;
      currentFilters.fundamental.capSmall = false;
      currentFilters.fundamental.capMega = false;
      document.getElementById('capMid').checked = true;
      document.getElementById('capLarge').checked = true;
      document.getElementById('capMicro').checked = false;
      document.getElementById('capSmall').checked = false;
      document.getElementById('capMega').checked = false;
      break;
    case 'sector':
      currentFilters.fundamental.sector = 'all';
      document.getElementById('sectorSelect').value = 'all';
      break;
    case 'highOI':
      currentFilters.momentum.highOI = false;
      document.getElementById('highOI').checked = false;
      break;
    case 'insiderBuy':
      currentFilters.momentum.insiderBuy = false;
      document.getElementById('insiderBuy').checked = false;
      break;
    case 'earningsWeek':
      currentFilters.momentum.earningsWeek = false;
      document.getElementById('earningsWeek').checked = false;
      break;
  }

  updateResults();
}

function viewOptions(symbol) {
  console.log(`Navigating to Single Options tab with symbol: ${symbol}`);
  alert(`In production, this would navigate to Single Options tab with ${symbol} pre-filled.`);
}

// Keyboard navigation for accessibility
document.addEventListener('keydown', (e) => {
  // ESC to close dropdown
  if (e.key === 'Escape') {
    const presetMenu = document.getElementById('presetMenu');
    const presetDropdown = document.getElementById('presetDropdown');
    presetMenu.hidden = true;
    presetDropdown.setAttribute('aria-expanded', 'false');
  }
});

console.log('Stock Screener Prototype loaded successfully!');
console.log('Try applying filters, selecting presets, and viewing mini charts.');
