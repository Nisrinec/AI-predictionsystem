function renderPumpDashboard(pumpId) {
          const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
        const pump = allPumpsData[pumpId];
        if (!pump) return;
        const m = pump.metrics;
        
        const problems = [
            { name: "Vibrations anormales", icon: "fas fa-gear", motor: getProblemRisk('motor','vibrations', m), coupling: getProblemRisk('coupling','vibrations', m), pump: getProblemRisk('pump','vibrations', m) },
            { name: "Surchauffe", icon: "fas fa-thermometer-half", motor: getProblemRisk('motor','surchauffe', m), coupling: getProblemRisk('coupling','surchauffe', m), pump: getProblemRisk('pump','surchauffe', m) },
            { name: "Défaut mécanique", icon: "fas fa-cogs", motor: getProblemRisk('motor','mecanique', m), coupling: getProblemRisk('coupling','mecanique', m), pump: getProblemRisk('pump','mecanique', m) },
            { name: "Panne soudaine", icon: "fas fa-exclamation-triangle", motor: getProblemRisk('motor','panne', m), coupling: getProblemRisk('coupling','panne', m), pump: getProblemRisk('pump','panne', m) }
        ];
        
        const problemsHtml = problems.map(p => `
            <div class="problem-card" style="border-left-color: ${p.motor === 'Critique' ? '#d97777' : (p.motor === 'Élevé' ? '#e6b422' : '#2c9e6b')}">
                <div class="problem-icon"><i class="${p.icon}"></i></div>
                <div class="problem-title">${p.name}</div>
                <div class="risk-levels">
                    <div class="risk-item"><div class="risk-label">Moteur</div><div class="risk-value ${getRiskClass(p.motor)}">${p.motor}</div></div>
                    <div class="risk-item"><div class="risk-label">Accoupl.</div><div class="risk-value ${getRiskClass(p.coupling)}">${p.coupling}</div></div>
                    <div class="risk-item"><div class="risk-label">Pompe</div><div class="risk-value ${getRiskClass(p.pump)}">${p.pump}</div></div>
                </div>
            </div>
        `).join('');
        
        const pumpHtml = `
            <div class="machine-title">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div class="machine-icon"><i class="fas fa-oil-can"></i></div>
                    <div class="machine-info"><h1>${pump.name}</h1><p>Département ${pump.dept} · Unité de production</p></div>
                </div>
                  <div style="display: flex; align-items: center; gap: 12px;">
        <button id="notifyBellBtn" class="bell-icon-btn" style="background: ${isSubscribed(pumpId) ? '#2c9e6b' : '#f1f5f9'}; color: ${isSubscribed(pumpId) ? 'white' : '#334155'};">
            <i class="fas fa-bell"></i>
        </button>
        <span class="badge-online"><i class="fas fa-circle" style="font-size: 0.6rem;"></i> ${pump.status}</span>
    </div>
            </div>
            <div class="components-grid">
                <div class="component-card"><div class="comp-header"><div class="comp-name"><i class="fas fa-microchip"></i> MOTEUR</div><span class="status-indicator ${m.motor.risk === 'Élevé' ? 'status-warning' : (m.motor.risk === 'Critique' ? 'status-critical' : 'status-good')}"></span></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-waveform"></i> Accélération</div><div class="metric-row"><span class="metric-label">Valeur (m/s²)</span><span class="metric-value" id="motorAcc">${m.motor.acc}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="motorAccFill" style="width:${(m.motor.acc/5)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-thermometer-half"></i> Température</div><div class="metric-row"><span class="metric-label">Valeur (°C)</span><span class="metric-value" id="motorTemp">${m.motor.temp}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="motorTempFill" style="width:${(m.motor.temp/100)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-chart-line"></i> Vibration</div><div class="metric-row"><span class="metric-label">Valeur (mm/s)</span><span class="metric-value" id="motorVib">${m.motor.vib}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="motorVibFill" style="width:${(m.motor.vib/4)*100}%"></div></div></div>
                    <div class="metric-row"><span class="metric-label">Risque actuel</span><span class="metric-value ${m.motor.risk === 'Élevé' ? 'risk-medium' : (m.motor.risk === 'Critique' ? 'risk-high' : 'risk-low')}">${m.motor.risk}</span></div>
                    <div class="metric-row"><span class="metric-label">RUL estimée</span><span class="metric-value">~${m.motor.rul} heures</span></div>
                </div>
                <div class="component-card"><div class="comp-header"><div class="comp-name"><i class="fas fa-link"></i> ACCOUPLEMENT</div><span class="status-indicator ${m.coupling.risk === 'Élevé' ? 'status-warning' : (m.coupling.risk === 'Critique' ? 'status-critical' : 'status-good')}"></span></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-waveform"></i> Accélération</div><div class="metric-row"><span class="metric-label">Valeur (m/s²)</span><span class="metric-value" id="couplingAcc">${m.coupling.acc}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="couplingAccFill" style="width:${(m.coupling.acc/5)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-thermometer-half"></i> Température</div><div class="metric-row"><span class="metric-label">Valeur (°C)</span><span class="metric-value" id="couplingTemp">${m.coupling.temp}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="couplingTempFill" style="width:${(m.coupling.temp/90)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-chart-line"></i> Vibration</div><div class="metric-row"><span class="metric-label">Valeur (mm/s)</span><span class="metric-value" id="couplingVib">${m.coupling.vib}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="couplingVibFill" style="width:${(m.coupling.vib/4)*100}%"></div></div></div>
                    <div class="metric-row"><span class="metric-label">Risque actuel</span><span class="metric-value ${m.coupling.risk === 'Élevé' ? 'risk-medium' : (m.coupling.risk === 'Critique' ? 'risk-high' : 'risk-low')}">${m.coupling.risk}</span></div>
                    <div class="metric-row"><span class="metric-label">RUL estimée</span><span class="metric-value">~${m.coupling.rul} heures</span></div>
                </div>
                <div class="component-card"><div class="comp-header"><div class="comp-name"><i class="fas fa-water"></i> POMPE</div><span class="status-indicator ${m.pump.risk === 'Élevé' ? 'status-warning' : (m.pump.risk === 'Critique' ? 'status-critical' : 'status-good')}"></span></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-waveform"></i> Accélération</div><div class="metric-row"><span class="metric-label">Valeur (m/s²)</span><span class="metric-value" id="pumpAcc">${m.pump.acc}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="pumpAccFill" style="width:${(m.pump.acc/3)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-thermometer-half"></i> Température</div><div class="metric-row"><span class="metric-label">Valeur (°C)</span><span class="metric-value" id="pumpTemp">${m.pump.temp}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="pumpTempFill" style="width:${(m.pump.temp/85)*100}%"></div></div></div>
                    <div class="sensor-group"><div class="sensor-title"><i class="fas fa-chart-line"></i> Vibration</div><div class="metric-row"><span class="metric-label">Valeur (mm/s)</span><span class="metric-value" id="pumpVib">${m.pump.vib}</span></div><div class="progress-bar-bg"><div class="progress-fill" id="pumpVibFill" style="width:${(m.pump.vib/3)*100}%"></div></div></div>
                    <div class="metric-row"><span class="metric-label">Risque actuel</span><span class="metric-value ${m.pump.risk === 'Élevé' ? 'risk-medium' : (m.pump.risk === 'Critique' ? 'risk-high' : 'risk-low')}">${m.pump.risk}</span></div>
                    <div class="metric-row"><span class="metric-label">RUL estimée</span><span class="metric-value">~${m.pump.rul} heures</span></div>
                </div>
            </div>
            <div class="diagnostic-section"><div class="section-title"><i class="fas fa-stethoscope"></i> Diagnostic des problèmes potentiels</div><div class="problems-grid">${problemsHtml}</div></div>
            <div class="prediction-main"><div class="section-title"><i class="fas fa-chart-line"></i> Prédiction H+12 - Évolution vibratoire</div>
                <div class="filter-buttons"><button class="filter-btn active" data-filter="motor">Moteur</button><button class="filter-btn" data-filter="coupling">Accouplement</button><button class="filter-btn" data-filter="pump">Pompe</button></div>
                <canvas id="mainPredictionChart" height="200"></canvas><div class="prediction-stats-row" id="predictionStats"></div>
            </div>
            <div class="alerts-panel"><div class="section-title"><i class="fas fa-exclamation-triangle"></i> Alertes prédictives H+12</div>
                <div class="alerts-container" id="alertsContainer"></div>
            </div>
            <div class="solutions-panel"><div class="section-title"><i class="fas fa-lightbulb"></i> Solutions proposées</div>
                <div class="solutions-grid" id="solutionsGrid"></div>
            </div>
        `;
        document.getElementById('dashboardContent').innerHTML = pumpHtml;
        
        initMainChart(m);
        currentMetrics = m;
        updateMainChart(m);
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                updateMainChart(m);
            });
        });
    const notifyBtn = document.getElementById('notifyBellBtn');
if (notifyBtn) {
    // Remove any existing listeners
    const newNotifyBtn = notifyBtn.cloneNode(true);
    notifyBtn.parentNode.replaceChild(newNotifyBtn, notifyBtn);
    
    newNotifyBtn.addEventListener('click', async () => {
        const machineName = pump.name;
        const machineId = pump.id;
        
        // Get user info from session
        const session = localStorage.getItem('ipredict_session');
        const user = JSON.parse(session || '{}');
        
        if (!user.email) {
            showNotification('❌ Email utilisateur non trouvé. Veuillez vous reconnecter.', 'error');
            return;
        }
        
        // Ask for confirmation
        // const confirmSend = confirm(`📧 Envoyer une alerte à ${user.email} concernant "${machineName}" ?\n\n⚠️ La machine risque de tomber en panne dans les 12 heures.`);
        
        // if (!confirmSend) return;
        
        // Show loading state
        const originalIcon = newNotifyBtn.innerHTML;
        newNotifyBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
        newNotifyBtn.disabled = true;
        
        // Send the email
        await sendPredictionEmail(machineName, machineId);
        
        // Update subscription (optional)
        const nowSubscribed = toggleSubscription(pumpId);
        newNotifyBtn.style.background = nowSubscribed ? '#2c9e6b' : '#f1f5f9';
        newNotifyBtn.style.color = nowSubscribed ? 'white' : '#334155';
        
        // Restore button
        newNotifyBtn.innerHTML = originalIcon;
        newNotifyBtn.disabled = false;
    });
}
        document.getElementById('alertsContainer').innerHTML = `
            <div class="alert-item alert-warning"><i class="fas fa-chart-line"></i> <strong>Moteur:</strong> ${getExplanation('motor', m)}</div>
            <div class="alert-item alert-critical"><i class="fas fa-cog"></i> <strong>Accouplement:</strong> ${getExplanation('coupling', m)} - Intervention requise (RUL: ${m.coupling.rul}h)</div>
            <div class="alert-item alert-ok"><i class="fas fa-check-circle"></i> <strong>Pompe:</strong> ${getExplanation('pump', m)}</div>
        `;
        
        document.getElementById('solutionsGrid').innerHTML = `
            <div class="solution-card"><div class="solution-icon"><i class="fas fa-crosshairs"></i></div><div class="solution-title">Realignement accouplement urgent</div><div class="solution-desc">Désalignement ${m.coupling.align}mm, vibration ${m.coupling.vib}mm/s. Réalignement laser dans les 8h.</div><div class="priority">Priorité haute</div></div>
            <div class="solution-card"><div class="solution-icon"><i class="fas fa-microchip"></i></div><div class="solution-title">Équilibrage moteur préventif</div><div class="solution-desc">Vibration ${m.motor.vib}mm/s → ${m.motor.predVib}mm/s prévu. Inspection roulements.</div><div class="priority">Priorité moyenne</div></div>
            <div class="solution-card"><div class="solution-icon"><i class="fas fa-thermometer-half"></i></div><div class="solution-title">Surveillance thermique</div><div class="solution-desc">Température moteur ${m.motor.temp}°C. Vérifier circuit de refroidissement.</div><div class="priority">Surveillance</div></div>
        `;
    }
    function getProblemRisk(component, type, metrics) {
        if(type === 'vibrations') return metrics[component].vib > 2.2 ? 'Critique' : (metrics[component].vib > 1.6 ? 'Élevé' : 'Modéré');
        if(type === 'surchauffe') return metrics[component].temp > 80 ? 'Critique' : (metrics[component].temp > 75 ? 'Élevé' : (metrics[component].temp > 70 ? 'Modéré' : 'Faible'));
        if(type === 'mecanique') return metrics[component].acc > 3.5 ? 'Critique' : (metrics[component].acc > 2.5 ? 'Élevé' : 'Modéré');
        if(type === 'panne') return (metrics[component].vib > 2.0 && metrics[component].temp > 75 && metrics[component].acc > 3.0) ? 'Critique' : 'Modéré';
        return 'Faible';
    }
    function updateMainChart(metrics) {
        const labels = ['Maintenant', '+2h', '+4h', '+6h', '+8h', '+12h'];
        const data = getPredictionData(currentFilter, metrics);
        const threshold = getThreshold(currentFilter);
        const thresholdData = Array(labels.length).fill(threshold);
        const colors = { motor: '#2c9e6b', coupling: '#e6b422', pump: '#3b82f6' };
        
        if (mainChart) {
            mainChart.data.datasets[0].data = data;
            mainChart.data.datasets[0].borderColor = colors[currentFilter];
            mainChart.data.datasets[0].label = `${currentFilter === 'motor' ? 'Moteur' : (currentFilter === 'coupling' ? 'Accouplement' : 'Pompe')} - Vibration (mm/s)`;
            mainChart.data.datasets[1].data = thresholdData;
            mainChart.update();
        }
        
        const comp = metrics[currentFilter];
        const riskClass = comp.futureRisk === 'Critique' ? 'risk-critical-text' : (comp.futureRisk === 'Élevé' ? 'risk-high-text' : (comp.futureRisk === 'Moyen' ? 'risk-medium-text' : 'risk-low-text'));
        document.getElementById('predictionStats').innerHTML = `
            <div class="pred-stat-card"><div class="metric-label">Vibration actuelle</div><div class="metric-value" style="font-size:1.2rem;">${comp.vib.toFixed(2)} mm/s</div></div>
            <div class="pred-stat-card"><div class="metric-label">Vibration prévue H+12</div><div class="metric-value" style="font-size:1.2rem;">${comp.predVib.toFixed(2)} mm/s</div></div>
            <div class="pred-stat-card"><div class="metric-label">Seuil critique</div><div class="metric-value" style="font-size:1.2rem;">${threshold} mm/s</div></div>
            <div class="pred-stat-card"><div class="metric-label">Risque futur</div><div class="metric-value ${riskClass}" style="font-size:1.2rem;">${comp.futureRisk}</div></div>
            <div class="pred-stat-card"><div class="metric-label">RUL estimée</div><div class="metric-value" style="font-size:1.2rem;">~${comp.rul} heures</div></div>
        `;
    }
    function initMainChart(metrics) {
        const ctx = document.getElementById('mainPredictionChart').getContext('2d');
        const labels = ['Maintenant', '+2h', '+4h', '+6h', '+8h', '+12h'];
        const data = getPredictionData('motor', metrics);
        const thresholdData = Array(labels.length).fill(2.5);
        if (mainChart) mainChart.destroy();
        mainChart = new Chart(ctx, {
            type: 'line', data: { labels: labels, datasets: [{ label: 'Moteur - Vibration (mm/s)', data: data, borderColor: '#2c9e6b', backgroundColor: 'rgba(44,158,107,0.05)', borderWidth: 3, tension: 0.3, fill: true, pointRadius: 5, pointBackgroundColor: '#2c9e6b' }, { label: 'Seuil critique', data: thresholdData, borderColor: '#d97777', borderWidth: 2, borderDash: [6, 6], fill: false, pointRadius: 0 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top', labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(2)} mm/s` } } }, scales: { y: { title: { display: true, text: 'Vibration (mm/s)' }, beginAtZero: true, max: 5 } } }
        });
    }