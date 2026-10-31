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
    } else if (viewName === 'profile') {
        loadUserProfile();
    } else if (viewName === 'users') {
        loadUsersList();
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
