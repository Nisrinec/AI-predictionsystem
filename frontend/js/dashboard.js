// ========== DASHBOARD MODULE ==========
console.log('dashboard.js loading...');

// Get department summary from database data
async function getDeptSummaryFromDB() {
    console.log('Getting department summary from database...');
    
    try {
        const token = localStorage.getItem('ipredict_token');
        
        // Fetch all machines with their latest sensor data
        const response = await fetch(`${API_URL}/machines?includeMetrics=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            console.warn('Failed to fetch machines from API, using local data');
            return getDeptSummaryFromLocal();
        }
        
        const machines = await response.json();
        console.log('Machines from DB:', machines.length);
        
        let depts = {};
        
        for (const machine of machines) {
            const deptName = machine.department_name || 'N/A';
            
            if (!depts[deptName]) {
                depts[deptName] = { 
                    totalRisk: 0, 
                    count: 0, 
                    critical: 0, 
                    warning: 0,
                    machines: []
                };
            }
            
            // Fetch parts for this machine to calculate risk
            const partsResponse = await fetch(`${API_URL}/machine-parts/machine/${machine.machine_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            let parts = [];
            if (partsResponse.ok) {
                parts = await partsResponse.json();
            }
            
            // Calculate max risk from parts
            let maxRisk = 20; // Default low risk
            let machineRisk = 'Faible';
            
            for (const part of parts) {
                // Get the latest metrics for this part from your sensor_data table
                const metricsResponse = await fetch(`${API_URL}/machine_parts/part_name/${part.id}/latest`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (metricsResponse.ok) {
                    const metrics = await metricsResponse.json();
                    const vib = parseFloat(metrics.vibration) || 0;
                    const temp = parseFloat(metrics.temperature) || 0;
                    
                    let partRisk = 20;
                    if (vib > 2.2 || temp > 80) {
                        partRisk = 80;
                        machineRisk = 'Critique';
                    } else if (vib > 1.6 || temp > 75) {
                        partRisk = 60;
                        if (machineRisk !== 'Critique') machineRisk = 'Élevé';
                    } else if (vib > 1.2 || temp > 70) {
                        partRisk = 40;
                        if (machineRisk !== 'Critique' && machineRisk !== 'Élevé') machineRisk = 'Moyen';
                    }
                    
                    maxRisk = Math.max(maxRisk, partRisk);
                }
            }
            
            depts[deptName].totalRisk += maxRisk;
            depts[deptName].count++;
            depts[deptName].machines.push({
                id: machine.machine_id,
                name: machine.machine_name,
                risk: maxRisk,
                level: machineRisk
            });
            
            if (maxRisk >= 70) depts[deptName].critical++;
            else if (maxRisk >= 50) depts[deptName].warning++;
        }
        
        // Calculate averages
        for (let d in depts) {
            depts[d].avgRisk = depts[d].count > 0 ? Math.round(depts[d].totalRisk / depts[d].count) : 0;
        }
        
        // Store in global variable for later use
        window.departmentSummary = depts;
        
        return depts;
        
    } catch (error) {
        console.error('Error getting department summary:', error);
        return getDeptSummaryFromLocal();
    }
}

// Fallback to local data if API fails
function getDeptSummaryFromLocal() {
    console.log('Using local data for department summary');
    
    if (!window.allPumpsData || Object.keys(window.allPumpsData).length === 0) {
        return {};
    }
    
    let depts = {};
    
    for (let pumpId in window.allPumpsData) {
        const pump = window.allPumpsData[pumpId];
        const dept = pump.dept;
        
        if (!depts[dept]) {
            depts[dept] = { totalRisk: 0, count: 0, critical: 0, warning: 0 };
        }
        
        let maxRisk = 20;
        const metrics = pump.metrics;
        
        if (metrics) {
            const risks = [];
            if (metrics.motor) risks.push(metrics.motor.risk);
            if (metrics.coupling) risks.push(metrics.coupling.risk);
            if (metrics.pump) risks.push(metrics.pump.risk);
            
            for (let risk of risks) {
                if (risk === 'Critique') maxRisk = Math.max(maxRisk, 80);
                else if (risk === 'Élevé') maxRisk = Math.max(maxRisk, 60);
                else if (risk === 'Moyen') maxRisk = Math.max(maxRisk, 40);
                else if (risk === 'Faible') maxRisk = Math.max(maxRisk, 20);
            }
        }
        
        depts[dept].totalRisk += maxRisk;
        depts[dept].count++;
        
        if (maxRisk >= 70) depts[dept].critical++;
        else if (maxRisk >= 50) depts[dept].warning++;
    }
    
    for (let d in depts) {
        depts[d].avgRisk = depts[d].count > 0 ? Math.round(depts[d].totalRisk / depts[d].count) : 0;
    }
    
    return depts;
}

// Render overall dashboard
async function renderOverallDashboard() {
    console.log('renderOverallDashboard called');
    
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
    
    // Show loading state
    document.getElementById('dashboardContent').innerHTML = `
        <div class="machine-title">
            <div class="machine-icon"><i class="fas fa-spinner fa-pulse"></i></div>
            <div class="machine-info">
                <h1>Chargement...</h1>
                <p>Récupération des données depuis la base de données</p>
            </div>
        </div>
    `;
    
    // Fetch data from database
    const depts = await getDeptSummaryFromDB();
    
    // If no data from DB, use local fallback
    if (Object.keys(depts).length === 0) {
        const localDepts = getDeptSummaryFromLocal();
        if (Object.keys(localDepts).length > 0) {
            renderDashboardWithData(localDepts);
        } else {
            renderEmptyDashboard();
        }
    } else {
        renderDashboardWithData(depts);
    }
}

function renderDashboardWithData(depts) {
    const totalMachines = Object.values(depts).reduce((sum, d) => sum + d.count, 0);
    
    let criticalMachines = 0;
    let warningMachines = 0;
    let totalRisk = 0;
    let deptCount = 0;
    
    for (let dept in depts) {
        criticalMachines += depts[dept].critical;
        warningMachines += depts[dept].warning;
        totalRisk += depts[dept].avgRisk;
        deptCount++;
    }
    
    const healthyMachines = totalMachines - criticalMachines - warningMachines;
    const overallRisk = deptCount > 0 ? Math.round(totalRisk / deptCount) : 0;
    
    const html = `
        <div class="overall-dashboard">
            <div class="machine-title">
                <div style="display:flex;align-items:center;gap:20px;">
                    <div class="machine-icon"><i class="fas fa-chart-pie"></i></div>
                    <div class="machine-info">
                        <h1>TABLEAU DE BORD GLOBAL</h1>
                        <p>Supervision multi-sites · ${totalMachines} machines surveillées</p>
                    </div>
                </div>
                <div><span class="badge-online"><i class="fas fa-circle"></i> Vue d'ensemble</span></div>
            </div>
            
            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-industry"></i></div>
                    <div class="kpi-label">Total machines</div>
                    <div class="kpi-value">${totalMachines}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="kpi-label">Critique / Alerte</div>
                    <div class="kpi-value" style="color:#d97777">${criticalMachines}</div>
                    <div class="kpi-trend"><span class="trend-up"><i class="fas fa-arrow-up"></i> ${warningMachines} en surveillance</span></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="kpi-label">Opérationnel</div>
                    <div class="kpi-value" style="color:#2c9e6b">${healthyMachines}</div>
                    <div class="kpi-trend"><span class="trend-down"><i class="fas fa-check"></i> OK</span></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon"><i class="fas fa-chart-line"></i></div>
                    <div class="kpi-label">Risque global</div>
                    <div class="kpi-value" style="color:${overallRisk >= 70 ? '#d97777' : (overallRisk >= 40 ? '#e6b422' : '#2c9e6b')}">${overallRisk}%</div>
                </div>
            </div>
            
            <div class="section-header"><h2><i class="fas fa-building"></i> Risque par département</h2></div>
            <div class="dept-grid" id="deptGrid"></div>
            
            <div class="charts-row">
                <div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Distribution des risques</h3><canvas id="riskChart" height="150"></canvas></div>
                <div class="chart-card"><h3><i class="fas fa-chart-line"></i> Comparaison des risques</h3><canvas id="compareChart" height="150"></canvas></div>
            </div>
            
            <div class="alerts-card">
                <div class="section-header"><h2><i class="fas fa-bell"></i> Alertes critiques</h2></div>
                <div class="alert-list" id="globalAlertsList"></div>
            </div>
            
            <div class="solutions-card">
                <div class="section-header"><h2><i class="fas fa-lightbulb"></i> Actions recommandées</h2></div>
                <div class="solutions-list" id="globalSolutionsList"></div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Render department grid
    const deptGrid = document.getElementById('deptGrid');
    if (deptGrid && Object.keys(depts).length > 0) {
        deptGrid.innerHTML = Object.entries(depts).map(([name, data]) => `
            <div class="dept-card" data-dept="${name}">
                <div class="dept-header">
                    <div class="dept-name">
                        <i class="fas ${getDeptIcon(name)}"></i> 
                        ${escapeHtml(name)}
                    </div>
                    <span class="dept-badge ${data.critical > 0 ? 'badge-critical' : (data.warning > 0 ? 'badge-warning' : 'badge-good')}">
                        ${data.critical > 0 ? 'Critique' : (data.warning > 0 ? 'Alerte' : 'Stable')}
                    </span>
                </div>
                <div class="risk-gauge-bar">
                    <div class="risk-gauge-fill" style="width: ${data.avgRisk}%; background: ${data.avgRisk >= 70 ? '#d97777' : (data.avgRisk >= 40 ? '#e6b422' : '#2c9e6b')}"></div>
                </div>
                <div class="dept-stats">
                    <span>Risque: ${data.avgRisk}%</span>
                    <span>⚠️ ${data.critical} critique</span>
                    <span>📊 ${data.warning} alerte</span>
                </div>
            </div>
        `).join('');
        
        // Add click handlers for department cards
        document.querySelectorAll('.dept-card').forEach(card => {
            card.addEventListener('click', () => {
                const deptName = card.getAttribute('data-dept');
                showNotification(`Département ${deptName}. Sélectionnez une machine dans le menu de gauche.`, 'info');
            });
        });
    }
    
    // Create charts
    const deptNames = Object.keys(depts);
    const riskValues = deptNames.map(d => depts[d].avgRisk);
    const criticalCounts = deptNames.map(d => depts[d].critical);
    
    if (deptNames.length > 0) {
        try {
            const riskChart = new Chart(document.getElementById('riskChart'), { 
                type: 'bar', 
                data: { 
                    labels: deptNames, 
                    datasets: [{ 
                        label: 'Risque moyen (%)', 
                        data: riskValues, 
                        backgroundColor: riskValues.map(v => v >= 70 ? '#d97777' : (v >= 40 ? '#e6b422' : '#2c9e6b')), 
                        borderRadius: 8 
                    }] 
                }, 
                options: { responsive: true, maintainAspectRatio: true } 
            });
            
            new Chart(document.getElementById('compareChart'), { 
                type: 'line', 
                data: { 
                    labels: deptNames, 
                    datasets: [{ 
                        label: 'Machines critiques', 
                        data: criticalCounts, 
                        borderColor: '#d97777', 
                        backgroundColor: 'rgba(217,119,119,0.1)', 
                        fill: true, 
                        tension: 0.3 
                    }] 
                }, 
                options: { responsive: true, maintainAspectRatio: true } 
            });
        } catch(e) {
            console.error('Chart error:', e);
        }
    }
    
    // Generate alerts list
    const alertsList = document.getElementById('globalAlertsList');
    if (alertsList) {
        let alerts = [];
        for (let [name, data] of Object.entries(depts)) {
            if (data.critical > 0) {
                alerts.push(`<div class="alert-row"><div class="alert-icon alert-critical-bg"><i class="fas fa-exclamation-triangle"></i></div><div><strong>${escapeHtml(name)}</strong> - ${data.critical} machine(s) en état critique<br><span style="font-size:0.7rem;color:#64748b;">Intervention immédiate requise</span></div></div>`);
            }
        }
        if (alerts.length === 0) {
            alerts.push('<div class="alert-row"><div class="alert-icon alert-ok-bg"><i class="fas fa-check-circle"></i></div><div>Aucune alerte critique sur l\'ensemble des sites</div></div>');
        }
        alertsList.innerHTML = alerts.join('');
    }
    
    // Generate solutions list
    const solutionsList = document.getElementById('globalSolutionsList');
    if (solutionsList) {
        solutionsList.innerHTML = `
            <div class="solution-item"><h4><i class="fas fa-crosshairs"></i> Maintenance prioritaire</h4><p>Intervention sur machines avec RUL < 100h</p><div class="solution-priority">Priorité haute</div></div>
            <div class="solution-item"><h4><i class="fas fa-chart-line"></i> Surveillance renforcée</h4><p>Risque modéré détecté sur plusieurs machines</p><div class="solution-priority">Priorité moyenne</div></div>
            <div class="solution-item"><h4><i class="fas fa-robot"></i> Planification maintenance</h4><p>Basée sur RUL estimées des machines</p><div class="solution-priority">Planification</div></div>
        `;
    }
}

function renderEmptyDashboard() {
    document.getElementById('dashboardContent').innerHTML = `
        <div class="machine-title">
            <div class="machine-icon"><i class="fas fa-database"></i></div>
            <div class="machine-info">
                <h1>Aucune donnée disponible</h1>
                <p>Veuillez vérifier la connexion à la base de données</p>
            </div>
        </div>
        <div class="alerts-card">
            <div class="alert-list">
                <div class="alert-row">
                    <div class="alert-icon alert-warning-bg">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        Impossible de récupérer les données depuis la base de données.<br>
                        <small>Vérifiez que le serveur API est en cours d'exécution sur ${API_URL}</small>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getDeptIcon(deptName) {
    const name = deptName.toLowerCase();
    if (name.includes('sap')) return 'fa-flask';
    if (name.includes('af') || name.includes('filtration')) return 'fa-tint';
    if (name.includes('cap')) return 'fa-industry';
    if (name.includes('engrais')) return 'fa-leaf';
    return 'fa-building';
}

// Make functions globally available
window.renderOverallDashboard = renderOverallDashboard;
window.getDeptSummaryFromDB = getDeptSummaryFromDB;

console.log('dashboard.js loaded successfully');