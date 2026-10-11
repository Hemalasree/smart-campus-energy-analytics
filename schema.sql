-- BIT Smart Campus Energy Consumption Analytics System (SCEAS ⚡)
-- 6-Table Normalized Database Schema & Dataset Script

CREATE DATABASE IF NOT EXISTS bit_campus_energy;
USE bit_campus_energy;

-- 1. Buildings Table
CREATE TABLE IF NOT EXISTS buildings (
    building_id INT AUTO_INCREMENT PRIMARY KEY,
    building_name VARCHAR(100) NOT NULL,
    building_code VARCHAR(20) NOT NULL UNIQUE,
    building_type ENUM('Academic','Residential','Laboratory','Administrative','Facility') NOT NULL,
    area_sqft FLOAT NOT NULL,
    base_benchmark_kwh FLOAT NOT NULL
);

-- 2. Energy Consumption Readings Table (Time-Series)
CREATE TABLE IF NOT EXISTS energy_readings (
    reading_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    timestamp DATETIME NOT NULL,
    consumption_kwh FLOAT NOT NULL,
    voltage_v FLOAT DEFAULT 230.0,
    peak_demand_kw FLOAT NOT NULL, -- True instantaneous peak load within the hour
    temperature_c FLOAT NOT NULL,
    humidity_pct FLOAT DEFAULT 65.0,
    occupancy_pct INT NOT NULL,
    is_weekend TINYINT(1) DEFAULT 0,
    academic_status INT DEFAULT 0,
    FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE,
    UNIQUE KEY uq_building_time (building_id, timestamp),
    INDEX idx_building_time (building_id, timestamp)
);

-- 3. Users Table (Role-based Authentication Store)
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'viewer') NOT NULL DEFAULT 'viewer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tariff Rates Table (Dynamic ₹/kWh Rate & CO2 Factor Store)
CREATE TABLE IF NOT EXISTS tariff_rates (
    tariff_id INT AUTO_INCREMENT PRIMARY KEY,
    rate_per_kwh FLOAT NOT NULL,
    effective_from DATE NOT NULL,
    co2_factor_kg_per_kwh FLOAT DEFAULT 0.82
);

-- 5. Predictions Log Table (Tracks Historical AI Forecasts & Accuracy Metrics)
CREATE TABLE IF NOT EXISTS predictions (
    prediction_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    target_date DATE NOT NULL,
    predicted_kwh FLOAT NOT NULL,
    mae FLOAT,
    rmse FLOAT,
    r2 FLOAT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE
);

-- 6. Recommendations Table (Actionable Suggestions & Status Tracking)
CREATE TABLE IF NOT EXISTS recommendations (
    recommendation_id INT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    message VARCHAR(500) NOT NULL,
    estimated_savings_kwh FLOAT,
    status ENUM('new','reviewed','in_progress','implemented') DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (building_id) REFERENCES buildings(building_id) ON DELETE CASCADE
);

-- Initial Buildings Dataset
INSERT INTO buildings (building_id, building_name, building_code, building_type, area_sqft, base_benchmark_kwh) VALUES
(1, 'Academic Block A', 'ACA-A', 'Academic', 45000, 120.0),
(2, 'Academic Block B', 'ACA-B', 'Academic', 38000, 95.0),
(3, 'Central Library', 'LIB-01', 'Facility', 25000, 70.0),
(4, 'Main Hostel Complex', 'HST-ALL', 'Residential', 60000, 160.0),
(5, 'Research & Innovation Lab', 'LAB-RND', 'Laboratory', 30000, 140.0),
(6, 'Admin & IT Center', 'ADM-01', 'Administrative', 20000, 50.0)
ON DUPLICATE KEY UPDATE building_name=VALUES(building_name);

-- Initial Tariff Rate (TANGEDCO Tamil Nadu Tariff)
INSERT INTO tariff_rates (tariff_id, rate_per_kwh, effective_from, co2_factor_kg_per_kwh) VALUES
(1, 8.50, '2026-01-01', 0.82)
ON DUPLICATE KEY UPDATE rate_per_kwh=VALUES(rate_per_kwh);
