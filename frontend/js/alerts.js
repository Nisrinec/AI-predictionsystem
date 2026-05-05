// ========== ALERTS MODULE ==========
console.log('alerts.js loading...');

// Generate all alerts from pump data
function getAllAlerts() {
    let alerts = [];
    
    if (!allPumpsData) return alerts;
    
    for (let pumpId in allPumpsData) {
        const pump = allPumpsData[pumpId];
        const m = pump.metrics;
        
        if (!m) continue;
        
        if (m.coupling && m.coupling.risk === 'Critique') {
            alerts.push({ 
                pumpId: pumpId, 
                pumpName: pump.name, 
                dept: pump.dept, 
                component: 'Accouplement', 
                message: `Vibration critique ${m.coupling.vib} mm/s, désalignement ${m.coupling.align} mm`, 
                severity: 'critical', 
                rul: m.coupling.rul 
            });
        } else if (m.coupling && m.coupling.risk === 'Élevé') {
            alerts.push({ 
                pumpId: pumpId, 
                pumpName: pump.name, 
                dept: pump.dept, 
                component: 'Accouplement', 
                message: `Vibration élevée ${m.coupling.vib} mm/s, surveillance requise`, 
                severity: 'high', 
                rul: m.coupling.rul 
            });
        }
        
        if (m.motor && m.motor.risk === 'Élevé') {
            alerts.push({ 
                pumpId: pumpId, 
                pumpName: pump.name, 
                dept: pump.dept, 
                component: 'Moteur', 
                message: `Vibration ${m.motor.vib} mm/s, température ${m.motor.temp}°C`, 
                severity: 'high', 
                rul: m.motor.rul 
            });
        }
        
        if (m.motor && m.motor.temp > 78) {
            alerts.push({ 
                pumpId: pumpId, 
                pumpName: pump.name, 
                dept: pump.dept, 
                component: 'Moteur', 
                message: `Température élevée: ${m.motor.temp}°C`, 
                severity: 'high', 
                rul: m.motor.rul 
            });
        }
    }
    
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    return alerts;
}

// Render alerts dashboard
function renderAlertsDashboard() {
    console.log('renderAlertsDashboard called');
    
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
    
    const alerts = getAllAlerts();
    const criticalCount = alerts.filter(a => a.severity === 'critical').length;
    const highCount = alerts.filter(a => a.severity === 'high').length;
    const mediumCount = alerts.filter(a => a.severity === 'medium').length;
    
    const alertsHtml = `
        <div class="alerts-dashboard">
            <div class="machine-title">
                <div style="display:flex;align-items:center;gap:20px;">
                    <div class="machine-icon"><i class="fas fa-bell"></i></div>
                    <div class="machine-info"><h1>CENTRE D'ALERTES</h1><p>Liste des alertes actives par machine</p></div>
                </div>
                <div><span class="badge-online"><i class="fas fa-circle"></i> ${alerts.length} alerte(s)</span></div>
            </div>
            <div class="kpi-grid">
                <div class="kpi-card"><div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="kpi-label">Critique</div><div class="kpi-value" style="color:#d97777">${criticalCount}</div></div>
                <div class="kpi-card"><div class="kpi-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-label">Élevé</div><div class="kpi-value" style="color:#e6b422">${highCount}</div></div>
                <div class="kpi-card"><div class="kpi-icon"><i class="fas fa-check"></i></div><div class="kpi-label">Modéré</div><div class="kpi-value" style="color:#b8860b">${mediumCount}</div></div>
                <div class="kpi-card"><div class="kpi-icon"><i class="fas fa-industry"></i></div><div class="kpi-label">Machines affectées</div><div class="kpi-value">${new Set(alerts.map(a => a.pumpId)).size}</div></div>
            </div>
            <div class="alerts-table-container">
                <table class="alerts-table">
                    <thead>
                        <tr><th>Département</th><th>Machine</th><th>Composant</th><th>Alerte</th><th>RUL estimée</th><th>Sévérité</th></tr>
                    </thead>
                    <tbody>
                        ${alerts.map(alert => `
                            <tr class="alert-row-clickable" data-pump-id="${alert.pumpId}">
                                <td><strong>${escapeHtml(alert.dept)}</strong></td>
                                <td>${escapeHtml(alert.pumpName)}</td>
                                <td>${alert.component}</td>
                                <td>${alert.message}</td>
                                <td>~${alert.rul}h</td>
                                <td><span class="severity-badge severity-${alert.severity}">${alert.severity === 'critical' ? 'Critique' : (alert.severity === 'high' ? 'Élevée' : 'Modérée')}</span></td>
                            </tr>
                        `).join('')}
                        ${alerts.length === 0 ? '<tr><td colspan="6" style="text-align:center;padding:40px;">Aucune alerte active</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = alertsHtml;
    
    // Add click handlers for alert rows
    document.querySelectorAll('.alert-row-clickable').forEach(row => {
        row.addEventListener('click', () => {
            const pumpId = row.getAttribute('data-pump-id');
            if (pumpId && allPumpsData[pumpId]) {
                renderPumpDashboard(pumpId);
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            }
        });
    });
}

window.renderAlertsDashboard = renderAlertsDashboard;
window.getAllAlerts = getAllAlerts;

console.log('alerts.js loaded successfully');