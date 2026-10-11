/**
 * SCEAS ⚡ Smart Campus Energy Analytics System
 * Frontend Logic, Multi-View Navigation, Global Filters, Combined Forecast Line & Comprehensive Analytics
 */

let combinedTrendChart = null;
let buildingChart = null;
let peakChart = null;
let analyticsBuildingChart = null;
let analyticsPeakChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchDashboardData();
    syncLiveTemperature();
    runSimulation();
});

// --- Tab View Navigation ---
function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.getElementById(`nav-${viewName}`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // Re-trigger chart render on view switch
    if (viewName === 'analytics') {
        fetchDashboardData();
    }
}

// --- Sidebar Collapse / Expand Toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const icon = document.getElementById('sidebar-icon');
    
    sidebar.classList.toggle('collapsed');

    if (sidebar.classList.contains('collapsed')) {
        icon.className = 'fa-solid fa-chevron-right';
    } else {
        icon.className = 'fa-solid fa-chevron-left';
    }
}

// --- Theme Switcher ---
function initTheme() {
    const savedTheme = localStorage.getItem('campus_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeUI(savedTheme);
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('campus_theme', newTheme);
    updateThemeUI(newTheme);

    if (combinedTrendChart) fetchDashboardData();
}

function updateThemeUI(theme) {
    const icon = document.getElementById('theme-icon');
    if (!icon) return;

    if (theme === 'light') {
        icon.className = 'fa-solid fa-sun';
    } else {
        icon.className = 'fa-solid fa-moon';
    }
}

// --- Global Filter Change Event Handler ---
function onGlobalFilterChange() {
    fetchDashboardData();
}

// --- Live Weather Sync ---
async function syncLiveTemperature() {
    try {
        const tempSpan = document.getElementById('live-campus-temp');
        if (tempSpan) tempSpan.innerText = 'Syncing...';

        const response = await fetch('/api/live-weather');
        const data = await response.json();

        if (data.success) {
            if (tempSpan) tempSpan.innerText = `${data.temperature}°C`;
            const tempInput = document.getElementById('pred-temp');
            const tempVal = document.getElementById('temp-val');
            if (tempInput && tempVal) {
                tempInput.value = data.temperature;
                tempVal.innerText = `${data.temperature}°C`;
            }
        }
    } catch (err) {
        console.error('Weather Sync Error:', err);
    }
}

// --- Fetch Dashboard Summary Data with Scoped Global Filters ---
async function fetchDashboardData() {
    try {
        const building_id = document.getElementById('global-building-filter').value;
        const range_val = document.getElementById('global-date-range').value;

        const response = await fetch(`/api/dashboard?building_id=${building_id}&range=${range_val}`);
        const data = await response.json();

        if (response.ok) {
            updateKPICards(data.metrics);
            renderCombinedTrendChart(data.combined_trend);
            renderBuildingChart(data.building_breakdown);
            renderPeakChart(data.peak_distribution);
            renderAnomalies(data.anomalies);
            renderPeakInsights(data.building_peaks);
            
            // Render Analytics View Charts & Audit Table
            renderAnalyticsBuildingChart(data.building_breakdown);
            renderAnalyticsPeakChart(data.peak_distribution);
            renderAnalyticsAnomaliesTable(data.anomalies);
        } else {
            console.error('Failed to load dashboard data:', data.error);
        }
    } catch (err) {
        console.error('API Error:', err);
    }
}

function updateKPICards(metrics) {
    document.getElementById('metric-total-kwh').innerHTML = `${metrics.total_kwh.toLocaleString()} <small>kWh</small>`;
    document.getElementById('metric-cost').innerText = `₹${metrics.cost_inr.toLocaleString()}`;
    document.getElementById('metric-co2').innerHTML = `${metrics.co2_kg.toLocaleString()} <small>kg</small>`;
    document.getElementById('metric-buildings-count').innerHTML = `${metrics.buildings_count} <small>facilities</small>`;
    document.getElementById('metric-peak-kw').innerText = `${metrics.peak_kw} kW`;
}

// --- Combined Line Chart: Actuals (Solid) + ML Forecast (Dashed) ---
function getChartTextColor() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? '#475569' : '#94A3B8';
}

function renderCombinedTrendChart(trendData) {
    const ctx = document.getElementById('combinedTrendChart').getContext('2d');
    const textColor = getChartTextColor();

    if (combinedTrendChart) combinedTrendChart.destroy();

    combinedTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: trendData.labels,
            datasets: [
                {
                    label: 'Actual Consumption (kWh)',
                    data: trendData.actuals,
                    borderColor: '#38BDF8',
                    borderWidth: 3,
                    fill: false,
                    tension: 0.35,
                    pointBackgroundColor: '#38BDF8',
                    pointRadius: 4
                },
                {
                    label: 'Scikit-Learn ML Forecast (kWh)',
                    data: trendData.forecast,
                    borderColor: '#A855F7',
                    borderWidth: 3,
                    borderDash: [6, 6],
                    fill: false,
                    tension: 0.35,
                    pointBackgroundColor: '#A855F7',
                    pointRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1E293B',
                    titleColor: '#F8FAFC',
                    bodyColor: '#38BDF8',
                    padding: 12
                }
            },
            scales: {
                x: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: textColor } },
                y: { grid: { color: 'rgba(148, 163, 184, 0.1)' }, ticks: { color: textColor } }
            }
        }
    });
}

function renderBuildingChart(buildingData) {
    const ctx = document.getElementById('buildingChart').getContext('2d');
    const textColor = getChartTextColor();

    if (buildingChart) buildingChart.destroy();

    buildingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buildingData.labels,
            datasets: [{
                label: 'Consumption (kWh)',
                data: buildingData.data,
                backgroundColor: '#38BDF8',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: textColor, font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });
}

function renderPeakChart(peakData) {
    const ctx = document.getElementById('peakChart').getContext('2d');
    const textColor = getChartTextColor();

    if (peakChart) peakChart.destroy();

    peakChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(peakData),
            datasets: [{
                data: Object.values(peakData),
                backgroundColor: ['#F59E0B', '#10B981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 } } }
            },
            cutout: '70%'
        }
    });
}

// --- Render Visual Analytics Charts (Analytics Tab) ---
function renderAnalyticsBuildingChart(buildingData) {
    const el = document.getElementById('analyticsBuildingChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    const textColor = getChartTextColor();

    if (analyticsBuildingChart) analyticsBuildingChart.destroy();

    analyticsBuildingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buildingData.labels,
            datasets: [{
                label: 'Building Energy Usage (kWh)',
                data: buildingData.data,
                backgroundColor: [
                    '#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'
                ],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: textColor }, grid: { display: false } },
                y: { ticks: { color: textColor }, grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });
}

function renderAnalyticsPeakChart(peakData) {
    const el = document.getElementById('analyticsPeakChart');
    if (!el) return;
    const ctx = el.getContext('2d');
    const textColor = getChartTextColor();

    if (analyticsPeakChart) analyticsPeakChart.destroy();

    analyticsPeakChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(peakData),
            datasets: [{
                data: Object.values(peakData),
                backgroundColor: ['#F59E0B', '#10B981'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, font: { size: 12 } } }
            }
        }
    });
}

function renderAnomalies(anomalies) {
    const container = document.getElementById('anomalyList');
    if (!anomalies || anomalies.length === 0) {
        container.innerHTML = '<div class="anomaly-item" style="color: #10B981;"><i class="fa-solid fa-circle-check"></i> All campus building readings within baseline benchmarks.</div>';
        return;
    }

    container.innerHTML = anomalies.slice(0, 3).map(a => `
        <div class="anomaly-item">
            <i class="fa-solid fa-triangle-exclamation" style="color: #EF4444;"></i>
            <div>
                <strong>${a.building}</strong>
                <p style="color: var(--text-muted); font-size: 11px;">${a.message}</p>
            </div>
        </div>
    `).join('');
}

function renderAnalyticsAnomaliesTable(anomalies) {
    const tbody = document.getElementById('analyticsAnomalyTableBody');
    if (!tbody) return;

    if (!anomalies || anomalies.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #10B981;">No active energy anomalies detected across campus facilities.</td></tr>';
        return;
    }

    tbody.innerHTML = anomalies.map(a => `
        <tr>
            <td><strong>${a.building}</strong></td>
            <td><span class="anomaly-tag">${a.type}</span></td>
            <td>${a.message}</td>
            <td><span style="color: ${a.severity === 'high' ? '#EF4444' : '#F59E0B'}; font-weight: 600;">Flagged</span></td>
        </tr>
    `).join('');
}

function renderPeakInsights(peaks) {
    const container = document.getElementById('peakInsightsList');
    if (!peaks || peaks.length === 0) {
        container.innerHTML = '<p class="text-muted">Calculating peak demand insights...</p>';
        return;
    }

    container.innerHTML = peaks.map(p => `
        <div class="peak-card">
            <h4>${p.building_name}</h4>
            <div class="peak-hour"><i class="fa-solid fa-clock"></i> Peak Hour: ${p.hour_str}</div>
            <p>Avg Peak Demand: <strong>${Math.round(p.consumption_kwh * 10) / 10} kWh</strong>. Stagger HVAC operations by 45 mins.</p>
        </div>
    `).join('');
}

// --- Predict Energy Demand Endpoint ---
async function predictEnergy() {
    const building_id = document.getElementById('pred-building').value;
    const temperature = document.getElementById('pred-temp').value;
    const occupancy = document.getElementById('pred-occ').value;
    const hour = document.getElementById('pred-hour').value;
    const academic_status = document.getElementById('pred-calendar').value;

    const payload = {
        building_id: parseInt(building_id),
        temperature: parseFloat(temperature),
        humidity: 65.0,
        occupancy: parseInt(occupancy),
        hour: parseInt(hour),
        academic_status: parseInt(academic_status),
        is_weekend: academic_status === '2' ? 1 : 0
    };

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            document.getElementById('res-kwh').innerHTML = `${data.predicted_kwh} <small>kWh</small>`;
            document.getElementById('res-cost').innerText = `₹${data.est_cost_inr.toLocaleString()}`;
            document.getElementById('res-carbon').innerText = `${data.carbon_kg.toLocaleString()} kg CO₂`;
            document.getElementById('res-recommendation').innerText = data.recommendation;

            document.getElementById('predictionResult').classList.remove('hidden');
        } else {
            alert('Prediction error: ' + data.error);
        }
    } catch (err) {
        console.error('Prediction failed:', err);
    }
}

// --- Interactive What-If Simulator ---
async function runSimulation() {
    const building_id = document.getElementById('sim-building').value;
    const reduction_pct = document.getElementById('sim-reduction').value;

    try {
        const res = await fetch('/api/simulate-savings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ building_id: parseInt(building_id), reduction_pct: parseFloat(reduction_pct) })
        });
        const data = await res.json();
        if (data.success) {
            document.getElementById('sim-cost-save').innerText = `₹${data.saved_cost_inr.toLocaleString()}`;
            document.getElementById('sim-kwh-save').innerText = `${data.saved_kwh.toLocaleString()} kWh`;
            document.getElementById('sim-co2-save').innerText = `${data.saved_co2_kg.toLocaleString()} kg`;
        }
    } catch (err) {
        console.error('Simulation error:', err);
    }
}
