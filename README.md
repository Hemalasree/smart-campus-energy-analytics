# BIT Smart Campus Energy Consumption Analytics System ⚡

A web-based intelligent energy monitoring, analytics, and predictive decision-support system developed using Python (Flask), MySQL/SQLite, Pandas, NumPy, Scikit-learn, and Chart.js.

---

## 🚀 Key Features

- **Real-Time Monitoring**: Campus-wide total power consumption (kWh), peak load demand (kW), estimated expenditure (₹), and carbon emissions (kg CO₂).
- **Predictive AI Modeling**: Scikit-Learn `RandomForestRegressor` models ambient outdoor weather as a causal driver of HVAC compressor load.
- **Combined Forecast Visualization**: Historical actual consumption (solid line) merged into a 12-hour ML forecast (dashed line) on a single Chart.js graph.
- **Academic Calendar-Aware Anomaly Detection**: Adjusts baselines for semester breaks and exams to eliminate false wastage alarms.
- **Interactive What-If Energy Savings Simulator**: Simulates potential financial savings (₹) and CO₂ reduction from targeted energy cuts.
- **Exportable Executive Report**: One-click printable executive report with key KPIs, recommendations, and signature blocks.
- **Dual Theme**: Dark and Light theme support.

---

## 🛠️ Tech Stack

- **Backend**: Python (Flask)
- **Data Preprocessing**: NumPy, Pandas
- **Machine Learning**: Scikit-learn (`RandomForestRegressor`)
- **Database**: MySQL (with automatic SQLite fallback)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Chart.js
- **Weather API**: Open-Meteo Live Meteorological API

---

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/bit_smart_campus.git
cd bit_smart_campus
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the application
```bash
python app.py
```

### 4. Access the Dashboard
Open your browser and visit: `http://127.0.0.1:5000/`

**Demo Credentials**:
- **Email**: `admin@bit.edu.in`
- **Password**: `admin`
