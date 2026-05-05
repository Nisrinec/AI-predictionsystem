function getDeptSummary() {
        let depts = { 'SAP': { totalRisk: 0, count: 0, critical: 0, warning: 0 }, 'AF': { totalRisk: 0, count: 0, critical: 0, warning: 0 }, 'CAP': { totalRisk: 0, count: 0, critical: 0, warning: 0 }, 'ENGRAIS': { totalRisk: 0, count: 0, critical: 0, warning: 0 } };
        for (let pump of Object.values(allPumpsData)) {
            let maxRisk = Math.max(
                pump.metrics.motor.risk === 'Critique' ? 80 : (pump.metrics.motor.risk === 'Élevé' ? 60 : (pump.metrics.motor.risk === 'Moyen' ? 40 : 20)),
                pump.metrics.coupling.risk === 'Critique' ? 80 : (pump.metrics.coupling.risk === 'Élevé' ? 60 : (pump.metrics.coupling.risk === 'Moyen' ? 40 : 20)),
                pump.metrics.pump.risk === 'Critique' ? 80 : (pump.metrics.pump.risk === 'Élevé' ? 60 : (pump.metrics.pump.risk === 'Moyen' ? 40 : 20))
            );
            depts[pump.dept].totalRisk += maxRisk;
            depts[pump.dept].count++;
            if (maxRisk >= 70) depts[pump.dept].critical++;
            else if (maxRisk >= 50) depts[pump.dept].warning++;
        }
        for (let d in depts) depts[d].avgRisk = depts[d].count > 0 ? Math.round(depts[d].totalRisk / depts[d].count) : 0;
        return depts;
    }
    
    function renderOverallDashboard() {
          const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
        const depts = getDeptSummary();
        const totalMachines = Object.keys(allPumpsData).length;
        const criticalMachines = Object.values(depts).reduce((a,b) => a + b.critical, 0);
        const warningMachines = Object.values(depts).reduce((a,b) => a + b.warning, 0);
        const healthyMachines = totalMachines - criticalMachines - warningMachines;
        const overallRisk = Math.round(Object.values(depts).reduce((a,b) => a + b.avgRisk, 0) / 4);
        
        const html = `
            <div class="overall-dashboard">
                <div class="machine-title"><div style="display:flex;align-items:center;gap:20px;"><div class="machine-icon"><i class="fas fa-chart-pie"></i></div><div class="machine-info"><h1>TABLEAU DE BORD GLOBAL</h1><p>Supervision multi-sites · ${totalMachines} machines surveillées</p></div></div><div><span class="badge-online"><i class="fas fa-circle"></i> Vue d'ensemble</span></div></div>
                <div class="kpi-grid"><div class="kpi-card"><div class="kpi-icon"><i class="fas fa-industry"></i></div><div class="kpi-label">Total machines</div><div class="kpi-value">${totalMachines}</div></div><div class="kpi-card"><div class="kpi-icon"><i class="fas fa-exclamation-triangle"></i></div><div class="kpi-label">Critique / Alerte</div><div class="kpi-value" style="color:#d97777">${criticalMachines}</div><div class="kpi-trend"><span class="trend-up"><i class="fas fa-arrow-up"></i> ${warningMachines} en surveillance</span></div></div><div class="kpi-card"><div class="kpi-icon"><i class="fas fa-check-circle"></i></div><div class="kpi-label">Opérationnel</div><div class="kpi-value" style="color:#2c9e6b">${healthyMachines}</div><div class="kpi-trend"><span class="trend-down"><i class="fas fa-check"></i> OK</span></div></div><div class="kpi-card"><div class="kpi-icon"><i class="fas fa-chart-line"></i></div><div class="kpi-label">Risque global</div><div class="kpi-value" style="color:${overallRisk >= 70 ? '#d97777' : (overallRisk >= 40 ? '#e6b422' : '#2c9e6b')}">${overallRisk}%</div></div></div>
                <div class="section-header"><h2><i class="fas fa-building"></i> Risque par département</h2></div>
                <div class="dept-grid">${Object.entries(depts).map(([name, data]) => `<div class="dept-card" data-dept="${name}"><div class="dept-header"><div class="dept-name"><i class="fas ${name === 'SAP' ? 'fa-flask' : (name === 'AF' ? 'fa-tint' : (name === 'CAP' ? 'fa-industry' : 'fa-leaf'))}"></i> ${name}</div><span class="dept-badge ${data.critical > 0 ? 'badge-critical' : (data.warning > 0 ? 'badge-warning' : 'badge-good')}">${data.critical > 0 ? 'Critique' : (data.warning > 0 ? 'Alerte' : 'Stable')}</span></div><div class="risk-gauge-bar"><div class="risk-gauge-fill" style="width: ${data.avgRisk}%; background: ${data.avgRisk >= 70 ? '#d97777' : (data.avgRisk >= 40 ? '#e6b422' : '#2c9e6b')}"></div></div><div class="dept-stats"><span>Risque: ${data.avgRisk}%</span><span>⚠️ ${data.critical} critique</span><span>📊 ${data.warning} alerte</span></div></div>`).join('')}</div>
                <div class="charts-row"><div class="chart-card"><h3><i class="fas fa-chart-bar"></i> Distribution des risques</h3><canvas id="riskChart" height="150"></canvas></div><div class="chart-card"><h3><i class="fas fa-chart-line"></i> Comparaison des risques</h3><canvas id="compareChart" height="150"></canvas></div></div>
                <div class="alerts-card"><div class="section-header"><h2><i class="fas fa-bell"></i> Alertes critiques</h2></div><div class="alert-list" id="globalAlertsList"></div></div>
                <div class="solutions-card"><div class="section-header"><h2><i class="fas fa-lightbulb"></i> Actions recommandées</h2></div><div class="solutions-list" id="globalSolutionsList"></div></div>
            </div>
        `;
        document.getElementById('dashboardContent').innerHTML = html;
        
        const deptNames = Object.keys(depts);
        const riskValues = deptNames.map(d => depts[d].avgRisk);
        const criticalCounts = deptNames.map(d => depts[d].critical);
        new Chart(document.getElementById('riskChart'), { type: 'bar', data: { labels: deptNames, datasets: [{ label: 'Risque moyen (%)', data: riskValues, backgroundColor: riskValues.map(v => v >= 70 ? '#d97777' : (v >= 40 ? '#e6b422' : '#2c9e6b')), borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } } } });
        new Chart(document.getElementById('compareChart'), { type: 'line', data: { labels: deptNames, datasets: [{ label: 'Machines critiques', data: criticalCounts, borderColor: '#d97777', backgroundColor: 'rgba(217,119,119,0.1)', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: true } });
        
        let alerts = [];
        for (let [name, data] of Object.entries(depts)) { if (data.critical > 0) alerts.push(`<div class="alert-row"><div class="alert-icon alert-critical-bg"><i class="fas fa-exclamation-triangle"></i></div><div><strong>${name}</strong> - ${data.critical} machine(s) en état critique<br><span style="font-size:0.7rem;color:#64748b;">Intervention immédiate requise</span></div></div>`); }
        if (alerts.length === 0) alerts.push('<div class="alert-row"><div class="alert-icon alert-ok-bg"><i class="fas fa-check-circle"></i></div><div>Aucune alerte critique sur l\'ensemble des sites</div></div>');
        document.getElementById('globalAlertsList').innerHTML = alerts.join('');
        
        document.getElementById('globalSolutionsList').innerHTML = `
            <div class="solution-item"><h4><i class="fas fa-crosshairs"></i> Maintenance prioritaire AF</h4><p>Intervention sur pompe AF-102 (RUL: 48h)</p><div class="solution-priority">Priorité haute</div></div>
            <div class="solution-item"><h4><i class="fas fa-chart-line"></i> Surveillance renforcée ENGRAIS</h4><p>Risque modéré détecté sur EN-300</p><div class="solution-priority">Priorité moyenne</div></div>
            <div class="solution-item"><h4><i class="fas fa-robot"></i> Planification maintenance</h4><p>Basée sur RUL estimées des 8 machines</p><div class="solution-priority">Planification</div></div>
        `;
        document.querySelectorAll('.dept-card').forEach(card => { card.addEventListener('click', () => { alert(`Département ${card.getAttribute('data-dept')}\nCliquez sur une machine dans le menu pour voir les détails.`); }); });
    }
    
    // ========== PUMP DASHBOARD ==========
    let currentMetrics = null;
    let currentFilter = "motor";
    let mainChart = null;