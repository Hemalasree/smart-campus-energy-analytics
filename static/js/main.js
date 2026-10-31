/**
 * SCEAS ⚡ Smart Campus Energy Analytics System
 * Frontend Logic, Multi-View Navigation, Global Filters, Combined Forecast Line & Comprehensive Analytics
 */

let combinedTrendChart = null;
let buildingChart = null;
let peakChart = null;
let analyticsBuildingChart = null;
let analyticsPeakChart = null;
let solarOffsetChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    fetchDashboardData();
    syncLiveTemperature();
    runSimulation();
    loadRecommendations();
    loadAlerts();

    // Silently poll live recommendations, alerts, and counters every 45s
    setInterval(() => {
        loadRecommendations(false);
        loadAlerts(false);
    }, 45000);
});

// --- Tab View Navigation ---
function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const targetView = document.getElementById(`view-${viewName}`);
    const targetNav = document.getElementById(`nav-${viewName}`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // Trigger data refresh on view switch
    if (viewName === 'analytics') {
        fetchDashboardData();
        loadAlerts();
    } else if (viewName === 'profile') {
        loadUserProfile();
    } else if (viewName === 'users') {
        loadUsersList();
    } else if (viewName === 'recommendations') {
        loadRecommendations();
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
            if (data.solar) updateSolarUI(data.solar);
            renderCombinedTrendChart(data.combined_trend);
            renderBuildingChart(data.building_breakdown);
            renderPeakChart(data.peak_distribution);
            renderAnomalies(data.anomalies);
            renderPeakInsights(data.building_peaks);
            
            // Render Analytics View Charts & Audit Table
            renderAnalyticsBuildingChart(data.building_breakdown);
            renderAnalyticsPeakChart(data.peak_distribution);
            renderAnalyticsAnomaliesTable(data.anomalies);
            if (data.eui_ratings) {
                renderBuildingStarRatings(data.eui_ratings, data.campus_avg_eui, data.top_facility);
            }
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

    const selectedId = buildingData.selected_building_id || 0;
    const bgColors = buildingData.building_ids ? buildingData.building_ids.map(id => {
        if (selectedId === 0) return '#38BDF8';
        return id === selectedId ? '#38BDF8' : 'rgba(56, 189, 248, 0.25)';
    }) : '#38BDF8';

    const borderColors = buildingData.building_ids ? buildingData.building_ids.map(id => {
        return id === selectedId ? '#0284C7' : 'transparent';
    }) : 'transparent';

    buildingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buildingData.labels,
            datasets: [{
                label: 'Consumption (kWh)',
                data: buildingData.data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: selectedId > 0 ? 1.5 : 0,
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

// --- Rooftop Solar PV & Net-Metering Offset Visualization ---
function updateSolarUI(solar) {
    const elGen = document.getElementById('solar-metric-gen');
    const elPeak = document.getElementById('solar-metric-peak');
    const elSavings = document.getElementById('solar-metric-savings');
    const elShare = document.getElementById('solar-metric-share');
    const elCo2 = document.getElementById('solar-metric-co2');

    if (elGen) elGen.innerHTML = `${solar.total_generated_kwh.toLocaleString()} <small>kWh</small>`;
    if (elPeak) elPeak.innerText = `${solar.peak_generation_kw} kW`;
    if (elSavings) elSavings.innerText = `₹${solar.cost_savings_inr.toLocaleString()}`;
    if (elShare) elShare.innerText = `${solar.clean_energy_share}%`;
    if (elCo2) elCo2.innerHTML = `${solar.co2_offset_kg.toLocaleString()} <small>kg</small>`;

    renderSolarChart(solar);
}

function renderSolarChart(solar) {
    const el = document.getElementById('solarOffsetChart');
    if (!el) return;
    const ctx = el.getContext('2d');

    if (solarOffsetChart) solarOffsetChart.destroy();

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.05)';
    const textColor = isLight ? '#64748B' : '#94A3B8';

    solarOffsetChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: solar.hourly_labels,
            datasets: [
                {
                    label: '☀️ Rooftop Solar Generation (kWh)',
                    data: solar.hourly_solar,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.22)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointRadius: 2,
                    pointHoverRadius: 5
                },
                {
                    label: '⚡ Gross Campus Demand (kWh)',
                    data: solar.hourly_gross,
                    borderColor: '#38BDF8',
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5
                },
                {
                    label: '🔌 Net Grid Draw (Utility kWh)',
                    data: solar.hourly_net_grid,
                    borderColor: '#10B981',
                    borderDash: [5, 4],
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.3,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: textColor, boxWidth: 14, font: { family: 'Outfit', size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        footer: function(tooltipItems) {
                            let solarVal = 0;
                            let grossVal = 0;
                            tooltipItems.forEach(function(tooltipItem) {
                                if (tooltipItem.datasetIndex === 0) solarVal = tooltipItem.parsed.y;
                                if (tooltipItem.datasetIndex === 1) grossVal = tooltipItem.parsed.y;
                            });
                            if (grossVal > 0) {
                                const offsetPct = ((solarVal / grossVal) * 100).toFixed(1);
                                return `Midday Solar Offset: ${offsetPct}%`;
                            }
                            return '';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: textColor,
                        font: { family: 'Outfit', size: 11 },
                        callback: val => `${val} kWh`
                    }
                }
            }
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

    const defaultColors = ['#38BDF8', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#6366F1'];
    const selectedId = buildingData.selected_building_id || 0;
    const bgColors = buildingData.building_ids ? buildingData.building_ids.map((id, idx) => {
        if (selectedId === 0) return defaultColors[idx % defaultColors.length];
        return id === selectedId ? defaultColors[idx % defaultColors.length] : 'rgba(148, 163, 184, 0.22)';
    }) : defaultColors;

    analyticsBuildingChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: buildingData.labels,
            datasets: [{
                label: 'Building Energy Usage (kWh)',
                data: buildingData.data,
                backgroundColor: bgColors,
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

// --- Campus Building Energy Star & EUI Rating Visualizer ---
function renderBuildingStarRatings(euiRatings, campusAvgEui, topFacility) {
    const avgBadge = document.getElementById('campusAvgEuiBadge');
    const topBadge = document.getElementById('topFacilityBadge');
    const grid = document.getElementById('buildingEuiGrid');

    if (avgBadge && campusAvgEui) {
        avgBadge.innerText = `${campusAvgEui} kWh/sq.ft`;
    }
    if (topBadge && topFacility && topFacility.building_name) {
        topBadge.innerText = `${topFacility.building_name} (${topFacility.eui} EUI)`;
    }

    if (!grid || !euiRatings || euiRatings.length === 0) return;

    grid.innerHTML = euiRatings.map(b => {
        const meterPct = Math.min(100, Math.max(15, (b.eui / 6.0) * 100));
        const isSelected = b.is_selected;
        const cardStyle = isSelected
            ? `background: var(--card-bg); border: 2px solid #38BDF8; border-top: 4px solid ${b.badge_color}; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.35); transform: translateY(-2px); transition: all 0.25s ease;`
            : `background: var(--card-bg); border: 1px solid var(--card-border); border-top: 3px solid ${b.badge_color}; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); transition: all 0.25s ease;`;

        const activeTag = isSelected
            ? `<span style="background: #38BDF8; color: #0F172A; font-weight: 700; font-size: 10px; padding: 2px 7px; border-radius: 5px; margin-left: 6px; letter-spacing: 0.5px;"><i class="fa-solid fa-crosshairs"></i> SELECTED</span>`
            : '';

        return `
            <div class="eui-building-card" style="${cardStyle}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 2px; display: flex; align-items: center;">${b.building_name} ${activeTag}</h4>
                        <span style="font-size: 11px; color: var(--text-muted);">${b.building_type} · ${b.area_sqft.toLocaleString()} sq.ft</span>
                    </div>
                    <span class="role-badge" style="background: ${b.badge_color}22; color: ${b.badge_color}; border: 1px solid ${b.badge_color}44; font-weight: 700; font-size: 12px; padding: 3px 8px;">
                        ${b.rating_class}
                    </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 2px;">
                    <div>
                        <div style="font-size: 18px; letter-spacing: 2px;">${b.star_icons}</div>
                        <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">${b.label}</span>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 20px; font-weight: 700; color: ${b.badge_color};">${b.eui}</span>
                        <div style="font-size: 10px; color: var(--text-muted);">kWh / sq.ft / mo</div>
                    </div>
                </div>

                <!-- EUI Energy Intensity Bar -->
                <div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                        <span>Intensity Meter</span>
                        <span>${b.monthly_kwh.toLocaleString()} kWh/mo</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden;">
                        <div style="width: ${meterPct}%; height: 100%; background: ${b.badge_color}; border-radius: 6px;"></div>
                    </div>
                </div>

                <div style="font-size: 11px; color: var(--text-muted); background: rgba(255,255,255,0.02); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--card-border);">
                    <i class="fa-solid fa-circle-info" style="color: ${b.badge_color}; margin-right: 4px;"></i> ${b.recommendation}
                </div>
            </div>
        `;
    }).join('');
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

// --- Universal CSV Upload & Processing Engine ---
function onCsvFileSelected(input) {
    const badge = document.getElementById('fileSelectedBadge');
    const nameSpan = document.getElementById('selectedFileName');
    if (input.files && input.files[0]) {
        nameSpan.innerText = `${input.files[0].name} (${(input.files[0].size / 1024).toFixed(1)} KB)`;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

async function uploadAndProcessCsv() {
    const fileInput = document.getElementById('csvFileInput');
    const btn = document.getElementById('btnProcessDataset');

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please select a CSV file first before clicking Process Dataset.');
        return;
    }

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const origBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing & Training...';

    try {
        const res = await fetch('/api/upload-csv', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.success) {
            // Populate summary metrics
            document.getElementById('uploadSuccessMessage').innerText = data.message;
            document.getElementById('upload-res-records').innerText = data.summary.records_processed.toLocaleString();
            document.getElementById('upload-res-kwh').innerText = `${data.summary.total_kwh.toLocaleString()} kWh`;
            document.getElementById('upload-res-cost').innerText = `Est. ₹${data.summary.cost_inr.toLocaleString()} | ${data.summary.co2_kg.toLocaleString()} kg CO₂`;
            document.getElementById('upload-res-range').innerText = data.summary.date_range;
            document.getElementById('upload-res-r2').innerText = `R² ${data.summary.retrained_r2}`;

            // Populate preview table
            const tbody = document.getElementById('csvPreviewTableBody');
            if (tbody && data.preview) {
                tbody.innerHTML = data.preview.map(row => `
                    <tr>
                        <td><strong>${row.building}</strong></td>
                        <td>${row.timestamp}</td>
                        <td><span style="color: var(--primary); font-weight: 600;">${row.consumption_kwh.toLocaleString()} kWh</span></td>
                        <td>${row.peak_demand_kw} kW</td>
                        <td>${row.temperature_c}°C</td>
                        <td>₹${row.cost_inr.toLocaleString()}</td>
                    </tr>
                `).join('');
            }

            // Show results container
            const resContainer = document.getElementById('uploadResultsContainer');
            if (resContainer) {
                resContainer.style.display = 'block';
                resContainer.scrollIntoView({ behavior: 'smooth' });
            }

            // Refresh global dashboard data in background
            fetchDashboardData();
        } else {
            alert('Failed to process dataset: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        console.error('CSV upload failed:', err);
        alert('Network error while uploading dataset: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
    }
}

// --- User Profile & Authorization Management ---
async function loadUserProfile() {
    try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();

        if (data.success) {
            const u = data.user;
            const auth = data.authorization;

            // Hero banner updates
            const heroName = document.getElementById('prof-hero-name');
            const heroRole = document.getElementById('prof-hero-role');
            const heroDept = document.getElementById('prof-hero-dept-text');
            const heroProvider = document.getElementById('prof-hero-provider');

            if (heroName) heroName.innerText = u.full_name;
            if (heroRole) {
                heroRole.innerText = u.role;
                heroRole.className = `role-badge ${u.role === 'Admin' ? 'admin' : 'viewer'}`;
            }
            if (heroDept) heroDept.innerText = u.department;
            if (heroProvider) {
                heroProvider.innerHTML = u.auth_type === 'google' 
                    ? '<i class="fa-brands fa-google"></i> Google SSO Authenticated' 
                    : '<i class="fa-solid fa-shield-halved"></i> Database Authenticated';
            }

            // Topbar sync
            const topbarName = document.getElementById('topbar-user-name');
            const topbarRole = document.getElementById('topbar-role-badge');
            if (topbarName) topbarName.innerText = u.full_name;
            if (topbarRole) {
                topbarRole.innerText = u.role;
                topbarRole.className = `role-badge ${u.role === 'Admin' ? 'admin' : 'viewer'}`;
            }

            // Identity card fields
            const displayId = document.getElementById('prof-display-id');
            const displayUsername = document.getElementById('prof-display-username');
            const displayEmail = document.getElementById('prof-display-email');
            const displayPhone = document.getElementById('prof-display-phone');
            const displayAuth = document.getElementById('prof-display-auth');
            const displayCreated = document.getElementById('prof-display-created');
            const displayLogin = document.getElementById('prof-display-login');

            if (displayId) displayId.innerText = `#${u.user_id}`;
            if (displayUsername) displayUsername.innerText = `@${u.username}`;
            if (displayEmail) displayEmail.innerText = u.email;
            if (displayPhone) displayPhone.innerText = u.phone;
            if (displayAuth) displayAuth.innerText = u.auth_type === 'google' ? 'Google Single Sign-On' : 'Database Password';
            if (displayCreated) displayCreated.innerText = u.created_at;
            if (displayLogin) displayLogin.innerText = u.last_login || 'Active Session';

            // Authorization matrix
            const matrixRole = document.getElementById('prof-matrix-role');
            const tierDesc = document.getElementById('prof-tier-desc');
            const permsList = document.getElementById('prof-permissions-list');

            if (matrixRole) {
                matrixRole.innerText = `${auth.role} Tier`;
                matrixRole.className = `role-badge ${auth.badge_class}`;
            }
            if (tierDesc) tierDesc.innerText = auth.access_level;

            if (permsList && auth.permissions) {
                permsList.innerHTML = auth.permissions.map(p => `
                    <div class="permission-item ${p.granted ? 'granted' : 'restricted'}">
                        <div class="permission-icon">
                            ${p.granted ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-xmark"></i>'}
                        </div>
                        <div style="flex: 1;">
                            <div class="permission-title">${p.name}</div>
                            <div class="permission-desc">${p.desc}</div>
                        </div>
                        <span class="permission-status-tag ${p.granted ? 'granted' : 'restricted'}">
                            ${p.granted ? 'AUTHORIZED' : 'RESTRICTED'}
                        </span>
                    </div>
                `).join('');
            }

            // Form inputs
            const inputName = document.getElementById('edit-full-name');
            const inputEmail = document.getElementById('edit-email');
            const inputDept = document.getElementById('edit-department');
            const inputPhone = document.getElementById('edit-phone');
            const inputUsername = document.getElementById('edit-username');
            const inputRoleDisplay = document.getElementById('edit-role-display');

            if (inputName) inputName.value = u.full_name;
            if (inputEmail) inputEmail.value = u.email;
            if (inputDept) inputDept.value = u.department;
            if (inputPhone) inputPhone.value = u.phone;
            if (inputUsername) inputUsername.value = u.username;
            if (inputRoleDisplay) inputRoleDisplay.value = `${u.role} (System Assigned)`;

            // Clear passwords
            const currP = document.getElementById('edit-current-password');
            const newP = document.getElementById('edit-new-password');
            const confP = document.getElementById('edit-confirm-password');
            if (currP) currP.value = '';
            if (newP) newP.value = '';
            if (confP) confP.value = '';
        }
    } catch (err) {
        console.error('Failed to load user profile:', err);
    }
}

async function saveUserProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    const alertBox = document.getElementById('profileAlertBox');

    const fullName = document.getElementById('edit-full-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const department = document.getElementById('edit-department').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const currentPassword = document.getElementById('edit-current-password').value.trim();
    const newPassword = document.getElementById('edit-new-password').value.trim();
    const confirmPassword = document.getElementById('edit-confirm-password').value.trim();

    if (newPassword) {
        if (newPassword.length < 4) {
            showProfileAlert('New password must be at least 4 characters long.', 'danger');
            return;
        }
        if (newPassword !== confirmPassword) {
            showProfileAlert('New password and Confirmation password do not match.', 'danger');
            return;
        }
    }

    const origBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Database...';

    try {
        const payload = {
            full_name: fullName,
            email: email,
            department: department,
            phone: phone,
            current_password: currentPassword,
            new_password: newPassword
        };

        const res = await fetch('/api/user/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.success) {
            showProfileAlert(data.message, 'success');
            // Re-sync profile state
            loadUserProfile();
        } else {
            showProfileAlert(data.error || 'Failed to update profile.', 'danger');
        }
    } catch (err) {
        showProfileAlert('Network error while saving profile: ' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
    }
}

function showProfileAlert(message, type) {
    const alertBox = document.getElementById('profileAlertBox');
    if (!alertBox) return;

    alertBox.style.display = 'block';
    const isSuccess = type === 'success';
    alertBox.className = isSuccess ? 'alert-box alert-success' : 'alert-box alert-danger';
    alertBox.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fa-solid ${isSuccess ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                <span>${message}</span>
            </div>
            <button type="button" onclick="this.parentElement.parentElement.style.display='none'" style="background: none; border: none; color: inherit; cursor: pointer; font-size: 14px;">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>
    `;
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// --- Admin Users Directory Management ---
async function loadUsersList() {
    const tbody = document.getElementById('usersMasterTableBody');
    if (!tbody) return;

    try {
        const res = await fetch('/api/users/list');
        const data = await res.json();

        if (data.success && data.users) {
            tbody.innerHTML = data.users.map(u => `
                <tr>
                    <td><strong>#${u.user_id}</strong></td>
                    <td><code>@${u.username}</code></td>
                    <td><strong>${u.full_name}</strong></td>
                    <td>${u.email}</td>
                    <td><span class="role-badge ${u.role === 'Admin' ? 'admin' : 'viewer'}">${u.role}</span></td>
                    <td style="font-size: 12px; color: var(--text-muted);">${u.department}</td>
                    <td>${u.phone}</td>
                    <td><span class="auth-provider-badge" style="font-size: 10px; padding: 2px 7px;">${u.auth_type}</span></td>
                    <td style="font-size: 12px; color: var(--text-muted);">${u.created_at}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger); padding: 18px;">${data.error || 'Access restricted.'}</td></tr>`;
        }
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--danger); padding: 18px;">Failed to load users: ${err.message}</td></tr>`;
    }
}

function openAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddUserModal() {
    const modal = document.getElementById('addUserModal');
    if (modal) modal.style.display = 'none';
    const alertBox = document.getElementById('addUserAlertBox');
    if (alertBox) alertBox.style.display = 'none';
}

async function addNewUser(e) {
    e.preventDefault();
    const btn = document.getElementById('btnCreateUser');
    const alertBox = document.getElementById('addUserAlertBox');

    const payload = {
        username: document.getElementById('new-user-username').value.trim(),
        full_name: document.getElementById('new-user-fullname').value.trim(),
        email: document.getElementById('new-user-email').value.trim(),
        role: document.getElementById('new-user-role').value,
        department: document.getElementById('new-user-dept').value.trim(),
        phone: document.getElementById('new-user-phone').value.trim(),
        password: document.getElementById('new-user-password').value.trim()
    };

    const origBtnHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';

    try {
        const res = await fetch('/api/users/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            closeAddUserModal();
            alert(data.message);
            loadUsersList();
            document.getElementById('addUserForm').reset();
        } else {
            if (alertBox) {
                alertBox.style.display = 'block';
                alertBox.className = 'alert-box alert-danger';
                alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${data.error || 'Failed to create user.'}`;
            }
        }
    } catch (err) {
        if (alertBox) {
            alertBox.style.display = 'block';
            alertBox.className = 'alert-box alert-danger';
            alertBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message}`;
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = origBtnHtml;
    }
}


// =========================================================================
// Real-time Dynamic Recommendations Engine
// =========================================================================
let allRecommendations = [];

async function loadRecommendations(isManualRefresh = false) {
    const refreshBtn = document.getElementById('btnRefreshRecs');
    const refreshIcon = document.getElementById('refreshRecsIcon');

    if (isManualRefresh && refreshIcon) {
        refreshIcon.classList.add('fa-spin');
        if (refreshBtn) refreshBtn.disabled = true;
    }

    try {
        const res = await fetch('/api/recommendations');
        const data = await res.json();

        if (data.success) {
            allRecommendations = data.recommendations || [];
            const summary = data.summary || {};

            // 1. Update KPI Summary Cards
            const elActive = document.getElementById('rec-kpi-active');
            const elCrit = document.getElementById('rec-kpi-critical');
            const elInr = document.getElementById('rec-kpi-savings-inr');
            const elKwh = document.getElementById('rec-kpi-savings-kwh');
            const elCo2 = document.getElementById('rec-kpi-co2');
            const elTemp = document.getElementById('rec-live-temp');

            if (elActive) elActive.innerText = `${summary.active_count || 0} Actions`;
            if (elCrit) elCrit.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${summary.critical_count || 0} Critical Priority`;
            if (elInr) elInr.innerText = `₹${(summary.total_savings_inr || 0).toLocaleString()}`;
            if (elKwh) elKwh.innerText = `${(summary.total_savings_kwh || 0).toLocaleString()} kWh`;
            if (elCo2) elCo2.innerText = `${(summary.total_co2_kg || 0).toLocaleString()} kg`;
            if (elTemp && summary.current_temp_c !== undefined) elTemp.innerText = `${summary.current_temp_c}°C`;

            // 2. Synchronize Badges Across Navbar, Topbar Bell, and Dashboard Preview
            const activeCount = summary.active_count !== undefined ? summary.active_count : allRecommendations.filter(r => r.status !== 'implemented').length;
            
            const navBadge = document.getElementById('nav-rec-badge');
            if (navBadge) {
                navBadge.innerText = activeCount;
                navBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
            }

            const notifBadge = document.getElementById('top-notif-badge');
            if (notifBadge) {
                notifBadge.innerText = activeCount;
                notifBadge.style.display = activeCount > 0 ? 'inline-block' : 'none';
            }

            const previewCount = document.getElementById('preview-rec-count');
            if (previewCount) previewCount.innerText = activeCount;

            // 3. Update Dashboard Overview Preview List
            updateDashboardRecPreview(allRecommendations);

            // 4. Render Main Recommendations Grid with Active Filters
            applyRecFilters();
        } else {
            console.error('Error fetching recommendations:', data.error);
        }
    } catch (err) {
        console.error('Network error loading recommendations:', err);
    } finally {
        if (isManualRefresh && refreshIcon) {
            setTimeout(() => {
                refreshIcon.classList.remove('fa-spin');
                if (refreshBtn) refreshBtn.disabled = false;
            }, 400);
        }
    }
}

function updateDashboardRecPreview(recs) {
    const list = document.getElementById('dashboardRecPreviewList');
    if (!list) return;

    const activeRecs = recs.filter(r => r.status !== 'implemented').slice(0, 3);
    if (activeRecs.length === 0) {
        list.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">
                <i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.4rem; margin-bottom: 6px;"></i>
                <p style="margin: 0;">All campus efficiency recommendations implemented!</p>
            </div>
        `;
        return;
    }

    list.innerHTML = activeRecs.map(r => {
        let iconClass = 'fa-solid fa-lightbulb';
        let iconColor = 'var(--warning)';

        if (r.category === 'HVAC & Chiller') {
            iconClass = 'fa-solid fa-temperature-arrow-down';
            iconColor = '#f97316';
        } else if (r.category === 'Peak Load Shifting') {
            iconClass = 'fa-solid fa-bolt-lightning';
            iconColor = '#ef4444';
        } else if (r.category === 'Rooftop Solar PV') {
            iconClass = 'fa-solid fa-solar-panel';
            iconColor = '#10b981';
        } else if (r.category === 'Ghost Load Elimination') {
            iconClass = 'fa-solid fa-power-off';
            iconColor = '#6366f1';
        } else if (r.category === 'BEE Energy Star') {
            iconClass = 'fa-solid fa-award';
            iconColor = '#f59e0b';
        }

        return `
            <div class="rec-item" style="cursor: pointer;" onclick="switchView('recommendations')">
                <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.25rem;"></i>
                <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; align-items: baseline;">
                        <strong style="font-size: 0.9rem;">${r.title}</strong>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${r.building_code || ''}</span>
                    </div>
                    <p style="margin: 3px 0 0; font-size: 0.8rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${r.message}
                    </p>
                </div>
            </div>
        `;
    }).join('');
}

function applyRecFilters() {
    const container = document.getElementById('recommendationsContainer');
    if (!container) return;

    const statusVal = (document.getElementById('recFilterStatus')?.value || 'active').toLowerCase();
    const priorityVal = (document.getElementById('recFilterPriority')?.value || 'all').toLowerCase();
    const categoryVal = document.getElementById('recFilterCategory')?.value || 'all';
    const buildingVal = document.getElementById('recFilterBuilding')?.value || 'all';
    const query = (document.getElementById('recSearchQuery')?.value || '').trim().toLowerCase();

    const filtered = allRecommendations.filter(r => {
        // Status filter
        if (statusVal === 'active' && r.status === 'implemented') return false;
        if (statusVal !== 'all' && statusVal !== 'active' && r.status !== statusVal) return false;

        // Priority filter
        if (priorityVal !== 'all' && (r.priority || '').toLowerCase() !== priorityVal) return false;

        // Category filter
        if (categoryVal !== 'all' && r.category !== categoryVal) return false;

        // Building filter
        if (buildingVal !== 'all' && String(r.building_id) !== String(buildingVal)) return false;

        // Search query
        if (query) {
            const haystack = `${r.title} ${r.message} ${r.building_name} ${r.category} ${r.priority}`.toLowerCase();
            if (!haystack.includes(query)) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="panel-card" style="text-align: center; padding: 48px 24px;">
                <i class="fa-solid fa-clipboard-check" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 12px;"></i>
                <h3 style="font-size: 1.15rem; margin-bottom: 6px;">No Recommendations Matching Filters</h3>
                <p style="color: var(--text-muted); font-size: 0.88rem; max-width: 420px; margin: 0 auto 16px;">
                    Try selecting "All Statuses" or clearing your filter criteria to inspect historical and implemented conservation actions.
                </p>
                <button class="btn btn-secondary btn-sm" onclick="resetRecFilters()">
                    <i class="fa-solid fa-arrow-rotate-left"></i> Reset All Filters
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(rec => {
        const prio = (rec.priority || 'medium').toLowerCase();
        const stat = (rec.status || 'new').toLowerCase();
        const isImplemented = (stat === 'implemented');

        let prioIcon = 'fa-solid fa-circle-info';
        if (prio === 'critical') prioIcon = 'fa-solid fa-circle-exclamation';
        else if (prio === 'high') prioIcon = 'fa-solid fa-triangle-exclamation';
        else if (prio === 'opportunity') prioIcon = 'fa-solid fa-sun';

        let categoryIcon = 'fa-solid fa-tag';
        if (rec.category === 'HVAC & Chiller') categoryIcon = 'fa-solid fa-temperature-arrow-down';
        else if (rec.category === 'Peak Load Shifting') categoryIcon = 'fa-solid fa-bolt-lightning';
        else if (rec.category === 'Rooftop Solar PV') categoryIcon = 'fa-solid fa-solar-panel';
        else if (rec.category === 'Ghost Load Elimination') categoryIcon = 'fa-solid fa-moon';
        else if (rec.category === 'BEE Energy Star') categoryIcon = 'fa-solid fa-award';
        else if (rec.category === 'Academic Calendar') categoryIcon = 'fa-solid fa-graduation-cap';

        // Approximate savings % based on estimated kWh relative to typical 25k kWh/mo
        const estPct = Math.min(35, Math.max(10, Math.round((rec.estimated_savings_kwh / 25000) * 100 / 5) * 5));

        return `
            <div class="rec-item-card priority-${prio} ${isImplemented ? 'status-implemented-card' : ''}" id="rec-card-${rec.recommendation_id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                        <span class="rec-badge-pill priority-${prio}">
                            <i class="${prioIcon}"></i> ${prio.toUpperCase()}
                        </span>
                        <span class="rec-badge-pill category-pill">
                            <i class="${categoryIcon}"></i> ${rec.category}
                        </span>
                        <span class="rec-badge-pill facility-pill">
                            <i class="fa-solid fa-building"></i> ${rec.building_name} (${rec.building_code})
                        </span>
                    </div>

                    <div>
                        <span class="rec-badge-pill status-pill status-${stat}">
                            ${stat === 'implemented' ? '<i class="fa-solid fa-circle-check"></i> Implemented' : (stat === 'in_progress' ? '<i class="fa-solid fa-spinner fa-spin"></i> In Progress' : '<i class="fa-solid fa-clock"></i> New Action')}
                        </span>
                    </div>
                </div>

                <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 8px; color: var(--text);">
                    ${rec.title}
                </h3>
                <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px 0;">
                    ${rec.message}
                </p>

                <div class="rec-stat-strip">
                    <div class="rec-stat-box">
                        <span class="rec-stat-title"><i class="fa-solid fa-bolt" style="color: var(--warning);"></i> Est. Energy Saved</span>
                        <span class="rec-stat-value" style="color: var(--warning);">${(rec.estimated_savings_kwh || 0).toLocaleString()} kWh</span>
                    </div>
                    <div class="rec-stat-box">
                        <span class="rec-stat-title"><i class="fa-solid fa-indian-rupee-sign" style="color: var(--success);"></i> Financial Impact</span>
                        <span class="rec-stat-value" style="color: var(--success);">₹${(rec.estimated_cost_savings_inr || 0).toLocaleString()}/mo</span>
                    </div>
                    <div class="rec-stat-box">
                        <span class="rec-stat-title"><i class="fa-solid fa-leaf" style="color: var(--purple);"></i> CO₂ Reduction</span>
                        <span class="rec-stat-value" style="color: var(--purple);">${(rec.estimated_co2_kg || 0).toLocaleString()} kg</span>
                    </div>
                </div>

                <div class="rec-actions-bar">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        ${stat === 'new' ? `
                            <button class="btn btn-secondary btn-sm" onclick="updateRecStatus(${rec.recommendation_id}, 'in_progress')">
                                <i class="fa-solid fa-spinner"></i> Start Action
                            </button>
                            <button class="btn btn-primary btn-sm" onclick="updateRecStatus(${rec.recommendation_id}, 'implemented')">
                                <i class="fa-solid fa-circle-check"></i> Mark Implemented
                            </button>
                        ` : ''}

                        ${stat === 'in_progress' ? `
                            <button class="btn btn-primary btn-sm" onclick="updateRecStatus(${rec.recommendation_id}, 'implemented')" style="background: var(--success); border-color: var(--success);">
                                <i class="fa-solid fa-circle-check"></i> Complete Action
                            </button>
                            <button class="btn btn-secondary btn-sm" onclick="updateRecStatus(${rec.recommendation_id}, 'new')">
                                <i class="fa-solid fa-rotate-left"></i> Reset to New
                            </button>
                        ` : ''}

                        ${stat === 'implemented' ? `
                            <button class="btn btn-secondary btn-sm" onclick="updateRecStatus(${rec.recommendation_id}, 'new')">
                                <i class="fa-solid fa-rotate-left"></i> Reopen Action
                            </button>
                        ` : ''}
                    </div>

                    <div>
                        <button class="btn btn-secondary btn-sm" onclick="simulateRecommendation(${rec.building_id}, ${estPct})" title="Test this reduction in the What-If Simulator">
                            <i class="fa-solid fa-sliders" style="color: var(--primary);"></i> Simulate in What-If Tool
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function resetRecFilters() {
    const elStatus = document.getElementById('recFilterStatus');
    const elPrio = document.getElementById('recFilterPriority');
    const elCat = document.getElementById('recFilterCategory');
    const elBld = document.getElementById('recFilterBuilding');
    const elQuery = document.getElementById('recSearchQuery');

    if (elStatus) elStatus.value = 'all';
    if (elPrio) elPrio.value = 'all';
    if (elCat) elCat.value = 'all';
    if (elBld) elBld.value = 'all';
    if (elQuery) elQuery.value = '';

    applyRecFilters();
}

async function updateRecStatus(recId, newStatus) {
    try {
        const res = await fetch('/api/recommendations/update-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recommendation_id: recId, status: newStatus })
        });
        const data = await res.json();

        if (data.success) {
            // Re-fetch recommendations to refresh KPI summary and persist
            await loadRecommendations(false);
        } else {
            alert('Failed to update recommendation status: ' + (data.error || 'Server error'));
        }
    } catch (err) {
        alert('Network error updating status: ' + err.message);
    }
}

function simulateRecommendation(buildingId, savingsPct = 15) {
    switchView('predictions');
    const simBld = document.getElementById('sim-building');
    const simRed = document.getElementById('sim-reduction');
    const simPctVal = document.getElementById('sim-pct-val');

    if (simBld && buildingId) {
        simBld.value = String(buildingId);
    }
    if (simRed && savingsPct) {
        const clamped = Math.max(5, Math.min(40, Math.round(savingsPct / 5) * 5));
        simRed.value = String(clamped);
        if (simPctVal) simPctVal.innerText = clamped + '%';
    }

    if (typeof runSimulation === 'function') {
        runSimulation();
    }

    setTimeout(() => {
        const simBox = document.querySelector('.sim-result-box') || document.getElementById('sim-cost-save');
        if (simBox) {
            simBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            simBox.classList.add('pulse-highlight');
            setTimeout(() => simBox.classList.remove('pulse-highlight'), 2200);
        }
    }, 250);
}

// Modal: Propose Custom Action
function openAddRecModal() {
    const modal = document.getElementById('addRecModal');
    if (modal) modal.style.display = 'flex';
}

function closeAddRecModal() {
    const modal = document.getElementById('addRecModal');
    if (modal) modal.style.display = 'none';
}

async function submitCustomRec(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSubmitRec');
    const origHtml = btn ? btn.innerHTML : 'Dispatch Action';

    const payload = {
        building_id: parseInt(document.getElementById('modal-rec-building').value),
        title: document.getElementById('modal-rec-title').value.trim(),
        category: document.getElementById('modal-rec-category').value,
        priority: document.getElementById('modal-rec-priority').value,
        estimated_savings_kwh: parseFloat(document.getElementById('modal-rec-savings-kwh').value),
        message: document.getElementById('modal-rec-message').value.trim()
    };

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Dispatching...';
    }

    try {
        const res = await fetch('/api/recommendations/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            closeAddRecModal();
            document.getElementById('addRecForm').reset();
            await loadRecommendations(true);
        } else {
            alert('Failed to dispatch action: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Error dispatching action: ' + err.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml;
        }
    }
}


// =========================================================================
// Upgrade 4: Automated Threshold Alerts & Incident Management Engine
// =========================================================================
let allAlerts = [];
let activeAlertFilter = 'active';

async function loadAlerts(isManual = false) {
    const refreshIcon = document.getElementById('refreshAlertsIcon');
    if (isManual && refreshIcon) refreshIcon.classList.add('fa-spin');

    try {
        const res = await fetch('/api/alerts');
        const data = await res.json();

        if (data.success) {
            allAlerts = data.alerts || [];
            const summary = data.summary || {};

            const countBadge = document.getElementById('alertsActiveCount');
            if (countBadge) countBadge.innerText = summary.active_count || 0;

            const pill = document.getElementById('activeAlertsBadge');
            if (pill) {
                if (summary.active_count > 0) {
                    pill.style.background = 'rgba(239, 68, 68, 0.15)';
                    pill.style.color = '#EF4444';
                    pill.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                } else {
                    pill.style.background = 'rgba(16, 185, 129, 0.12)';
                    pill.style.color = '#10B981';
                    pill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
                }
            }

            renderAlerts();
        }
    } catch (err) {
        console.error('Failed to load alerts:', err);
    } finally {
        if (isManual && refreshIcon) {
            setTimeout(() => refreshIcon.classList.remove('fa-spin'), 350);
        }
    }
}

function filterAlerts(status) {
    activeAlertFilter = status;

    const btnAll = document.getElementById('btnAlertAll');
    const btnActive = document.getElementById('btnAlertActive');
    const btnAck = document.getElementById('btnAlertAck');

    if (btnAll) btnAll.style.background = (status === 'all') ? 'rgba(59, 130, 246, 0.2)' : '';
    if (btnActive) btnActive.style.background = (status === 'active') ? 'rgba(239, 68, 68, 0.2)' : '';
    if (btnAck) btnAck.style.background = (status === 'acknowledged') ? 'rgba(16, 185, 129, 0.2)' : '';

    renderAlerts();
}

function renderAlerts() {
    const container = document.getElementById('alertsLogContainer');
    if (!container) return;

    const filtered = allAlerts.filter(a => {
        if (activeAlertFilter === 'active') return a.status === 'active';
        if (activeAlertFilter === 'acknowledged') return a.status !== 'active';
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.9rem;">
                <i class="fa-solid fa-circle-check" style="color: var(--success); font-size: 1.8rem; margin-bottom: 8px;"></i>
                <p style="margin: 0;">No ${activeAlertFilter === 'active' ? 'active' : ''} threshold alerts logged. Grid parameters operating within nominal bounds.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(a => {
        const sev = (a.severity || 'warning').toLowerCase();
        const stat = (a.status || 'active').toLowerCase();
        const isResolved = (stat === 'resolved');

        let sevIcon = 'fa-solid fa-triangle-exclamation';
        if (sev === 'critical') sevIcon = 'fa-solid fa-circle-radiation';
        else if (sev === 'info') sevIcon = 'fa-solid fa-circle-info';

        return `
            <div class="alert-log-item sev-${sev} ${isResolved ? 'status-resolved-card' : ''}" id="alert-card-${a.alert_id}">
                <div style="flex: 1;">
                    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 6px; flex-wrap: wrap;">
                        <span class="alert-badge badge-${sev}">
                            <i class="${sevIcon}"></i> ${sev.toUpperCase()}
                        </span>
                        <span style="font-size: 0.82rem; font-weight: 700; color: var(--text);">
                            <i class="fa-solid fa-building"></i> ${a.building_name} (${a.building_code})
                        </span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">
                            <i class="fa-solid fa-clock"></i> ${a.created_at}
                        </span>
                    </div>
                    <p style="margin: 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.4;">
                        ${a.message}
                    </p>
                    <div style="margin-top: 6px; font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 14px;">
                        <span>Breach Value: <strong style="color: var(--text);">${a.metric_value}</strong></span>
                        <span>Threshold: <strong style="color: var(--text);">${a.threshold_value}</strong></span>
                        <span>Dispatched via: <strong>${a.dispatched_via}</strong></span>
                    </div>
                </div>

                <div style="display: flex; gap: 8px; align-items: center;">
                    ${stat === 'active' ? `
                        <button class="btn btn-secondary btn-sm" onclick="acknowledgeAlert(${a.alert_id}, 'acknowledged')" title="Mark alert as acknowledged">
                            <i class="fa-solid fa-check"></i> Acknowledge
                        </button>
                    ` : `
                        <span style="font-size: 0.78rem; color: var(--success); font-weight: 600; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="fa-solid fa-check-double"></i> ${stat.toUpperCase()}
                        </span>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

async function acknowledgeAlert(alertId, newStatus = 'acknowledged') {
    try {
        const res = await fetch('/api/alerts/acknowledge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alert_id: alertId, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
            await loadAlerts(false);
        } else {
            alert('Could not acknowledge alert: ' + (data.error || 'Server error'));
        }
    } catch (err) {
        alert('Network error acknowledging alert: ' + err.message);
    }
}
