// ========== PUMP DASHBOARD MODULE ==========
console.log('pump.js loading...');

// Global variables
let mainChart = null;
let currentFilter = "motor";
let currentMetrics = null;
let currentMachineParts = [];

// Get icon for part name
function getPartIcon(partName) {
    const name = partName.toLowerCase();
    if (name.includes('moteur') || name.includes('motor')) return 'fas fa-microchip';
    if (name.includes('accouplement') || name.includes('coupling')) return 'fas fa-link';
    if (name.includes('pompe') || name.includes('pump')) return 'fas fa-water';
    if (name.includes('roulement') || name.includes('bearing')) return 'fas fa-cog';
    if (name.includes('joint') || name.includes('seal')) return 'fas fa-circle';
    if (name.includes('ventilateur') || name.includes('fan')) return 'fas fa-fan';
    if (name.includes('courroie') || name.includes('belt')) return 'fas fa-grip-lines';
    return 'fas fa-cube';
}

// Generate realistic metrics for a part based on its name
function generatePartMetrics(part) {
    const name = part.part_name.toLowerCase();
    
    // Base values by part type
    let vib = 1.2, temp = 65, acc = 2.0, risk = "Faible";
    
    if (name.includes('moteur') || name.includes('motor')) {
        vib = 1.8 + (Math.random() * 0.5);
        temp = 72 + (Math.random() * 8);
        acc = 2.5 + (Math.random() * 0.8);
    } else if (name.includes('accouplement') || name.includes('coupling')) {
        vib = 2.2 + (Math.random() * 0.6);
        temp = 68 + (Math.random() * 6);
        acc = 3.0 + (Math.random() * 1.0);
    } else if (name.includes('pompe') || name.includes('pump')) {
        vib = 1.2 + (Math.random() * 0.4);
        temp = 62 + (Math.random() * 6);
        acc = 2.0 + (Math.random() * 0.6);
    } else if (name.includes('roulement') || name.includes('bearing')) {
        vib = 1.6 + (Math.random() * 0.5);
        temp = 65 + (Math.random() * 8);
        acc = 2.8 + (Math.random() * 0.7);
    }
    
    // Determine risk level
    if (vib > 2.2 || temp > 80) risk = 'Critique';
    else if (vib > 1.6 || temp > 75) risk = 'Élevé';
    else if (vib > 1.2 || temp > 70) risk = 'Moyen';
    
    return {
        acc: acc.toFixed(2),
        temp: temp.toFixed(1),
        vib: vib.toFixed(2),
        risk: risk,
        predVib: (vib * 1.2).toFixed(2),
        rul: Math.floor(500 - (vib * 100)),
        futureRisk: risk === 'Critique' ? 'Critique' : (risk === 'Élevé' ? 'Élevé' : 'Moyen'),
        align: (Math.random() * 0.5).toFixed(2)
    };
}

// Generate components grid HTML from parts
function generateComponentsGrid(parts, pump) {
    if (!parts || parts.length === 0) {
        return '<div class="component-card">Aucune pièce enregistrée pour cette machine</div>';
    }
    
    return parts.map(part => {
        // Use existing metrics from pump or generate new ones
        let partMetrics;
        if (pump.metrics && pump.metrics[part.part_name]) {
            partMetrics = pump.metrics[part.part_name];
        } else {
            partMetrics = generatePartMetrics(part);
            // Store for future use
            if (!pump.metrics) pump.metrics = {};
            pump.metrics[part.part_name] = partMetrics;
        }
        
        const riskClass = getRiskClassFromValue(partMetrics.risk);
        const statusClass = partMetrics.risk === 'Élevé' ? 'status-warning' : 
                           (partMetrics.risk === 'Critique' ? 'status-critical' : 'status-good');
        
        return `
            <div class="component-card" data-part-id="${part.id}" data-part-name="${escapeHtml(part.part_name)}">
                <div class="comp-header">
                    <div class="comp-name">
                        <i class="${getPartIcon(part.part_name)}"></i> 
                        ${escapeHtml(part.part_name)}
                        ${part.is_primary ? '<span style="font-size: 0.7rem; background: #2c9e6b20; padding: 2px 8px; border-radius: 12px; margin-left: 8px;">Principal</span>' : ''}
                    </div>
                    <span class="status-indicator ${statusClass}"></span>
                </div>
                <div class="sensor-group">
                    <div class="sensor-title"><i class="fas fa-waveform"></i> Accélération (m/s²)</div>
                    <div class="metric-row">
                        <span class="metric-label">Valeur</span>
                        <span class="metric-value">${partMetrics.acc}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill" style="width:${(parseFloat(partMetrics.acc)/5)*100}%"></div>
                    </div>
                </div>
                <div class="sensor-group">
                    <div class="sensor-title"><i class="fas fa-thermometer-half"></i> Température (°C)</div>
                    <div class="metric-row">
                        <span class="metric-label">Valeur</span>
                        <span class="metric-value">${partMetrics.temp}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill" style="width:${(parseFloat(partMetrics.temp)/100)*100}%"></div>
                    </div>
                </div>
                <div class="sensor-group">
                    <div class="sensor-title"><i class="fas fa-chart-line"></i> Vibration (mm/s)</div>
                    <div class="metric-row">
                        <span class="metric-label">Valeur</span>
                        <span class="metric-value">${partMetrics.vib}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill" style="width:${(parseFloat(partMetrics.vib)/4)*100}%"></div>
                    </div>
                </div>
                ${part.point_column ? `
                <div class="sensor-group">
                    <div class="sensor-title"><i class="fas fa-chart-simple"></i> Point de mesure</div>
                    <div class="metric-row">
                        <span class="metric-label">Colonne</span>
                        <span class="metric-value">${escapeHtml(part.point_column)}</span>
                    </div>
                </div>
                ` : ''}
                <div class="metric-row">
                    <span class="metric-label">Risque actuel</span>
                    <span class="metric-value ${riskClass}">${partMetrics.risk}</span>
                </div>
                <div class="metric-row">
                    <span class="metric-label">RUL estimée</span>
                    <span class="metric-value">~${partMetrics.rul} heures</span>
                </div>
            </div>
        `;
    }).join('');
}

// Generate filter buttons from parts
function generateFilterButtons(parts, pump) {
    const filterContainer = document.getElementById('filterButtons');
    if (!filterContainer) return;
    
    const buttons = parts.map((part, index) => `
        <button class="filter-btn ${index === 0 ? 'active' : ''}" data-part-name="${escapeHtml(part.part_name)}">
            ${escapeHtml(part.part_name)}
        </button>
    `).join('');
    
    filterContainer.innerHTML = buttons;
    
    // Attach filter button events
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const partName = btn.getAttribute('data-part-name');
            const part = parts.find(p => p.part_name === partName);
            if (part && pump.metrics && pump.metrics[part.part_name]) {
                updateMainChart(pump.metrics[part.part_name]);
            }
        });
    });
}

// Generate problems grid from parts
function generateProblemsGrid(parts, pump) {
    const problemsContainer = document.getElementById('problemsGrid');
    if (!problemsContainer) return;
    
    const problems = [
        { name: "Vibrations anormales", icon: "fas fa-gear", type: "vibrations" },
        { name: "Surchauffe", icon: "fas fa-thermometer-half", type: "surchauffe" },
        { name: "Défaut mécanique", icon: "fas fa-cogs", type: "mecanique" },
        { name: "Panne soudaine", icon: "fas fa-exclamation-triangle", type: "panne" }
    ];
    
    const problemsHtml = problems.map(problem => {
        const partRisks = parts.map(part => {
            const metrics = pump.metrics && pump.metrics[part.part_name] ? 
                           pump.metrics[part.part_name] : generatePartMetrics(part);
            const risk = getProblemRiskFromMetrics(problem.type, metrics);
            return {
                partName: part.part_name,
                risk: risk
            };
        });
        
        return `
            <div class="problem-card" style="border-left-color: ${getHighestRiskColor(partRisks)}">
                <div class="problem-icon"><i class="${problem.icon}"></i></div>
                <div class="problem-title">${problem.name}</div>
                <div class="risk-levels">
                    ${partRisks.map(pr => `
                        <div class="risk-item">
                            <div class="risk-label">${escapeHtml(pr.partName)}</div>
                            <div class="risk-value ${getRiskClass(pr.risk)}">${pr.risk}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    problemsContainer.innerHTML = problemsHtml;
}

// Get problem risk from metrics
function getProblemRiskFromMetrics(problemType, metrics) {
    const vib = parseFloat(metrics.vib);
    const temp = parseFloat(metrics.temp);
    const acc = parseFloat(metrics.acc);
    
    if (problemType === 'vibrations') {
        if (vib > 2.2) return 'Critique';
        if (vib > 1.6) return 'Élevé';
        if (vib > 1.2) return 'Modéré';
        return 'Faible';
    }
    if (problemType === 'surchauffe') {
        if (temp > 80) return 'Critique';
        if (temp > 75) return 'Élevé';
        if (temp > 70) return 'Modéré';
        return 'Faible';
    }
    if (problemType === 'mecanique') {
        if (acc > 3.5) return 'Critique';
        if (acc > 2.5) return 'Élevé';
        if (acc > 1.8) return 'Modéré';
        return 'Faible';
    }
    if (problemType === 'panne') {
        if (vib > 2.0 && temp > 75 && acc > 3.0) return 'Critique';
        return 'Modéré';
    }
    return 'Faible';
}

// Generate alerts container
function generateAlertsContainer(parts, pump) {
    const alertsContainer = document.getElementById('alertsContainer');
    if (!alertsContainer) return;
    
    const alerts = parts.map(part => {
        const metrics = pump.metrics && pump.metrics[part.part_name] ? 
                       pump.metrics[part.part_name] : generatePartMetrics(part);
        const riskLevel = metrics.risk;
        const alertClass = riskLevel === 'Critique' ? 'alert-critical' : 
                          (riskLevel === 'Élevé' ? 'alert-warning' : 'alert-ok');
        const icon = riskLevel === 'Critique' ? 'fa-exclamation-triangle' : 
                    (riskLevel === 'Élevé' ? 'fa-chart-line' : 'fa-check-circle');
        
        let message = '';
        if (parseFloat(metrics.vib) > 2.0) message = `Vibration élevée (${metrics.vib} mm/s)`;
        else if (parseFloat(metrics.temp) > 75) message = `Température excessive (${metrics.temp}°C)`;
        else message = "Paramètres normaux";
        
        return `
            <div class="alert-item ${alertClass}">
                <i class="fas ${icon}"></i>
                <div>
                    <strong>${escapeHtml(part.part_name)}:</strong> ${message}
                    ${riskLevel === 'Critique' ? `<br><small>RUL estimée: ${metrics.rul}h - Intervention requise</small>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    alertsContainer.innerHTML = alerts;
}

// Generate solutions grid
function generateSolutionsGrid(parts, pump) {
    const solutionsContainer = document.getElementById('solutionsGrid');
    if (!solutionsContainer) return;
    
    // Find critical parts
    const criticalParts = parts.filter(part => {
        const metrics = pump.metrics && pump.metrics[part.part_name] ? 
                       pump.metrics[part.part_name] : generatePartMetrics(part);
        return metrics.risk === 'Critique' || metrics.risk === 'Élevé';
    });
    
    const solutions = [];
    
    if (criticalParts.length > 0) {
        solutions.push({
            title: "Maintenance urgente",
            desc: `Intervention requise sur ${criticalParts.map(p => p.part_name).join(', ')}`,
            priority: "Priorité haute",
            icon: "fas fa-crosshairs"
        });
    }
    
    solutions.push({
        title: "Planification maintenance préventive",
        desc: `Basée sur RUL estimées des ${parts.length} composants`,
        priority: "Planification",
        icon: "fas fa-calendar-alt"
    });
    
    solutions.push({
        title: "Surveillance continue",
        desc: "Monitorage en temps réel des paramètres critiques",
        priority: "En cours",
        icon: "fas fa-chart-line"
    });
    
    const solutionsHtml = solutions.map(solution => `
        <div class="solution-card">
            <div class="solution-icon"><i class="${solution.icon}"></i></div>
            <div class="solution-title">${solution.title}</div>
            <div class="solution-desc">${solution.desc}</div>
            <div class="priority">${solution.priority}</div>
        </div>
    `).join('');
    
    solutionsContainer.innerHTML = solutionsHtml;
}

// Main render function
async function renderPumpDashboard(pumpId) {
    console.log('renderPumpDashboard called for:', pumpId);
    
    const dashboardHeader = document.querySelector('.dashboard-header');
    if (dashboardHeader) {
        dashboardHeader.style.display = 'flex';
    }
    
    const pump = window.allPumpsData[pumpId];
    if (!pump) {
        console.error('Pump not found:', pumpId);
        return;
    }
    
    const machineId = pump.actualId || pumpId.replace('machine_', '');
    
    try {
        // Fetch machine parts from database
        currentMachineParts = await fetchMachineParts(machineId);
        
        // If no parts found, show message
        if (currentMachineParts.length === 0) {
            renderNoPartsMessage(pump);
            return;
        }
        
        // Initialize metrics object if not exists
        if (!pump.metrics) pump.metrics = {};
        
        // Generate metrics for each part if not already present
        currentMachineParts.forEach(part => {
            if (!pump.metrics[part.part_name]) {
                pump.metrics[part.part_name] = generatePartMetrics(part);
            }
        });
        
        // Generate components grid HTML
        const componentsHtml = generateComponentsGrid(currentMachineParts, pump);
        
        const pumpHtml = `
            <div class="machine-title">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div class="machine-icon"><i class="fas fa-oil-can"></i></div>
                    <div class="machine-info">
                        <h1>${escapeHtml(pump.name)}</h1>
                        <p>Département ${escapeHtml(pump.dept)} · ${currentMachineParts.length} composants</p>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <button id="notifyBellBtn" class="bell-icon-btn">
                        <i class="fas fa-bell"></i>
                    </button>
                    <span class="badge-online"><i class="fas fa-circle" style="font-size: 0.6rem;"></i> ${pump.status}</span>
                </div>
            </div>
            
            <div class="components-grid" id="componentsGrid">
                ${componentsHtml}
            </div>
            
            <div class="diagnostic-section">
                <div class="section-title"><i class="fas fa-stethoscope"></i> Diagnostic des problèmes potentiels</div>
                <div class="problems-grid" id="problemsGrid"></div>
            </div>
            
            <div class="prediction-main">
                <div class="section-title"><i class="fas fa-chart-line"></i> Prédiction H+12 - Évolution vibratoire</div>
                <div class="filter-buttons" id="filterButtons"></div>
                <canvas id="mainPredictionChart" height="200"></canvas>
                <div class="prediction-stats-row" id="predictionStats"></div>
            </div>
            
            <div class="alerts-panel">
                <div class="section-title"><i class="fas fa-exclamation-triangle"></i> Alertes prédictives H+12</div>
                <div class="alerts-container" id="alertsContainer"></div>
            </div>
            
            <div class="solutions-panel">
                <div class="section-title"><i class="fas fa-lightbulb"></i> Solutions proposées</div>
                <div class="solutions-grid" id="solutionsGrid"></div>
            </div>
        `;
        
        document.getElementById('dashboardContent').innerHTML = pumpHtml;
        
        // Generate dynamic content
        generateProblemsGrid(currentMachineParts, pump);
        generateFilterButtons(currentMachineParts, pump);
        generateAlertsContainer(currentMachineParts, pump);
        generateSolutionsGrid(currentMachineParts, pump);
        
        // Initialize chart with first part's data
        const primaryPart = currentMachineParts.find(p => p.is_primary) || currentMachineParts[0];
        if (primaryPart && pump.metrics[primaryPart.part_name]) {
            initMainChart(pump.metrics[primaryPart.part_name]);
            currentMetrics = pump.metrics[primaryPart.part_name];
        }
        
        // Attach notification button event
        const notifyBtn = document.getElementById('notifyBellBtn');
        if (notifyBtn) {
            const newNotifyBtn = notifyBtn.cloneNode(true);
            notifyBtn.parentNode.replaceChild(newNotifyBtn, notifyBtn);
            
            newNotifyBtn.addEventListener('click', async () => {
                const originalIcon = newNotifyBtn.innerHTML;
                newNotifyBtn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i>';
                newNotifyBtn.disabled = true;
                
                await sendPredictionEmail(pump.name, pumpId);
                
                newNotifyBtn.innerHTML = originalIcon;
                newNotifyBtn.disabled = false;
            });
        }
        
    } catch (error) {
        console.error('Error in renderPumpDashboard:', error);
        renderNoPartsMessage(pump);
    }
}

// Render message when no parts exist
function renderNoPartsMessage(pump) {
    const html = `
        <div class="machine-title">
            <div style="display: flex; align-items: center; gap: 20px;">
                <div class="machine-icon"><i class="fas fa-oil-can"></i></div>
                <div class="machine-info">
                    <h1>${escapeHtml(pump.name)}</h1>
                    <p>Département ${escapeHtml(pump.dept)}</p>
                </div>
            </div>
            <span class="badge-online">${pump.status}</span>
        </div>
        <div class="alerts-card">
            <div class="section-header">
                <h2><i class="fas fa-info-circle"></i> Aucune pièce enregistrée</h2>
            </div>
            <div class="alert-list">
                <div class="alert-row">
                    <div class="alert-icon alert-warning-bg">
                        <i class="fas fa-cog"></i>
                    </div>
                    <div>
                        Aucune pièce n'a été enregistrée pour cette machine dans la table machine_parts.<br>
                        <small>Veuillez ajouter des pièces via l'API POST /api/machine-parts</small>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('dashboardContent').innerHTML = html;
}

// Chart functions
function initMainChart(metrics) {
    const canvas = document.getElementById('mainPredictionChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const labels = ['Maintenant', '+2h', '+4h', '+6h', '+8h', '+12h'];
    const data = getPredictionData('motor', { motor: metrics });
    const thresholdData = Array(labels.length).fill(2.5);
    
    if (mainChart) mainChart.destroy();
    
    mainChart = new Chart(ctx, {
        type: 'line', 
        data: { 
            labels: labels, 
            datasets: [
                { 
                    label: 'Vibration (mm/s)', 
                    data: data, 
                    borderColor: '#2c9e6b', 
                    backgroundColor: 'rgba(44,158,107,0.05)', 
                    borderWidth: 3, 
                    tension: 0.3, 
                    fill: true, 
                    pointRadius: 5, 
                    pointBackgroundColor: '#2c9e6b' 
                }, 
                { 
                    label: 'Seuil critique', 
                    data: thresholdData, 
                    borderColor: '#d97777', 
                    borderWidth: 2, 
                    borderDash: [6, 6], 
                    fill: false, 
                    pointRadius: 0 
                }
            ] 
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: true, 
            scales: { y: { beginAtZero: true, max: 5 } } 
        }
    });
}

function updateMainChart(metrics) {
    if (!mainChart || !metrics) return;
    
    const labels = ['Maintenant', '+2h', '+4h', '+6h', '+8h', '+12h'];
    const data = getPredictionData('motor', { motor: metrics });
    const threshold = getThreshold('motor');
    const thresholdData = Array(labels.length).fill(threshold);
    
    mainChart.data.datasets[0].data = data;
    mainChart.data.datasets[1].data = thresholdData;
    mainChart.update();
    
    const riskClass = metrics.futureRisk === 'Critique' ? 'risk-critical-text' : 
                     (metrics.futureRisk === 'Élevé' ? 'risk-high-text' : 'risk-low-text');
    
    const statsDiv = document.getElementById('predictionStats');
    if (statsDiv) {
        statsDiv.innerHTML = `
            <div class="pred-stat-card">
                <div class="metric-label">Vibration actuelle</div>
                <div class="metric-value" style="font-size:1.2rem;">${metrics.vib} mm/s</div>
            </div>
            <div class="pred-stat-card">
                <div class="metric-label">Vibration prévue H+12</div>
                <div class="metric-value" style="font-size:1.2rem;">${metrics.predVib} mm/s</div>
            </div>
            <div class="pred-stat-card">
                <div class="metric-label">Seuil critique</div>
                <div class="metric-value" style="font-size:1.2rem;">2.5 mm/s</div>
            </div>
            <div class="pred-stat-card">
                <div class="metric-label">Risque futur</div>
                <div class="metric-value ${riskClass}" style="font-size:1.2rem;">${metrics.futureRisk}</div>
            </div>
            <div class="pred-stat-card">
                <div class="metric-label">RUL estimée</div>
                <div class="metric-value" style="font-size:1.2rem;">~${metrics.rul} heures</div>
            </div>
        `;
    }
}

// Make function globally available
window.renderPumpDashboard = renderPumpDashboard;

console.log('pump.js loaded successfully');