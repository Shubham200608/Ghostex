/**
 * VisionCore AI HUD - Command Center Logic
 * Orchestrates real-time telemetry, bento-grid animations, and neural events.
 */

class VisionHUD {
    constructor() {
        this.occChart = null;
        this.lastUpdate = Date.now();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startPolling();
        this.initCharts();
        this.loadSettings();
        this.loadReports();
    }

    setupEventListeners() {
        // Save Settings (on Settings Page)
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn) {
            saveBtn.onclick = () => this.saveSettings();
        }

        // Test Email (on Settings Page)
        const testEmailBtn = document.getElementById('test-email-btn');
        if (testEmailBtn) {
            testEmailBtn.onclick = () => this.testEmail();
        }

        // Report Generation (on Reports Page)
        const reportBtn = document.getElementById('generate-report-btn');
        if (reportBtn) {
            reportBtn.onclick = () => this.generateReport();
        }
    }

    startPolling() {
        // Main status update (Monitor Page)
        if (document.getElementById('person-count') || document.getElementById('light-status')) {
            setInterval(() => this.updateStatus(), 1000);
            this.updateStatus();
        }

        // System health (CPU/RAM) (Universal)
        if (document.getElementById('cpu-bar')) {
            setInterval(() => this.loadStats(), 3000);
            this.loadStats();
        }

        // Energy Cost (Monitor Page)
        if (document.getElementById('money-wasted')) {
            setInterval(() => this.updateEnergyCost(), 2000);
            this.updateEnergyCost();
        }

        // Audit Log (History/Monitor Page)
        if (document.getElementById('audit-log')) {
            setInterval(() => this.loadAuditLog(), 5000);
            this.loadAuditLog();
        }

        // Occupancy Chart (Monitor Page)
        if (document.getElementById('occupancyChart')) {
            setInterval(() => this.updateOccupancyChart(), 5000);
            this.updateOccupancyChart();
        }
    }

    async updateStatus() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            this.lastUpdate = Date.now();

            // Presence
            const countEl = document.getElementById('person-count');
            if (countEl) {
                const newText = data.person_count > 0 ? `${data.person_count} PERSON${data.person_count > 1 ? 'S' : ''}` : 'EMPTY';
                if (countEl.textContent !== newText) {
                    this.animateValue(countEl, newText);
                }
            }

            // Light
            const lightStatusEl = document.getElementById('light-status');
            const lightTypeEl = document.getElementById('light-type');
            if (lightStatusEl) lightStatusEl.textContent = data.light_status;
            if (lightTypeEl) lightTypeEl.textContent = data.light_type || 'Spectrum Analyzing...';

            // AI FPS
            const fpsEl = document.getElementById('ai-fps');
            if (fpsEl && data.ai_fps !== undefined) {
                fpsEl.textContent = data.ai_fps.toFixed(1);
            }

            // Presence Stats
            const timeSinceEl = document.getElementById('time-since');
            if (timeSinceEl) {
                if (data.person_count > 0) {
                    timeSinceEl.textContent = 'Presence Verified ✓';
                } else {
                    const idle = data.time_since_presence;
                    const mins = Math.floor(idle / 60);
                    const secs = idle % 60;
                    timeSinceEl.textContent = mins > 0 ? `Empty for ${mins}m ${secs}s` : `Empty for ${secs}s`;
                }
            }

            // Energy Alert Banner
            const alertBanner = document.getElementById('energy-alert');
            if (alertBanner) {
                alertBanner.style.display = data.is_energy_wasted ? 'block' : 'none';
            }

        } catch (err) {
            console.error('Status fetch error:', err);
        }
    }

    animateValue(el, newValue) {
        el.style.transition = 'none';
        el.style.opacity = '0.4';
        el.style.transform = 'translateY(5px)';
        requestAnimationFrame(() => {
            el.textContent = newValue;
            el.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        });
    }

    async loadStats() {
        try {
            const res = await fetch('/stats');
            const data = await res.json();

            // System Health Bars
            if (data.system) {
                this.updateHealthBar('cpu', data.system.cpu_percent);
                this.updateHealthBar('ram', data.system.ram_percent);
            }
        } catch (e) { console.error(e); }
    }

    updateHealthBar(id, percent) {
        const bar = document.getElementById(`${id}-bar`);
        const val = document.getElementById(`${id}-val`);
        if (bar) bar.style.width = percent + '%';
        if (val) val.textContent = `${percent.toFixed(0)}%`;
    }

    async updateEnergyCost() {
        try {
            const res = await fetch('/api/energy_live');
            const d = await res.json();

            const moneyEl = document.getElementById('money-wasted');
            const trendEl = document.querySelector('.energy-trend');
            
            if (moneyEl) moneyEl.textContent = `₹${d.today.money_wasted.toFixed(2)}`;
            if (trendEl) trendEl.style.display = d.is_wasting_now ? 'inline-block' : 'none';
            
            const kwhEl = document.getElementById('kwh-wasted');
            if (kwhEl) kwhEl.textContent = `${d.today.kwh_wasted.toFixed(3)} kWh`;

            const mins = Math.floor(d.today.waste_minutes);
            const secs = Math.floor(d.today.waste_seconds % 60);
            const wasteTimeEl = document.getElementById('waste-time');
            if (wasteTimeEl) wasteTimeEl.textContent = `${mins}m ${secs}s`;

            const burnRateEl = document.getElementById('burn-rate');
            if (burnRateEl) burnRateEl.textContent = `₹${d.config.rate_per_hour.toFixed(2)}/hr`;

        } catch(e) { console.error('Energy cost error:', e); }
    }

    async loadAuditLog() {
        try {
            const res = await fetch('/api/history'); // Note: Updated to API path
            const data = await res.json();
            const logEl = document.getElementById('audit-log');
            if (!logEl) return;

            if (data.entries && data.entries.length > 0) {
                const recent = data.entries.reverse(); // Show all on history page
                logEl.innerHTML = recent.map(e => `
                    <div style="padding: 12px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.01); border-radius: 8px; margin-bottom: 8px;">
                        <div>
                            <div style="font-weight: 800; color: var(--text);">${e.Room || 'Sector Unknown'}</div>
                            <div style="font-size: 0.7rem; color: var(--text-dim);">${e.Timestamp}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: 800; color: var(--warning); font-size: 1.1rem;">⚡ ${parseFloat(e.Duration_Seconds).toFixed(0)}s</div>
                            <small style="color: var(--cyan); font-size: 0.65rem; font-weight: 700;">₹${parseFloat(e.Money_Wasted).toFixed(2)} LOSS</small>
                        </div>
                    </div>
                `).join('');
            } else {
                logEl.innerHTML = '<div style="opacity: 0.5; padding: 2.5rem; text-align: center;">No waste events recorded in database.</div>';
            }
        } catch (e) { console.error(e); }
    }

    async initCharts() {
        if (document.getElementById('occupancyChart')) {
            this.updateOccupancyChart();
        }
    }

    async updateOccupancyChart() {
        try {
            const res = await fetch('/api/occupancy_history');
            const d = await res.json();
            const canvas = document.getElementById('occupancyChart');
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            const chartData = d.data.length ? d.data : [0, 0];
            const chartLabels = d.labels.length ? d.labels : ['', ''];

            if (!this.occChart) {
                const gradient = ctx.createLinearGradient(0, 0, 0, 150);
                gradient.addColorStop(0, 'hsla(188, 86%, 53%, 0.4)');
                gradient.addColorStop(1, 'transparent');

                this.occChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartLabels,
                        datasets: [{
                            label: 'Tracks',
                            data: chartData,
                            fill: true,
                            backgroundColor: gradient,
                            borderColor: 'hsl(188, 86%, 53%)',
                            borderWidth: 2,
                            tension: 0.4,
                            pointRadius: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 1000 },
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { 
                                display: false, 
                                min: 0, 
                                max: Math.max(3, ...chartData) + 1 
                            },
                            x: { display: false }
                        }
                    }
                });
            } else {
                this.occChart.data.labels = chartLabels;
                this.occChart.data.datasets[0].data = chartData;
                this.occChart.update();
            }
        } catch(e) { console.error('Chart update error:', e); }
    }

    async loadSettings() {
        if (!document.getElementById('receiver-email')) return;
        try {
            const res = await fetch('/api/settings'); // Use API path
            const data = await res.json();
            ['receiver-email', 'room-name', 'alert-delay'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.value = data[id.replace('-', '_')] || '';
            });
        } catch (e) {}
    }

    async saveSettings() {
        const msgEl = document.getElementById('settings-msg');
        const payload = {
            receiver_email: document.getElementById('receiver-email').value,
            room_name: document.getElementById('room-name').value,
            alert_delay: document.getElementById('alert-delay').value
        };

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            this.showStatusMsg(msgEl, data.success ? '✅ Committed to AI Core' : '❌ Committal Failed');
        } catch (e) { this.showStatusMsg(msgEl, '❌ Local Sync Error'); }
    }

    async testEmail() {
        const msgEl = document.getElementById('settings-msg');
        this.showStatusMsg(msgEl, '📧 Dispatching Test Relay...', 'var(--accent)');
        try {
            const res = await fetch('/api/test_email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            this.showStatusMsg(msgEl, data.success ? '✅ Protocol Confirmed' : '❌ Relay Nullified');
        } catch (e) { this.showStatusMsg(msgEl, '❌ Network Partition'); }
    }

    async generateReport() {
        const btn = document.getElementById('generate-report-btn');
        const status = document.getElementById('report-status');
        btn.disabled = true;
        btn.textContent = '⏳ Compiling...';
        
        try {
            const res = await fetch('/api/generate_report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const d = await res.json();
            if (d.success) {
                status.innerHTML = `<span style="color:var(--success)">✅ Report Optimized</span> 
                    <a href="${d.download_url}" style="color:var(--cyan);text-decoration:none;margin-left:10px;" download>⬇ Download</a>`;
                this.loadReports();
            }
        } catch(e) { console.error('Reporting error:', e); }
        btn.disabled = false;
        btn.textContent = 'Run System Audit →';
    }

    async loadReports() {
        const list = document.getElementById('report-list');
        if (!list) return;
        try {
            const res = await fetch('/api/reports');
            const data = await res.json();
            list.innerHTML = data.reports.length ? 
                data.reports.map(r => `
                    <a class="report-link" href="${r.download_url}" download style="display: flex; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 10px; margin-bottom: 8px; text-decoration: none; font-size: 0.85rem; transition: all 0.2s;">
                        <span style="color: var(--text); font-weight: 700;">📄 ${r.filename}</span>
                        <div style="text-align: right;">
                            <div style="color: var(--text-dim); font-size: 0.75rem;">${r.created}</div>
                            <small style="color: var(--cyan); font-size: 0.65rem;">${r.size_kb} KB</small>
                        </div>
                    </a>
                `).join('') : '<p style="font-size: 0.8rem; color: var(--text-dim); opacity: 0.5;">No reports archived.</p>';
        } catch(e) {}
    }

    showStatusMsg(el, text, color = null) {
        if (!el) return;
        el.textContent = text;
        if (color) el.style.color = color;
        setTimeout(() => el.textContent = '', 4000);
    }
}

// Initial Launch
document.addEventListener('DOMContentLoaded', () => {
    window.hud = new VisionHUD();
});
