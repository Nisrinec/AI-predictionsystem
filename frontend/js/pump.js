// ========== PUMP DASHBOARD MODULE ==========
console.log("PUMP FILE REALLY LOADED");

let mainChart = null;
let currentMachineParts = [];

// ---------- Helpers ----------
function getPartIcon(partName) {
    const name = (partName || "").toLowerCase();
    if (name.includes("moteur") || name.includes("motor")) return "fas fa-microchip";
    if (name.includes("accouplement") || name.includes("coupling")) return "fas fa-link";
    if (name.includes("pompe") || name.includes("pump")) return "fas fa-water";
    if (name.includes("roulement") || name.includes("bearing")) return "fas fa-cog";
    return "fas fa-cube";
}

function getPredictionForPart(part, pump) {
    if (!pump.predictions || pump.predictions.length === 0) return null;

    const pointColumn = String(part.point_column || "").trim().toLowerCase();
    const partName = String(part.part_name || "").trim().toLowerCase();

    return pump.predictions.find(pred => {
        const predCode = String(pred.part_code || "").trim().toLowerCase();
        const predName = String(pred.part_name || "").trim().toLowerCase();
        return predCode === pointColumn || predName === partName;
    });
}

function getDiagnosticForPart(part, pump) {
    if (!pump.diagnostics || pump.diagnostics.length === 0) return null;

    const partCode = String(part.point_column || part.part_code || "").trim().toLowerCase();

    return pump.diagnostics.find(d =>
        String(d.part_code || "").trim().toLowerCase() === partCode
    );
}

function buildPartMetrics(part, pump) {
    const p = getPredictionForPart(part, pump);

    if (!p) {
        return {
            vib: 0,
            pred12: 0,
            pred24: 0,
            pred48: 0,
            risk: "Indisponible",
            risk12: "Indisponible",
            risk24: "Indisponible",
            risk48: "Indisponible",
            health: 0,
            rul: 0,
            recommendation: "Aucune prédiction disponible",
            alert: "Aucune donnée disponible"
        };
    }

    return {
        vib: Number(p.current_vibration || 0),
        pred12: Number(p.predicted_vibration_12h || 0),
        pred24: Number(p.predicted_vibration_24h || 0),
        pred48: Number(p.predicted_vibration_48h || 0),
        risk: p.current_risk || "Faible",
        risk12: p.risk_12h || "Faible",
        risk24: p.risk_24h || "Faible",
        risk48: p.risk_48h || "Faible",
        health: Number(p.health_score || 100),
        rul: Number(p.rul_hours || 0),
        recommendation: p.maintenance_recommendation || "Paramètres normaux",
        alert: p.alert_message || "Aucune alerte critique"
    };
}

function riskClass(risk) {
    if (risk === "Critique") return "risk-critical-text";
    if (risk === "Élevé") return "risk-high-text";
    if (risk === "Moyen" || risk === "Modéré") return "risk-medium-text";
    return "risk-low-text";
}

function statusClass(risk) {
    if (risk === "Critique") return "status-critical";
    if (risk === "Élevé") return "status-warning";
    return "status-good";
}

// ---------- Components ----------
function generateComponentsGrid(parts, pump) {
    if (!parts || parts.length === 0) {
        return `<div class="component-card">Aucune pièce enregistrée pour cette machine</div>`;
    }

    pump.metrics = {};

    return parts.map(part => {
        const m = buildPartMetrics(part, pump);
        pump.metrics[part.part_name] = m;

        return `
            <div class="component-card">
                <div class="comp-header">
                    <div class="comp-name">
                        <i class="${getPartIcon(part.part_name)}"></i>
                        ${escapeHtml(part.part_name)}
                        ${part.is_primary ? `<span style="font-size:0.7rem;background:#2c9e6b20;padding:2px 8px;border-radius:12px;margin-left:8px;">Principal</span>` : ""}
                    </div>
                    <span class="status-indicator ${statusClass(m.risk)}"></span>
                </div>

                <div class="sensor-group">
                    <div class="sensor-title"><i class="fas fa-chart-line"></i> Vibration actuelle</div>
                    <div class="metric-row">
                        <span class="metric-label">Valeur</span>
                        <span class="metric-value">${m.vib.toFixed(2)} mm/s</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-fill" style="width:${Math.min((m.vib / 11) * 100, 100)}%"></div>
                    </div>
                </div>

                <div class="metric-row"><span class="metric-label">H+12</span><span class="metric-value">${m.pred12.toFixed(2)} mm/s</span></div>
                <div class="metric-row"><span class="metric-label">H+24</span><span class="metric-value">${m.pred24.toFixed(2)} mm/s</span></div>
                <div class="metric-row"><span class="metric-label">H+48</span><span class="metric-value">${m.pred48.toFixed(2)} mm/s</span></div>
                <div class="metric-row"><span class="metric-label">Risque actuel</span><span class="metric-value ${riskClass(m.risk)}">${m.risk}</span></div>
                <div class="metric-row"><span class="metric-label">Health Score</span><span class="metric-value">${m.health}%</span></div>
                <div class="metric-row"><span class="metric-label">RUL estimée</span><span class="metric-value">~${m.rul}h</span></div>
                <div class="metric-row"><span class="metric-label">Recommandation</span><span class="metric-value">${m.recommendation}</span></div>
            </div>
        `;
    }).join("");
}

// ---------- Problems ----------
function generateProblemsGrid(parts, pump) {
    const container = document.getElementById("problemsGrid");
    if (!container) return;

    container.innerHTML = parts.map(part => {
        const m = pump.metrics[part.part_name];

        return `
            <div class="problem-card">
                <div class="problem-icon"><i class="fas fa-gear"></i></div>
                <div class="problem-title">${escapeHtml(part.part_name)}</div>
                <div class="risk-levels">
                    <div class="risk-item"><div class="risk-label">Actuel</div><div class="risk-value ${riskClass(m.risk)}">${m.risk}</div></div>
                    <div class="risk-item"><div class="risk-label">H+12</div><div class="risk-value ${riskClass(m.risk12)}">${m.risk12}</div></div>
                    <div class="risk-item"><div class="risk-label">H+24</div><div class="risk-value ${riskClass(m.risk24)}">${m.risk24}</div></div>
                    <div class="risk-item"><div class="risk-label">H+48</div><div class="risk-value ${riskClass(m.risk48)}">${m.risk48}</div></div>
                </div>
            </div>
        `;
    }).join("");
}

// ---------- Alerts ----------
function generateAlertsContainer(parts, pump) {
    const container = document.getElementById("alertsContainer");
    if (!container) return;

    container.innerHTML = parts.map(part => {
        const m = pump.metrics[part.part_name];

        const alertClass =
            m.risk === "Critique" ? "alert-critical" :
            m.risk === "Élevé" ? "alert-warning" :
            "alert-ok";

        return `
            <div class="alert-item ${alertClass}">
                <i class="fas fa-exclamation-triangle"></i>
                <div><strong>${escapeHtml(part.part_name)}:</strong> ${m.alert}</div>
            </div>
        `;
    }).join("");
}

// ---------- Solutions ----------
function generateSolutionsGrid(parts, pump) {
    const container = document.getElementById("solutionsGrid");
    if (!container) return;

    const urgentParts = parts.filter(part => {
        const m = pump.metrics[part.part_name];
        return m.risk === "Critique" || m.risk === "Élevé";
    });

    const solutions = [];

    if (urgentParts.length > 0) {
        solutions.push({
            title: "Maintenance prioritaire",
            desc: `Intervention recommandée sur ${urgentParts.map(p => p.part_name).join(", ")}`,
            priority: "Priorité haute",
            icon: "fas fa-tools"
        });
    }

    solutions.push({
        title: "Planification maintenance préventive",
        desc: `Basée sur les RUL estimées des ${parts.length} composants`,
        priority: "Planification",
        icon: "fas fa-calendar-alt"
    });

    container.innerHTML = solutions.map(s => `
        <div class="solution-card">
            <div class="solution-icon"><i class="${s.icon}"></i></div>
            <div class="solution-title">${s.title}</div>
            <div class="solution-desc">${s.desc}</div>
            <div class="priority">${s.priority}</div>
        </div>
    `).join("");
}

// ---------- Advanced Diagnostics ----------
function generateAdvancedDiagnostics(parts, pump) {
    const container = document.getElementById("advancedDiagnosticsGrid");
    if (!container) return;

    container.innerHTML = parts.map(part => {
        const d = getDiagnosticForPart(part, pump);

        if (!d) {
            return `
                <div class="solution-card">
                    <div class="solution-title">${escapeHtml(part.part_name)}</div>
                    <div class="solution-desc">Aucun diagnostic spectral disponible.</div>
                </div>
            `;
        }

        const signatures = [
            d.peak_1x ? "1X détecté" : "",
            d.peak_2x ? "2X détecté" : "",
            d.harmonics ? "Harmoniques" : "",
            d.high_frequency_peaks ? "Hautes fréquences" : "",
            d.broadband_noise ? "Bruit large bande" : ""
        ].filter(Boolean).join(" · ") || "Aucune signature dominante";

        return `
            <div class="solution-card">
                <div class="solution-icon"><i class="fas fa-microscope"></i></div>
                <div class="solution-title">${escapeHtml(part.part_name)} - ${escapeHtml(d.part_code)}</div>
                <div class="solution-desc">
                    <strong>Défaut probable:</strong> ${escapeHtml(d.probable_fault)}<br>
                    <strong>Confiance:</strong> ${escapeHtml(d.confidence)}<br>
                    <strong>Signatures:</strong> ${escapeHtml(signatures)}<br>
                    <strong>Action:</strong> ${escapeHtml(d.recommendation)}
                </div>
            </div>
        `;
    }).join("");
}

// ---------- Chart ----------
function getChartData(part, pump) {
    const m = pump.metrics[part.part_name];
    return [m.vib, m.pred12, m.pred24, m.pred48];
}

function initMainChart(part, pump) {
    const canvas = document.getElementById("mainPredictionChart");
    if (!canvas || !part) return;

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: ["Actuel", "H+12", "H+24", "H+48"],
            datasets: [
                {
                    label: `${part.part_name} - Vibration (mm/s)`,
                    data: getChartData(part, pump),
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5
                },
                {
                    label: "Seuil alerte",
                    data: [7, 7, 7, 7],
                    borderWidth: 2,
                    borderDash: [6, 6],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    updatePredictionStats(part, pump);
}

function updateMainChart(part, pump) {
    if (!mainChart) return;

    mainChart.data.datasets[0].label = `${part.part_name} - Vibration (mm/s)`;
    mainChart.data.datasets[0].data = getChartData(part, pump);
    mainChart.update();

    updatePredictionStats(part, pump);
}

function updatePredictionStats(part, pump) {
    const div = document.getElementById("predictionStats");
    if (!div) return;

    const m = pump.metrics[part.part_name];

    div.innerHTML = `
        <div class="pred-stat-card"><div class="metric-label">Actuel</div><div class="metric-value">${m.vib.toFixed(2)} mm/s</div></div>
        <div class="pred-stat-card"><div class="metric-label">H+12</div><div class="metric-value">${m.pred12.toFixed(2)} mm/s</div></div>
        <div class="pred-stat-card"><div class="metric-label">H+24</div><div class="metric-value">${m.pred24.toFixed(2)} mm/s</div></div>
        <div class="pred-stat-card"><div class="metric-label">H+48</div><div class="metric-value">${m.pred48.toFixed(2)} mm/s</div></div>
        <div class="pred-stat-card"><div class="metric-label">RUL</div><div class="metric-value">~${m.rul}h</div></div>
    `;
}

function generateFilterButtons(parts, pump) {
    const container = document.getElementById("filterButtons");
    if (!container) return;

    container.innerHTML = parts.map((part, index) => `
        <button class="filter-btn ${index === 0 ? "active" : ""}" data-part-name="${escapeHtml(part.part_name)}">
            ${escapeHtml(part.part_name)}
        </button>
    `).join("");

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const partName = btn.getAttribute("data-part-name");
            const part = parts.find(p => p.part_name === partName);

            if (part) updateMainChart(part, pump);
        });
    });
}

// ---------- Render ----------
async function renderPumpDashboard(pumpId) {
    console.log("renderPumpDashboard:", pumpId);

    const pump = window.allPumpsData[pumpId];
    if (!pump) return;

    const machineId = pump.actualId || pump.machine_id || pump.id || pumpId.replace("machine_", "");

    try {
        currentMachineParts = await fetchMachineParts(machineId);

        if (!currentMachineParts || currentMachineParts.length === 0) {
            currentMachineParts = await fetchMachinePartsByName(pump.name);
        }

        let predictions = await fetchPredictionsByMachine(pump.name);

        if (!predictions || predictions.length === 0) {
            predictions = await fetchPredictionsByMachine(pump.name.replaceAll(" ", "_"));
        }

        let diagnostics = await fetchDiagnosticsByMachine(pump.name);

        if (!diagnostics || diagnostics.length === 0) {
            diagnostics = await fetchDiagnosticsByMachine(pump.name.replaceAll(" ", "_"));
        }

        pump.predictions = predictions || [];
        pump.diagnostics = diagnostics || [];

        console.log("MACHINE NAME:", pump.name);
        console.log("PARTS:", currentMachineParts);
        console.log("PREDICTIONS:", pump.predictions);
        console.log("DIAGNOSTICS:", pump.diagnostics);

        if (!currentMachineParts || currentMachineParts.length === 0) {
            renderNoPartsMessage(pump);
            return;
        }

        const componentsHtml = generateComponentsGrid(currentMachineParts, pump);

        document.getElementById("dashboardContent").innerHTML = `
            <div class="machine-title">
                <div style="display:flex;align-items:center;gap:20px;">
                    <div class="machine-icon"><i class="fas fa-oil-can"></i></div>

                    <div class="machine-info">
                        <h1>${escapeHtml(pump.name)}</h1>
                        <p>Département ${escapeHtml(pump.dept)} · ${currentMachineParts.length} composants</p>
                    </div>
                </div>

                <div style="display:flex;align-items:center;gap:10px;">
                    <button
                        id="notifyBellBtn"
                        class="bell-icon-btn"
                        title="Envoyer une alerte email"
                        style="background:${isSubscribed(pumpId) ? "#2c9e6b" : "#f1f5f9"}; color:${isSubscribed(pumpId) ? "white" : "#334155"};"
                    >
                        <i class="fas fa-bell"></i>
                    </button>

                    <span class="badge-online">${pump.status}</span>
                </div>
            </div>

            <div class="components-grid">
                ${componentsHtml}
            </div>

            <div class="diagnostic-section">
                <div class="section-title"><i class="fas fa-stethoscope"></i> Diagnostic des problèmes potentiels</div>
                <div class="problems-grid" id="problemsGrid"></div>
            </div>

            <div class="prediction-main">
                <div class="section-title"><i class="fas fa-chart-line"></i> Prédiction vibratoire</div>
                <div class="filter-buttons" id="filterButtons"></div>
                <canvas id="mainPredictionChart" height="200"></canvas>
                <div class="prediction-stats-row" id="predictionStats"></div>
            </div>

            <div class="solutions-panel">
                <div class="section-title"><i class="fas fa-microscope"></i> Diagnostic spectral avancé</div>
                <div class="solutions-grid" id="advancedDiagnosticsGrid"></div>
            </div>

            <div class="alerts-panel">
                <div class="section-title"><i class="fas fa-exclamation-triangle"></i> Alertes prédictives</div>
                <div class="alerts-container" id="alertsContainer"></div>
            </div>

            <div class="solutions-panel">
                <div class="section-title"><i class="fas fa-lightbulb"></i> Solutions proposées</div>
                <div class="solutions-grid" id="solutionsGrid"></div>
            </div>
        `;

        generateProblemsGrid(currentMachineParts, pump);
        generateAdvancedDiagnostics(currentMachineParts, pump);
        generateAlertsContainer(currentMachineParts, pump);
        generateSolutionsGrid(currentMachineParts, pump);
        generateFilterButtons(currentMachineParts, pump);

        const primaryPart = currentMachineParts.find(p => p.is_primary) || currentMachineParts[0];
        initMainChart(primaryPart, pump);

        const notifyBellBtn = document.getElementById("notifyBellBtn");

        if (notifyBellBtn) {
            notifyBellBtn.addEventListener("click", async () => {
                try {
                    notifyBellBtn.disabled = true;

                    const success = await sendPredictionEmail(pump.name, machineId);

                    if (success) {
                        toggleSubscription(pumpId);
                        notifyBellBtn.style.background = "#2c9e6b";
                        notifyBellBtn.style.color = "white";

                        if (typeof showNotification === "function") {
                            showNotification("Alerte email envoyée avec succès", "success");
                        } else {
                            alert("Alerte email envoyée avec succès !");
                        }
                    } else {
                        alert("Échec de l'envoi de l'email.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("Erreur lors de l'envoi.");
                } finally {
                    notifyBellBtn.disabled = false;
                }
            });
        }

    } catch (error) {
        console.error("Error in renderPumpDashboard:", error);
        renderNoPartsMessage(pump);
    }
}

function renderNoPartsMessage(pump) {
    document.getElementById("dashboardContent").innerHTML = `
        <div class="machine-title">
            <div class="machine-info">
                <h1>${escapeHtml(pump.name)}</h1>
                <p>Département ${escapeHtml(pump.dept)}</p>
            </div>
        </div>
        <div class="alerts-card">
            <h2>Aucune pièce enregistrée</h2>
            <p>Aucune pièce n'a été enregistrée pour cette machine.</p>
        </div>
    `;
}

window.renderPumpDashboard = renderPumpDashboard;
console.log("renderPumpDashboard exported:", typeof window.renderPumpDashboard);