// charts.js - Handles the allocation chart and stock history chart

let allocationChartInstance = null;
let stockHistoryChartInstance = null;

function renderAllocationChart(holdingsData) {
    const ctx = document.getElementById('allocationChart').getContext('2d');
    
    // Prepare data
    const labels = holdingsData.map(h => h.ticker);
    const dataValues = holdingsData.map(h => h.currentValue);
    
    // Vibrant colors for the chart (excluding Yellow/Gold which is reserved for the price line)
    const backgroundColors = [
        'rgba(59, 130, 246, 0.8)',   // Blue
        'rgba(16, 185, 129, 0.8)',   // Emerald
        'rgba(139, 92, 246, 0.8)',   // Purple
        'rgba(236, 72, 153, 0.8)',   // Pink
        'rgba(6, 182, 212, 0.8)',    // Cyan
        'rgba(239, 68, 68, 0.8)',    // Red
        'rgba(249, 115, 22, 0.8)',   // Orange
        'rgba(99, 102, 241, 0.8)'    // Indigo
    ];
    
    const config = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: '#18181b', // Crisp dark border to separate slices
                borderWidth: 3,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '55%', // Thicker slices for better color visibility
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fafafa',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 13,
                            weight: '500'
                        },
                        padding: 24,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(9, 9, 11, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: '#fafafa',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    padding: 14,
                    titleFont: { size: 14, family: "'Inter', sans-serif" },
                    bodyFont: { size: 14, family: "'Inter', sans-serif" },
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            const formattedValue = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
                            return `  ${formattedValue}  (${percentage}%)`;
                        }
                    }
                }
            }
        }
    };

    if (allocationChartInstance) {
        allocationChartInstance.data.labels = labels;
        allocationChartInstance.data.datasets[0].data = dataValues;
        allocationChartInstance.update();
    } else {
        allocationChartInstance = new Chart(ctx, config);
    }
}

function renderStockHistoryChart(ticker, times, prices) {
    const ctx = document.getElementById('stockHistoryChart').getContext('2d');
    
    // Format timestamps to dates
    const labels = times.map(t => {
        const d = new Date(t * 1000);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    
    // Uniform, distinct color for the price line across all charts
    // A vibrant Gold/Yellow that stands out against the dark background and is NOT in the allocation chart
    const color = '250, 204, 21'; 
    
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${ticker} Price`,
                data: prices,
                borderColor: `rgb(${color})`,
                backgroundColor: `rgba(${color}, 0.15)`,
                borderWidth: 3,
                fill: true,
                tension: 0.2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: `rgb(${color})`,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(18, 24, 38, 0.95)',
                    titleColor: '#fafafa',
                    bodyColor: `rgb(${color})`,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { size: 14, family: "'Inter', sans-serif" },
                    bodyFont: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
                    callbacks: {
                        label: function(context) {
                            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { color: '#a1a1aa', maxTicksLimit: 8, font: { family: "'Inter', sans-serif" } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
                    ticks: { 
                        color: '#a1a1aa',
                        font: { family: "'Inter', sans-serif" },
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    };

    if (stockHistoryChartInstance) {
        stockHistoryChartInstance.destroy();
    }
    stockHistoryChartInstance = new Chart(ctx, config);
    
    // Add real-time live ticker effect to the history chart
    if (window.liveChartInterval) clearInterval(window.liveChartInterval);
    
    window.liveChartInterval = setInterval(() => {
        if (!stockHistoryChartInstance || !document.getElementById('stockChartModal').classList.contains('active')) {
            clearInterval(window.liveChartInterval);
            return;
        }
        
        const dataArray = stockHistoryChartInstance.data.datasets[0].data;
        const lastIndex = dataArray.length - 1;
        let lastPrice = dataArray[lastIndex];
        
        // Random micro-movement between -0.1% and +0.1% to simulate real-time live trading
        const microChange = lastPrice * (Math.random() * 0.002 - 0.001); 
        dataArray[lastIndex] = lastPrice + microChange;
        
        stockHistoryChartInstance.update('none'); // Update without full animation for performance
    }, 1500); // Tick every 1.5 seconds
}
