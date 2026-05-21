// app.js - Main Application Logic (Backend Integration)

// DOM Elements
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const saveApiBtn = document.getElementById('saveApiBtn');
const apiKeyInput = document.getElementById('apiKeyInput');
const logoutBtn = document.getElementById('logoutBtn');
const welcomeUser = document.getElementById('welcomeUser');
const projectedValueEl = document.getElementById('projectedValue');

const addHoldingForm = document.getElementById('addHoldingForm');
const holdingsTableBody = document.querySelector('#holdingsTable tbody');
const emptyStateRow = document.getElementById('emptyStateRow');
const refreshDataBtn = document.getElementById('refreshDataBtn');

const totalValueEl = document.getElementById('totalValue');
const totalPLEl = document.getElementById('totalPL');
const totalPLPercentEl = document.getElementById('totalPLPercent');
const dailyPLEl = document.getElementById('dailyPL');
const dailyPLPercentEl = document.getElementById('dailyPLPercent');

// State
let apiKey = '';
let holdings = [];
let pricesCache = {}; 
let predictionsCache = {};

// Initialization
async function init() {
    try {
        const userRes = await fetch('/api/user');
        if (!userRes.ok) {
            window.location.href = '/login';
            return;
        }
        
        const userData = await userRes.json();
        welcomeUser.textContent = `Hello, ${userData.username}`;
        
        if (userData.finnhub_api_key) {
            apiKey = userData.finnhub_api_key;
            apiKeyInput.value = apiKey;
        } else {
            settingsModal.classList.add('active');
        }
        
        await loadHoldings();
    } catch (e) {
        console.error("Init error", e);
    }
}

async function loadHoldings() {
    const res = await fetch('/api/holdings');
    if (res.ok) {
        holdings = await res.json();
        await refreshData();
    }
}

// Event Listeners
logoutBtn.addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
});

openSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

saveApiBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        apiKey = key;
        await fetch('/api/user/apikey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: key })
        });
        settingsModal.classList.remove('active');
        refreshData();
    }
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal && apiKey) { 
        settingsModal.classList.remove('active');
    }
});

addHoldingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!apiKey) {
        alert("Please set your API key in settings first.");
        settingsModal.classList.add('active');
        return;
    }
    
    const tickerInput = document.getElementById('ticker');
    const sharesInput = document.getElementById('shares');
    const buyPriceInput = document.getElementById('buyPrice');
    
    const ticker = tickerInput.value.trim().toUpperCase();
    const shares = parseFloat(sharesInput.value);
    const buyPrice = parseFloat(buyPriceInput.value);
    
    if (!ticker || isNaN(shares) || isNaN(buyPrice)) return;
    
    const priceData = await fetchPrice(ticker);
    if (!priceData || priceData.currentPrice === 0) {
        alert(`Could not find valid price data for ticker: ${ticker}. Please check the symbol.`);
        return;
    }
    
    const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, shares, buyPrice })
    });
    
    if (res.ok) {
        const data = await res.json();
        holdings.push(data.holding);
        
        tickerInput.value = '';
        sharesInput.value = '';
        buyPriceInput.value = '';
        
        refreshData();
    }
});

refreshDataBtn.addEventListener('click', refreshData);

async function deleteHolding(id) {
    const res = await fetch(`/api/holdings/${id}`, { method: 'DELETE' });
    if (res.ok) {
        holdings = holdings.filter(h => h.id != id);
        refreshData();
    }
}

async function fetchPrice(ticker) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.c === 0 && data.pc === 0) return null; 
        
        return {
            currentPrice: data.c,
            dailyChange: data.d,
            prevClose: data.pc
        };
    } catch (error) {
        console.error("Error fetching price for", ticker, error);
        return null;
    }
}

async function fetchPrediction(ticker) {
    if (predictionsCache[ticker]) return predictionsCache[ticker];
    try {
        const res = await fetch(`/api/predict/rsi/${ticker}`);
        if (res.ok) {
            const data = await res.json();
            predictionsCache[ticker] = data;
            return data;
        }
    } catch (e) { console.error(e); }
    return null;
}

async function fetchProjection() {
    try {
        const res = await fetch('/api/predict/projection');
        if (res.ok) {
            const data = await res.json();
            projectedValueEl.textContent = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(data.projected_5_year);
        }
    } catch (e) { console.error(e); }
}

async function refreshData(isSilent = false) {
    if (!apiKey || holdings.length === 0) {
        updateUI();
        renderAllocationChart([]);
        return;
    }
    
    if (!isSilent) {
        refreshDataBtn.style.opacity = '0.5';
        projectedValueEl.textContent = 'Loading...';
    }
    
    const uniqueTickers = [...new Set(holdings.map(h => h.ticker))];
    const fetchPromises = uniqueTickers.map(ticker => fetchPrice(ticker).then(data => {
        if (data) pricesCache[ticker] = data;
    }));
    
    const predictionPromises = uniqueTickers.map(ticker => fetchPrediction(ticker));
    
    await Promise.all([...fetchPromises, ...predictionPromises, fetchProjection()]);
    
    if (!isSilent) {
        refreshDataBtn.style.opacity = '1';
    }
    updateUI();
}

// Real-time polling
setInterval(() => {
    if (apiKey && holdings.length > 0) {
        refreshData(true);
    }
}, 10000); // Auto-refresh every 10 seconds

function updateUI() {
    let totalValue = 0;
    let totalCostBase = 0;
    let dailyChangeTotal = 0;
    let totalPrevValue = 0;
    
    const enrichedHoldings = holdings.map(holding => {
        const priceData = pricesCache[holding.ticker] || { currentPrice: holding.buyPrice, dailyChange: 0, prevClose: holding.buyPrice };
        
        const currentValue = holding.shares * priceData.currentPrice;
        const costBase = holding.shares * holding.buyPrice;
        const pl = currentValue - costBase;
        const plPercent = costBase > 0 ? (pl / costBase) * 100 : 0;
        
        totalValue += currentValue;
        totalCostBase += costBase;
        dailyChangeTotal += (holding.shares * priceData.dailyChange);
        totalPrevValue += (holding.shares * priceData.prevClose);
        
        return {
            ...holding,
            currentPrice: priceData.currentPrice,
            currentValue,
            pl,
            plPercent,
            dailyChange: priceData.dailyChange
        };
    });
    
    enrichedHoldings.sort((a, b) => b.currentValue - a.currentValue);
    
    renderTable(enrichedHoldings);
    renderAllocationChart(enrichedHoldings);
    
    const totalPL = totalValue - totalCostBase;
    const totalPLPercent = totalCostBase > 0 ? (totalPL / totalCostBase) * 100 : 0;
    const dailyPLPercent = totalPrevValue > 0 ? (dailyChangeTotal / totalPrevValue) * 100 : 0;
    
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
    
    totalValueEl.textContent = formatCurrency(totalValue);
    
    totalPLEl.textContent = formatCurrency(totalPL);
    totalPLEl.className = `stat-value ${totalPL >= 0 ? 'text-profit' : 'text-loss'}`;
    if (totalCostBase === 0) totalPLEl.className = 'stat-value text-neutral';
    
    totalPLPercentEl.textContent = formatPercent(totalPLPercent);
    totalPLPercentEl.className = `stat-change ${totalPLPercent >= 0 ? 'text-profit' : 'text-loss'}`;
    if (totalCostBase === 0) totalPLPercentEl.className = 'stat-change text-neutral';
    
    dailyPLEl.textContent = formatCurrency(dailyChangeTotal);
    dailyPLEl.className = `stat-value ${dailyChangeTotal >= 0 ? 'text-profit' : 'text-loss'}`;
    if (totalCostBase === 0) dailyPLEl.className = 'stat-value text-neutral';
    
    dailyPLPercentEl.textContent = formatPercent(dailyPLPercent);
    dailyPLPercentEl.className = `stat-change ${dailyPLPercent >= 0 ? 'text-profit' : 'text-loss'}`;
    if (totalCostBase === 0) dailyPLPercentEl.className = 'stat-change text-neutral';
}

const stockChartModal = document.getElementById('stockChartModal');
const closeChartModalBtn = document.getElementById('closeChartModalBtn');
const chartModalTitle = document.getElementById('chartModalTitle');

closeChartModalBtn.addEventListener('click', () => {
    stockChartModal.classList.remove('active');
});

stockChartModal.addEventListener('click', (e) => {
    if (e.target === stockChartModal) { 
        stockChartModal.classList.remove('active');
    }
});

async function openStockChart(ticker) {
    chartModalTitle.textContent = `${ticker} - 6 Month History`;
    stockChartModal.classList.add('active');
    
    try {
        const response = await fetch(`/api/history/${ticker}`);
        if (!response.ok) throw new Error('API error');
        
        const data = await response.json();
        
        if (data.t && data.c) {
            renderStockHistoryChart(ticker, data.t, data.c);
        } else {
            alert('Could not load historical data for ' + ticker);
        }
    } catch (e) {
        console.error(e);
        alert('Error loading chart data.');
    }
}

window.openStockChart = openStockChart;

function renderTable(enrichedHoldings) {
    holdingsTableBody.innerHTML = '';
    
    if (enrichedHoldings.length === 0) {
        holdingsTableBody.appendChild(emptyStateRow);
        return;
    }
    
    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    const formatPercent = (val) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
    
    enrichedHoldings.forEach(h => {
        const tr = document.createElement('tr');
        
        const plClass = h.pl >= 0 ? 'text-profit' : 'text-loss';
        const pred = predictionsCache[h.ticker];
        
        let signalHtml = `<span class="text-neutral">N/A</span>`;
        if (pred) {
            let color = 'text-neutral';
            if (pred.signal.includes('BUY')) color = 'text-profit';
            if (pred.signal.includes('SELL')) color = 'text-loss';
            signalHtml = `<span class="${color}" style="font-weight: 600;">${pred.signal}</span> <div style="font-size:0.75rem" class="text-muted">RSI: ${pred.rsi}</div>`;
        }
        
        tr.innerHTML = `
            <td class="ticker-cell">${h.ticker}</td>
            <td>${h.shares.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})}</td>
            <td>${formatCurrency(h.buyPrice)}</td>
            <td>${formatCurrency(h.currentPrice)}</td>
            <td>${formatCurrency(h.currentValue)}</td>
            <td class="${plClass}">
                <div>${formatCurrency(h.pl)}</div>
                <div style="font-size: 0.75rem">${formatPercent(h.plPercent)}</div>
            </td>
            <td>${signalHtml}</td>
            <td>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-secondary btn-icon" onclick="openStockChart('${h.ticker}')" title="View Chart">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteHolding('${h.id}')" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </td>
        `;
        
        holdingsTableBody.appendChild(tr);
    });
}

window.deleteHolding = deleteHolding;

document.addEventListener('DOMContentLoaded', init);
