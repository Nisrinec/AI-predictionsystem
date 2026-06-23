// ========== DASHBOARD MODULE - NEW DESIGN ==========
console.log('dashboard.js loading... (Modern Design)');

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

// Render overall dashboard - NEW DESIGN
async function renderOverallDashboard() {
    console.log('renderOverallDashboard called - New Design');
    
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
    
    // Show loading state with new design
    document.getElementById('dashboardContent').innerHTML = `
        <div class="modern-loading">
            <div class="loading-spinner"></div>
            <h3>Chargement du tableau de bord</h3>
            <p>Récupération des données depuis la base de données...</p>
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

// NEW RENDER FUNCTION - Different design, same colors
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
    const riskColor = overallRisk >= 70 ? '#d97777' : (overallRisk >= 40 ? '#e6b422' : '#2c9e6b');
    
    // NEW MODERN HTML STRUCTURE
    const html = `
        <style>
            /* Modern Dashboard Styles - Same Colors, Fresh Design */
            .modern-dashboard {
                animation: fadeIn 0.4s ease;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            /* Header Section */
            .modern-header-strip {
                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                border-radius: 24px;
                padding: 1.5rem 2rem;
                margin-bottom: 2rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 1rem;
                border: 1px solid #eef2f8;
                box-shadow: 0 2px 8px rgba(0,0,0,0.02);
            }
            
            .header-title-section h1 {
                font-size: 1.6rem;
                font-weight: 700;
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                background-clip: text;
                -webkit-background-clip: text;
                color: transparent;
            }
            
            .header-title-section p {
                color: #64748b;
                font-size: 0.85rem;
                margin-top: 0.25rem;
            }
            
            .header-stats-row {
                display: flex;
                gap: 1rem;
                flex-wrap: wrap;
            }
            
            .stat-pill-new {
                background: #f1f5f9;
                border-radius: 40px;
                padding: 0.5rem 1.2rem;
                display: flex;
                align-items: center;
                gap: 0.6rem;
                font-size: 0.85rem;
                font-weight: 500;
                border: 1px solid #e2e8f0;
            }
            
            /* KPI Cards - New Layout */
            .kpi-grid-modern {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 1.2rem;
                margin-bottom: 2rem;
            }
            
            .kpi-card-modern {
                background: white;
                border-radius: 20px;
                padding: 1.2rem 1.3rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                transition: all 0.2s ease;
                border: 1px solid #edf2f7;
                box-shadow: 0 2px 6px rgba(0,0,0,0.02);
            }
            
            .kpi-card-modern:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 20px -12px rgba(0,0,0,0.1);
            }
            
            .kpi-info .kpi-label-small {
                font-size: 0.7rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-weight: 600;
                color: #64748b;
            }
            
            .kpi-info .kpi-number-big {
                font-size: 2rem;
                font-weight: 800;
                line-height: 1.2;
                margin-top: 0.2rem;
            }
            
            .kpi-icon-wrapper {
                width: 50px;
                height: 50px;
                background: #f1f5f9;
                border-radius: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.4rem;
            }
            
            /* Section Headers */
            .section-header-modern {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                margin: 1.8rem 0 1.2rem 0;
                flex-wrap: wrap;
            }
            
            .section-header-modern h2 {
                font-size: 1.25rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 0.6rem;
            }
            
            /* Department Grid - Horizontal Tiles (Different from original) */
            .dept-horizontal-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 1.2rem;
                margin-bottom: 1.5rem;
            }
            
            .dept-modern-tile {
                flex: 1 1 230px;
                background: white;
                border-radius: 20px;
                padding: 1rem 1.2rem;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid #eef2f8;
                position: relative;
                overflow: hidden;
            }
            
            .dept-modern-tile:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 20px -12px rgba(0,0,0,0.12);
                border-color: #e2e8f0;
            }
            
            .dept-tile-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.7rem;
            }
            
            .dept-name-modern {
                font-weight: 700;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .dept-status-badge {
                font-size: 0.65rem;
                font-weight: 700;
                padding: 0.2rem 0.7rem;
                border-radius: 20px;
            }
            
            .risk-bar-modern {
                height: 6px;
                background: #eef2f6;
                border-radius: 10px;
                overflow: hidden;
                margin: 0.8rem 0;
            }
            
            .risk-fill-modern {
                height: 100%;
                width: 0%;
                border-radius: 10px;
                transition: width 0.3s;
            }
            
            .dept-stats-modern {
                display: flex;
                justify-content: space-between;
                font-size: 0.7rem;
                color: #5b6e8c;
                margin-top: 0.6rem;
            }
            
            /* Charts Row */
            .charts-modern-row {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 1.2rem;
                margin: 1.5rem 0;
            }
            
            .chart-modern-card {
                background: white;
                border-radius: 20px;
                padding: 1.2rem;
                border: 1px solid #eef2f8;
            }
            
            .chart-modern-card h3 {
                font-size: 0.95rem;
                margin-bottom: 1rem;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            /* Bottom Grid */
            .bottom-modern-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
                gap: 1.2rem;
                margin-top: 1rem;
            }
            
            .info-modern-card {
                background: white;
                border-radius: 20px;
                padding: 1.2rem;
                border: 1px solid #eef2f8;
            }
            
            .info-modern-card h3 {
                font-size: 1rem;
                margin-bottom: 1rem;
                font-weight: 700;
                display: flex;
                align-items: center;
                gap: 0.6rem;
                border-bottom: 2px solid #f1f5f9;
                padding-bottom: 0.7rem;
            }
            
            .alert-modern-row {
                display: flex;
                gap: 0.9rem;
                padding: 0.8rem 0;
                border-bottom: 1px solid #f0f4fa;
                align-items: center;
            }
            
            .alert-icon-modern {
                width: 38px;
                height: 38px;
                border-radius: 12px;
                background: #fee9e6;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #d97777;
                font-size: 0.9rem;
            }
            
            .alert-icon-ok-modern {
                background: #e3f5ec;
                color: #2c9e6b;
            }
            
            .solution-modern-item {
                padding: 0.8rem 0;
                border-bottom: 1px solid #f0f4fa;
            }
            
            .solution-modern-item h4 {
                font-size: 0.85rem;
                margin-bottom: 0.3rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .priority-modern-tag {
                display: inline-block;
                background: #f1f5f9;
                border-radius: 20px;
                padding: 0.2rem 0.7rem;
                font-size: 0.65rem;
                font-weight: 600;
                margin-top: 0.4rem;
            }
            
            .loading-spinner {
                width: 50px;
                height: 50px;
                border: 3px solid #eef2f6;
                border-top-color: #2c9e6b;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 1rem;
            }
            
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            
            .modern-loading {
                text-align: center;
                padding: 3rem;
                background: white;
                border-radius: 28px;
            }
        </style>
        
        <div class="modern-dashboard">
            <!-- Modern Header -->
            <div class="modern-header-strip">
                <div class="header-title-section">
                    <h1><i class="fas fa-gear" style="color:#2c9e6b; margin-right: 8px;"></i><b>Tableau de bord Global</b></h1>
                    <p>Supervision prédictive · ${totalMachines} machines surveillées</p>
                </div>
                <div class="header-stats-row">
                    <div class="stat-pill-new"><i class="fas fa-circle" style="color:#2c9e6b; font-size: 0.6rem;"></i> ${totalMachines} actifs</div>
                    <div class="stat-pill-new" style="background:#fee9e6;"><i class="fas fa-exclamation-triangle" style="color:#d97777"></i> ${criticalMachines} critique</div>
                    <div class="stat-pill-new" style="background:#e6faf0;"><i class="fas fa-check-circle" style="color:#2c9e6b"></i> ${healthyMachines} sains</div>
                </div>
            </div>
            
            <!-- KPI Cards - New Design -->
            <div class="kpi-grid-modern">
                <div class="kpi-card-modern">
                    <div class="kpi-info">
                        <div class="kpi-label-small">PARC TOTAL</div>
                        <div class="kpi-number-big">${totalMachines}</div>
                        <small>équipements</small>
                    </div>
                    <div class="kpi-icon-wrapper"><i class="fas fa-industry"></i></div>
                </div>
                <div class="kpi-card-modern">
                    <div class="kpi-info">
                        <div class="kpi-label-small">URGENCE</div>
                        <div class="kpi-number-big" style="color:#d97777">${criticalMachines}</div>
                        <small>intervention immédiate</small>
                    </div>
                    <div class="kpi-icon-wrapper" style="background:#fee9e6;"><i class="fas fa-exclamation-triangle" style="color:#d97777"></i></div>
                </div>
                <div class="kpi-card-modern">
                    <div class="kpi-info">
                        <div class="kpi-label-small">SURVEILLANCE</div>
                        <div class="kpi-number-big" style="color:#e6b422">${warningMachines}</div>
                        <small>risque modéré</small>
                    </div>
                    <div class="kpi-icon-wrapper" style="background:#fff0db;"><i class="fas fa-chart-line" style="color:#e6b422"></i></div>
                </div>
                <div class="kpi-card-modern">
                    <div class="kpi-info">
                        <div class="kpi-label-small">RISQUE GLOBAL</div>
                        <div class="kpi-number-big" style="color:${riskColor}">${overallRisk}%</div>
                        <small>moyenne départements</small>
                    </div>
                    <div class="kpi-icon-wrapper"><i class="fas fa-gauge-high" style="color:${riskColor}"></i></div>
                </div>
            </div>
            
            <!-- Department Section -->
            <div class="section-header-modern">
                <h2><i class="fas fa-building"></i> Départements</h2>
                
            </div>
            <div class="dept-horizontal-grid" id="modernDeptGrid"></div>
            
            <!-- Charts Section -->
            <div class="charts-modern-row">
                <div class="chart-modern-card">
                    <h3><i class="fas fa-chart-bar" style="color:#2c9e6b"></i> Risque moyen par département (%)</h3>
                    <canvas id="riskChartModern" height="150"></canvas>
                </div>
                <div class="chart-modern-card">
                    <h3><i class="fas fa-chart-line" style="color:#d97777"></i> Distribution des machines critiques</h3>
                    <canvas id="criticalChartModern" height="150"></canvas>
                </div>
            </div>
            
            <!-- Alerts & Solutions -->
            <div class="bottom-modern-grid">
                <div class="info-modern-card">
                    <h3><i class="fas fa-bell" style="color:#e6b422"></i> Alertes actives</h3>
                    <div id="modernAlertsContainer"></div>
                </div>
                <div class="info-modern-card">
                    <h3><i class="fas fa-clipboard-list"></i> Actions recommandées</h3>
                    <div id="modernSolutionsContainer"></div>
                </div>
            </div>
        </div>
    `;
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Render Department Tiles
    const deptGridContainer = document.getElementById('modernDeptGrid');
    if (deptGridContainer && Object.keys(depts).length > 0) {
        deptGridContainer.innerHTML = Object.entries(depts).map(([name, data]) => {
            const fillColor = data.avgRisk >= 70 ? '#d97777' : (data.avgRisk >= 40 ? '#e6b422' : '#2c9e6b');
            const statusText = data.critical > 0 ? 'Critique' : (data.warning > 0 ? 'Alerte' : 'Stable');
            const statusBg = data.critical > 0 ? '#fee9e6' : (data.warning > 0 ? '#fff0db' : '#e6faf0');
            const statusColor = data.critical > 0 ? '#d97777' : (data.warning > 0 ? '#e6b422' : '#2c9e6b');
            return `
                <div class="dept-modern-tile" data-dept="${escapeHtml(name)}">
                    <div class="dept-tile-header">
                        <div class="dept-name-modern">
                            <i class="fas ${getDeptIcon(name)}" style="color:#4f6f8f"></i>
                            <span>${escapeHtml(name)}</span>
                        </div>
                        <div class="dept-status-badge" style="background:${statusBg}; color:${statusColor}">${statusText}</div>
                    </div>
                    <div class="risk-bar-modern">
                        <div class="risk-fill-modern" style="width: ${data.avgRisk}%; background:${fillColor};"></div>
                    </div>
                    <div class="dept-stats-modern">
                        <span><i class="fas fa-chart-simple"></i> ${data.avgRisk}%</span>
                        <span><i class="fas fa-exclamation-circle"></i> ${data.critical} crit.</span>
                        <span><i class="fas fa-eye"></i> ${data.warning} alert.</span>
                        <span><i class="fas fa-microchip"></i> ${data.count}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        document.querySelectorAll('.dept-modern-tile').forEach(card => {
            card.addEventListener('click', () => {
                const deptName = card.getAttribute('data-dept');
                showNotification(`Département ${deptName}. Sélectionnez une machine dans le menu de gauche.`, 'info');
            });
        });
    }
    
    // Render Alerts
    const alertsContainer = document.getElementById('modernAlertsContainer');
    if (alertsContainer) {
        let alertsHtml = '';
        let hasAlert = false;
        for (let [name, data] of Object.entries(depts)) {
            if (data.critical > 0) {
                hasAlert = true;
                alertsHtml += `
                    <div class="alert-modern-row">
                        <div class="alert-icon-modern"><i class="fas fa-bolt"></i></div>
                        <div><strong>${escapeHtml(name)}</strong> · ${data.critical} machine(s) critique(s)<br><small style="color:#64748b">Intervention immédiate requise</small></div>
                    </div>
                `;
            } else if (data.warning > 0) {
                alertsHtml += `
                    <div class="alert-modern-row">
                        <div class="alert-icon-modern" style="background:#fff0db; color:#e6b422"><i class="fas fa-clock"></i></div>
                        <div><strong>${escapeHtml(name)}</strong> · ${data.warning} alerte(s) modérée(s)<br><small style="color:#64748b">Surveillance recommandée</small></div>
                    </div>
                `;
            }
        }
        if (!hasAlert && alertsHtml === '') {
            alertsHtml = `<div class="alert-modern-row"><div class="alert-icon-modern alert-icon-ok-modern"><i class="fas fa-check-circle"></i></div><div>Aucune alerte critique sur l'ensemble des sites</div></div>`;
        }
        alertsContainer.innerHTML = alertsHtml;
    }
    
    // Render Solutions
    const solutionsContainer = document.getElementById('modernSolutionsContainer');
    if (solutionsContainer) {
        solutionsContainer.innerHTML = `
            <div class="solution-modern-item">
                <h4><i class="fas fa-crosshairs" style="color:#d97777"></i> Maintenance prioritaire</h4>
                <p style="font-size:0.75rem">Intervention sur ${criticalMachines} machine(s) avec risque critique</p>
                <span class="priority-modern-tag" style="background:#fee9e6; color:#d97777">Haute priorité</span>
            </div>
            <div class="solution-modern-item">
                <h4><i class="fas fa-chart-line" style="color:#e6b422"></i> Surveillance renforcée</h4>
                <p style="font-size:0.75rem">${warningMachines} machine(s) en alerte · planifier inspection</p>
                <span class="priority-modern-tag" style="background:#fff0db; color:#e6b422">Priorité moyenne</span>
            </div>
            <div class="solution-modern-item">
                <h4><i class="fas fa-robot" style="color:#2c9e6b"></i> Planification maintenance</h4>
                <p style="font-size:0.75rem">Basée sur RUL estimées des machines</p>
                <span class="priority-modern-tag">Planification</span>
            </div>
        `;
    }
    
    // Create Charts
    const deptNames = Object.keys(depts);
    const riskValues = deptNames.map(d => depts[d].avgRisk);
    const criticalCounts = deptNames.map(d => depts[d].critical);
    
    if (deptNames.length > 0) {
        setTimeout(() => {
            try {
                const ctxBar = document.getElementById('riskChartModern')?.getContext('2d');
                const ctxLine = document.getElementById('criticalChartModern')?.getContext('2d');
                
                if (ctxBar) {
                    new Chart(ctxBar, {
                        type: 'bar',
                        data: {
                            labels: deptNames,
                            datasets: [{
                                label: 'Risque moyen (%)',
                                data: riskValues,
                                backgroundColor: riskValues.map(v => v >= 70 ? '#d97777' : (v >= 40 ? '#e6b422' : '#2c9e6b')),
                                borderRadius: 8,
                                barPercentage: 0.65
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } }
                    });
                }
                
                if (ctxLine) {
                    new Chart(ctxLine, {
                        type: 'line',
                        data: {
                            labels: deptNames,
                            datasets: [{
                                label: 'Machines critiques',
                                data: criticalCounts,
                                borderColor: '#d97777',
                                backgroundColor: 'rgba(217,119,119,0.05)',
                                borderWidth: 3,
                                pointBackgroundColor: '#d97777',
                                pointRadius: 4,
                                fill: true,
                                tension: 0.2
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: true }
                    });
                }
            } catch(e) {
                console.error('Chart error:', e);
            }
        }, 100);
    }
}

function renderEmptyDashboard() {
    document.getElementById('dashboardContent').innerHTML = `
        <div class="modern-loading">
            <i class="fas fa-database fa-3x" style="color:#94a3b8"></i>
            <h3 style="margin-top: 1rem;">Aucune donnée disponible</h3>
            <p>Veuillez vérifier la connexion à la base de données</p>
            <small style="color:#64748b;">API: ${API_URL}</small>
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

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showNotification(message, type) {
    const toast = document.createElement('div');
    toast.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#1e293b';
    toast.style.color = 'white';
    toast.style.padding = '0.75rem 1.5rem';
    toast.style.borderRadius = '40px';
    toast.style.fontSize = '0.85rem';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Make functions globally available
window.renderOverallDashboard = renderOverallDashboard;
window.getDeptSummaryFromDB = getDeptSummaryFromDB;

console.log('dashboard.js loaded successfully - Modern Design with original color pattern (Green #2c9e6b, Yellow #e6b422, Red #d97777)');