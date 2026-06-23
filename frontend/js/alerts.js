// ========== ALERTS MODULE - WORKING WITH REAL PREDICTIONS ==========
console.log("alerts.js loading...");

async function getAllAlerts() {
    const alerts = [];

    if (!window.allPumpsData) return alerts;

    for (const pumpId in window.allPumpsData) {
        const pump = window.allPumpsData[pumpId];

        let predictions = pump.predictions || [];

        if ((!predictions || predictions.length === 0) && typeof fetchPredictionsByMachine === "function") {
            predictions = await fetchPredictionsByMachine(pump.name);

            if (!predictions || predictions.length === 0) {
                predictions = await fetchPredictionsByMachine(pump.name.replaceAll(" ", "_"));
            }

            pump.predictions = predictions || [];
        }

        if (!predictions || predictions.length === 0) continue;

        predictions.forEach(pred => {
            const risk = pred.current_risk || pred.risk || "Faible";

            if (!["Critique", "Élevé", "Moyen", "Modéré"].includes(risk)) return;

            let severity = "medium";

            if (risk === "Critique") severity = "critical";
            else if (risk === "Élevé") severity = "high";

            alerts.push({
                pumpId,
                pumpName: pump.name || pred.machine_name || "Machine",
                dept: pump.dept || pred.department || "Département",
                component: pred.part_name || pred.part_code || "Composant",
                message: pred.alert_message || pred.risk_explanation || `Risque ${risk} détecté`,
                severity,
                risk,
                vibration: Number(pred.current_vibration || 0),
                rul: Number(pred.rul_hours || 0),
                timestamp: pred.prediction_time || new Date().toISOString()
            });
        });
    }

    const severityOrder = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3
    };

    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return alerts;
}

async function renderAlertsDashboard() {
    console.log("renderAlertsDashboard called");

    const container = document.getElementById("dashboardContent");

    if (!container) {
        console.error("dashboardContent not found");
        return;
    }

    container.innerHTML = `
        <div style="padding:2rem; text-align:center;">
            <i class="fas fa-spinner fa-spin"></i> Chargement des alertes...
        </div>
    `;

    const allAlerts = await getAllAlerts();

    const importantAlerts = allAlerts.filter(a => a.severity === "critical");
    const normalAlerts = allAlerts.filter(a => a.severity !== "critical");

    const criticalCount = importantAlerts.length;
    const highCount = normalAlerts.filter(a => a.severity === "high").length;
    const mediumCount = normalAlerts.filter(a => a.severity === "medium").length;
    const affectedMachines = new Set(allAlerts.map(a => a.pumpId)).size;

    container.innerHTML = `
        <style>
            .alerts-dashboard {
                animation: fadeIn 0.4s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }

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
            }

            .header-title-section h1 {
                font-size: 1.6rem;
                font-weight: 700;
                color: #1e293b;
                margin: 0;
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
                border: 1px solid #edf2f7;
            }

            .kpi-label-small {
                font-size: 0.7rem;
                text-transform: uppercase;
                font-weight: 600;
                color: #64748b;
            }

            .kpi-number-big {
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

            .alert-section {
                background: white;
                border-radius: 20px;
                border: 1px solid #eef2f8;
                margin-bottom: 1.5rem;
                overflow: hidden;
            }

            .alert-section-header {
                padding: 1rem 1.5rem;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                border-bottom: 2px solid;
            }

            .alert-section-header h3 {
                font-size: 1rem;
                font-weight: 700;
                margin: 0;
            }

            .alert-section-header .count {
                margin-left: auto;
                background: #f1f5f9;
                padding: 0.2rem 0.7rem;
                border-radius: 30px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .important-header {
                background: #fef2f2;
                border-bottom-color: #d97777;
                color: #d97777;
            }

            .normal-header {
                background: #f8fafc;
                border-bottom-color: #94a3b8;
                color: #475569;
            }

            .alert-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem 1.5rem;
                border-bottom: 1px solid #f0f4fa;
                cursor: pointer;
                transition: all 0.2s;
            }

            .alert-item:hover {
                background: #fafcff;
                transform: translateX(4px);
            }

            .alert-icon {
                width: 44px;
                height: 44px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.1rem;
                flex-shrink: 0;
            }

            .alert-icon-critical {
                background: #fee9e6;
                color: #d97777;
            }

            .alert-icon-high {
                background: #fff0db;
                color: #e6b422;
            }

            .alert-icon-medium {
                background: #e3f5ec;
                color: #2c9e6b;
            }

            .alert-content {
                flex: 1;
            }

            .alert-title-row {
                display: flex;
                align-items: center;
                gap: 0.6rem;
                flex-wrap: wrap;
                margin-bottom: 0.3rem;
            }

            .alert-pump-name {
                font-weight: 700;
                font-size: 0.9rem;
            }

            .alert-component {
                background: #f1f5f9;
                border-radius: 12px;
                padding: 0.2rem 0.6rem;
                font-size: 0.65rem;
                font-weight: 600;
            }

            .alert-dept {
                font-size: 0.7rem;
                color: #64748b;
            }

            .alert-message {
                font-size: 0.75rem;
                color: #475569;
                margin: 0.3rem 0;
            }

            .alert-footer {
                display: flex;
                gap: 1rem;
                margin-top: 0.3rem;
                font-size: 0.65rem;
                flex-wrap: wrap;
            }

            .alert-rul {
                background: #f1f5f9;
                padding: 0.2rem 0.6rem;
                border-radius: 20px;
                font-weight: 600;
                color: #64748b;
            }

            .severity-badge {
                padding: 0.25rem 0.8rem;
                border-radius: 20px;
                font-size: 0.7rem;
                font-weight: 700;
                text-align: center;
                min-width: 80px;
            }

            .severity-critical {
                background: #fee9e6;
                color: #d97777;
            }

            .severity-high {
                background: #fff0db;
                color: #e6b422;
            }

            .severity-medium {
                background: #e3f5ec;
                color: #2c9e6b;
            }

            .empty-state {
                text-align: center;
                padding: 2rem;
                color: #94a3b8;
            }
        </style>

        <div class="alerts-dashboard">
            <div class="modern-header-strip">
                <div class="header-title-section">
                    <h1>
                        <i class="fas fa-bell" style="color:#e6b422; margin-right:8px;"></i>
                        Centre d'Alertes
                    </h1>
                    <p>Alertes générées depuis les prédictions IA et les risques machines</p>
                </div>

                <div class="header-stats-row">
                    <div class="stat-pill-new">
                        <i class="fas fa-circle" style="color:#2c9e6b; font-size:0.6rem;"></i>
                        ${allAlerts.length} totale(s)
                    </div>

                    <div class="stat-pill-new" style="background:#fee9e6;">
                        <i class="fas fa-exclamation-triangle" style="color:#d97777"></i>
                        ${criticalCount} critique
                    </div>

                    <div class="stat-pill-new" style="background:#e6faf0;">
                        <i class="fas fa-industry" style="color:#2c9e6b"></i>
                        ${affectedMachines} machines
                    </div>
                </div>
            </div>

            <div class="kpi-grid-modern">
                <div class="kpi-card-modern">
                    <div>
                        <div class="kpi-label-small">CRITIQUE</div>
                        <div class="kpi-number-big" style="color:#d97777">${criticalCount}</div>
                        <small>Action immédiate</small>
                    </div>
                    <div class="kpi-icon-wrapper" style="background:#fee9e6;">
                        <i class="fas fa-exclamation-triangle" style="color:#d97777"></i>
                    </div>
                </div>

                <div class="kpi-card-modern">
                    <div>
                        <div class="kpi-label-small">ÉLEVÉ</div>
                        <div class="kpi-number-big" style="color:#e6b422">${highCount}</div>
                        <small>Surveillance renforcée</small>
                    </div>
                    <div class="kpi-icon-wrapper" style="background:#fff0db;">
                        <i class="fas fa-chart-line" style="color:#e6b422"></i>
                    </div>
                </div>

                <div class="kpi-card-modern">
                    <div>
                        <div class="kpi-label-small">MODÉRÉ</div>
                        <div class="kpi-number-big" style="color:#2c9e6b">${mediumCount}</div>
                        <small>Planification</small>
                    </div>
                    <div class="kpi-icon-wrapper" style="background:#e3f5ec;">
                        <i class="fas fa-check-circle" style="color:#2c9e6b"></i>
                    </div>
                </div>

                <div class="kpi-card-modern">
                    <div>
                        <div class="kpi-label-small">MACHINES</div>
                        <div class="kpi-number-big">${affectedMachines}</div>
                        <small>Équipements affectés</small>
                    </div>
                    <div class="kpi-icon-wrapper">
                        <i class="fas fa-industry"></i>
                    </div>
                </div>
            </div>

            ${renderAlertSection("ALERTES IMPORTANTES", importantAlerts, true)}
            ${renderAlertSection("ALERTES NORMALES", normalAlerts, false)}
        </div>
    `;

    document.querySelectorAll(".alert-item").forEach(item => {
        item.addEventListener("click", () => {
            const pumpId = item.getAttribute("data-pump-id");

            if (pumpId && window.allPumpsData && window.allPumpsData[pumpId]) {
                if (typeof renderPumpDashboard === "function") {
                    renderPumpDashboard(pumpId);
                    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
                }
            }
        });
    });
}

function renderAlertSection(title, alerts, important) {
    return `
        <div class="alert-section">
            <div class="alert-section-header ${important ? "important-header" : "normal-header"}">
                <i class="fas ${important ? "fa-exclamation-triangle" : "fa-info-circle"}"></i>
                <h3>${title}</h3>
                <span class="count">${alerts.length}</span>
            </div>

            <div class="alert-list">
                ${
                    alerts.length === 0
                        ? `
                            <div class="empty-state">
                                <i class="fas fa-check-circle" style="color:#2c9e6b; font-size:2rem;"></i>
                                <p>Aucune alerte</p>
                            </div>
                        `
                        : alerts.map(alert => renderAlertItem(alert)).join("")
                }
            </div>
        </div>
    `;
}

function renderAlertItem(alert) {
    const severityText =
        alert.severity === "critical"
            ? "CRITIQUE"
            : alert.severity === "high"
                ? "ÉLEVÉE"
                : "MODÉRÉE";

    return `
        <div class="alert-item" data-pump-id="${alert.pumpId}">
            <div class="alert-icon alert-icon-${alert.severity}">
                <i class="fas ${
                    alert.severity === "critical"
                        ? "fa-exclamation-triangle"
                        : alert.severity === "high"
                            ? "fa-chart-line"
                            : "fa-clock"
                }"></i>
            </div>

            <div class="alert-content">
                <div class="alert-title-row">
                    <span class="alert-pump-name">${escapeHtml(alert.pumpName)}</span>
                    <span class="alert-component">${escapeHtml(alert.component)}</span>
                    <span class="alert-dept">
                        <i class="fas ${getDeptIcon(alert.dept)}"></i>
                        ${escapeHtml(alert.dept)}
                    </span>
                </div>

                <div class="alert-message">
                    ${escapeHtml(alert.message)}
                </div>

                <div class="alert-footer">
                    <span class="alert-rul">
                        <i class="fas fa-wave-square"></i>
                        Vibration: ${alert.vibration.toFixed(2)} mm/s
                    </span>

                    <span class="alert-rul">
                        <i class="fas fa-hourglass-half"></i>
                        RUL: ~${alert.rul}h
                    </span>

                    <span class="alert-rul">
                        <i class="fas fa-clock"></i>
                        ${new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                </div>
            </div>

            <div class="severity-badge severity-${alert.severity}">
                ${severityText}
            </div>
        </div>
    `;
}

function getDeptIcon(deptName) {
    if (!deptName) return "fa-building";

    const name = deptName.toLowerCase();

    if (name.includes("sap")) return "fa-flask";
    if (name.includes("af") || name.includes("filtration")) return "fa-tint";
    if (name.includes("cap")) return "fa-industry";
    if (name.includes("engrais")) return "fa-leaf";

    return "fa-building";
}

function escapeHtml(str) {
    if (!str) return "";

    return String(str).replace(/[&<>]/g, function (m) {
        if (m === "&") return "&amp;";
        if (m === "<") return "&lt;";
        if (m === ">") return "&gt;";
        return m;
    });
}

window.renderAlertsDashboard = renderAlertsDashboard;
window.getAllAlerts = getAllAlerts;

console.log("alerts.js loaded successfully");