// ========== PUMP DASHBOARD MODULE - FIXED ==========
console.log("Pump Dashboard loading...");

let mainChart = null;
let currentMachineParts = [];

// ---------- Styles ----------
const pumpDashboardStyles = `
.pump-dashboard-redesign {
    animation: fadeInUp 0.4s ease;
}

@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.pump-header-redesign {
    background: white;
    border-radius: 24px;
    padding: 1.5rem 2rem;
    margin-bottom: 1.8rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    border: 1px solid #eef2f8;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.pump-title-redesign {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.pump-icon-redesign {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.6rem;
    color: white;
}

.pump-info-redesign h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 0.25rem 0;
}

.pump-info-redesign p {
    color: #64748b;
    font-size: 0.8rem;
    margin: 0;
}

.pump-actions-redesign {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.bell-btn-redesign {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    background: #f1f5f9;
    color: #334155;
}

.bell-btn-redesign:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.status-badge-redesign {
    padding: 0.5rem 1.2rem;
    border-radius: 30px;
    font-size: 0.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #d1fae5;
    color: #059669;
}

.stats-row-redesign {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 1.8rem;
}

.stat-card-redesign {
    background: white;
    border-radius: 18px;
    padding: 1rem 1.2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #eef2f8;
}

.stat-label {
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: 600;
    color: #64748b;
}

.stat-value {
    font-size: 1.6rem;
    font-weight: 800;
    line-height: 1.2;
    margin-top: 0.2rem;
}

.stat-icon-redesign {
    width: 42px;
    height: 42px;
    background: #f1f5f9;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.components-grid-redesign {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.2rem;
    margin-bottom: 1.8rem;
}

.component-card-redesign {
    background: white;
    border-radius: 20px;
    border: 1px solid #eef2f8;
    overflow: hidden;
}

.component-header-redesign {
    padding: 1rem 1.2rem;
    background: #f8fafc;
    border-bottom: 1px solid #eef2f8;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.component-name-redesign {
    font-weight: 700;
    font-size: 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
}

.component-code {
    font-size: 0.65rem;
    background: #e2e8f0;
    padding: 0.2rem 0.5rem;
    border-radius: 12px;
    color: #475569;
    font-family: monospace;
}

.primary-tag {
    font-size: 0.6rem;
    background: #1e293b;
    color: white;
    padding: 0.2rem 0.6rem;
    border-radius: 20px;
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.status-dot-critical { background: #d97777; }
.status-dot-warning { background: #e6b422; }
.status-dot-good { background: #2c9e6b; }

.component-body-redesign {
    padding: 1.2rem;
}

.metric-group {
    background: #f8fafc;
    border-radius: 14px;
    padding: 1rem;
    margin-bottom: 1rem;
}

.metric-group-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 0.8rem;
}

.metric-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #e2e8f0;
}

.metric-row:last-child {
    border-bottom: none;
}

.metric-label {
    font-size: 0.75rem;
    color: #64748b;
}

.metric-value {
    font-weight: 600;
    font-size: 0.85rem;
}

.vibration-big {
    font-size: 1.8rem;
    font-weight: 800;
}

.progress-bar {
    height: 5px;
    background: #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
    margin: 0.5rem 0;
}

.progress-fill {
    height: 100%;
    border-radius: 10px;
}

.prediction-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
    margin: 1rem 0;
}

.pred-item {
    text-align: center;
    padding: 0.5rem;
    background: #f8fafc;
    border-radius: 12px;
}

.pred-label {
    font-size: 0.6rem;
    color: #64748b;
}

.pred-value {
    font-weight: 700;
    font-size: 0.85rem;
}

.section-redesign {
    background: white;
    border-radius: 20px;
    padding: 1.2rem 1.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #eef2f8;
}

.section-title-redesign {
    font-size: 1.1rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1rem;
    padding-bottom: 0.8rem;
    border-bottom: 2px solid #f1f5f9;
}

.filter-buttons-redesign {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    margin-bottom: 1.2rem;
}

.filter-btn-redesign {
    padding: 0.4rem 1rem;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 30px;
    cursor: pointer;
    font-size: 0.75rem;
    font-weight: 500;
}

.filter-btn-redesign.active {
    background: #1e293b;
    color: white;
    border-color: #1e293b;
}

.problems-grid-redesign,
.solutions-grid-redesign,
.spectral-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
}

.problem-card-redesign {
    background: #fef2f2;
    border-radius: 16px;
    padding: 1rem;
    border-left: 3px solid #d97777;
}

.risk-levels {
    display: flex;
    justify-content: space-between;
    margin-top: 0.8rem;
}

.risk-level {
    text-align: center;
    flex: 1;
}

.risk-level-label {
    font-size: 0.6rem;
    color: #64748b;
}

.solution-card-redesign {
    background: #f0fdf4;
    border-radius: 16px;
    padding: 1rem;
    border: 1px solid #dcfce7;
}

.alerts-container-redesign {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
}

.alert-item-redesign {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.8rem 1rem;
    border-radius: 14px;
}

.alert-critical {
    background: #fef2f2;
    border-left: 3px solid #d97777;
}

.alert-warning {
    background: #fffbeb;
    border-left: 3px solid #e6b422;
}

.alert-ok {
    background: #f0fdf4;
    border-left: 3px solid #2c9e6b;
}

.prediction-stats-redesign {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    justify-content: space-between;
}

.pred-stat-redesign {
    flex: 1;
    min-width: 100px;
    text-align: center;
    padding: 0.6rem;
    background: #f8fafc;
    border-radius: 14px;
}

.risk-critical { color: #d97777; font-weight: 700; }
.risk-high { color: #e6b422; font-weight: 700; }
.risk-medium { color: #eab308; font-weight: 600; }
.risk-low { color: #2c9e6b; font-weight: 600; }

.spectral-card {
    background: #ffffff;
    border: 1px solid #eef2f8;
    border-radius: 20px;
    overflow: hidden;
}

.spectral-card-header {
    padding: 1rem 1.2rem;
    background: #fafcff;
    border-bottom: 1px solid #eef2f8;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.spectral-part-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.spectral-icon {
    width: 40px;
    height: 40px;
    background: #1e293b;
    color: white;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.spectral-card-body {
    padding: 1rem 1.2rem;
    display: flex;
    gap: 1.2rem;
    flex-wrap: wrap;
}

.spectral-left-column {
    flex: 1.5;
    min-width: 180px;
}

.spectral-right-column {
    flex: 1;
    min-width: 160px;
}

.spectral-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: #64748b;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
}

.fault-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 1rem;
    border-radius: 30px;
    font-size: 0.75rem;
    font-weight: 600;
}

.fault-badge.danger {
    background: #fee9e6;
    color: #d97777;
}

.fault-badge.warning {
    background: #fff0db;
    color: #e6b422;
}

.fault-badge.success {
    background: #e3f5ec;
    color: #2c9e6b;
}

.fault-badge.neutral {
    background: #f1f5f9;
    color: #475569;
}

.signature-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.signature-list span {
    background: #f1f5f9;
    color: #1e293b;
    padding: 0.3rem 0.8rem;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
}

.spectral-recommendation {
    background: #f8fafc;
    border-radius: 14px;
    padding: 0.8rem 1rem;
    height: 100%;
    border-left: 3px solid #2c9e6b;
}

.spectral-empty {
    text-align: center;
    padding: 2.5rem;
    background: #f8fafc;
    border-radius: 20px;
    border: 1px dashed #e2e8f0;
}

.confidence-bar {
    width: 80px;
    height: 4px;
    background: #e2e8f0;
    border-radius: 10px;
    overflow: hidden;
}

.confidence-fill {
    height: 100%;
    border-radius: 10px;
}

.confidence-fill.high { background: #2c9e6b; }
.confidence-fill.medium { background: #e6b422; }
.confidence-fill.low { background: #d97777; }

@media (max-width: 768px) {
    .components-grid-redesign,
    .spectral-grid {
        grid-template-columns: 1fr;
    }

    .pump-header-redesign {
        padding: 1rem;
    }

    .spectral-card-body {
        flex-direction: column;
    }
}
`;

if (!document.querySelector("#pump-dashboard-styles")) {
    const styleElement = document.createElement("style");
    styleElement.id = "pump-dashboard-styles";
    styleElement.textContent = pumpDashboardStyles;
    document.head.appendChild(styleElement);
}

// ---------- Helpers ----------
function getPartIcon(partName) {
    const name = String(partName || "").toLowerCase();

    if (name.includes("moteur") || name.includes("motor")) return "fas fa-microchip";
    if (name.includes("accouplement") || name.includes("coupling")) return "fas fa-link";
    if (name.includes("pompe") || name.includes("pump")) return "fas fa-water";
    if (name.includes("roulement") || name.includes("bearing")) return "fas fa-cog";

    return "fas fa-cube";
}

function escapeSafe(value) {
    if (typeof escapeHtml === "function") {
        return escapeHtml(value);
    }

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function normalizePartCode(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/-o$/i, "")
        .replace(/-v$/i, "")
        .replace(/-t$/i, "")
        .replace(/[^a-z0-9]/g, "");
}

function getPredictionForPart(part, pump) {
    if (!pump.predictions || pump.predictions.length === 0) return null;

    const partCodes = [
        part.point_column,
        part.part_code,
        part.code,
        part.part_name
    ].map(normalizePartCode).filter(Boolean);

    return pump.predictions.find(pred => {
        const predCodes = [
            pred.part_code,
            pred.part_name
        ].map(normalizePartCode).filter(Boolean);

        return partCodes.some(pc =>
            predCodes.some(dc => pc === dc || pc.includes(dc) || dc.includes(pc))
        );
    });
}

function getDiagnosticForPart(part, pump) {
    if (!pump.diagnostics || pump.diagnostics.length === 0) return null;

    const partCodes = [
        part.point_column,
        part.part_code,
        part.code,
        part.part_name
    ].map(normalizePartCode).filter(Boolean);

    return pump.diagnostics.find(d => {
        const diagCodes = [
            d.part_code,
            d.code,
            d.part_name
        ].map(normalizePartCode).filter(Boolean);

        return partCodes.some(pc =>
            diagCodes.some(dc => pc === dc || pc.includes(dc) || dc.includes(pc))
        );
    });
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
            recommendation: "Aucune prédiction disponible pour ce composant",
            alert: "Aucune donnée disponible"
        };
    }

    return {
        vib: Number(p.current_vibration || 0),
        pred12: Number(p.predicted_vibration_12h || p.predicted_12h || 0),
        pred24: Number(p.predicted_vibration_24h || p.predicted_24h || 0),
        pred48: Number(p.predicted_vibration_48h || p.predicted_48h || 0),
        risk: p.current_risk || "Faible",
        risk12: p.risk_12h || "Faible",
        risk24: p.risk_24h || "Faible",
        risk48: p.risk_48h || "Faible",
        health: Number(p.health_score || 100),
        rul: Number(p.rul_hours || 0),
        recommendation: p.maintenance_recommendation || "Paramètres normaux",
        alert:
           p.alert_message ||
           p.maintenance_recommendation ||
           (
                p.current_risk === "Critique"
                   ? "Intervention immédiate requise"
                   : p.current_risk === "Élevé"
                       ? "Anomalie IA détectée - inspection recommandée"
                       : "Aucune alerte critique"
            )
    };
}

function riskClass(risk) {
    if (risk === "Critique") return "risk-critical";
    if (risk === "Élevé") return "risk-high";
    if (risk === "Moyen" || risk === "Modéré") return "risk-medium";
    return "risk-low";
}

function statusDotClass(risk) {
    if (risk === "Critique") return "status-dot-critical";
    if (risk === "Élevé") return "status-dot-warning";
    return "status-dot-good";
}

function getSpectralConfidence(confidence) {
    let text = confidence || "Moyenne";
    let level = "medium";
    let percent = 60;

    if (confidence) {
        const value = String(confidence).toLowerCase();

        if (value.includes("élev") || value.includes("haute") || value.includes("high")) {
            level = "high";
            percent = 85;
            text = "Haute";
        } else if (value.includes("faible") || value.includes("low")) {
            level = "low";
            percent = 35;
            text = "Faible";
        }
    }

    return { level, percent, text };
}

function getSpectralFaultStyle(fault) {
    if (!fault) return { level: "neutral", icon: "fa-chart-line" };

    const value = String(fault).toLowerCase();

    if (value.includes("roulement") || value.includes("bearing")) {
        return { level: "danger", icon: "fa-cog" };
    }

    if (value.includes("désalign") || value.includes("misalignment")) {
        return { level: "warning", icon: "fa-arrows-alt" };
    }

    if (value.includes("balourd") || value.includes("unbalance")) {
        return { level: "warning", icon: "fa-circle-notch" };
    }

    if (value.includes("cavitation")) {
        return { level: "danger", icon: "fa-water" };
    }

    return { level: "success", icon: "fa-check-circle" };
}

function generateSpectralAnalysisGrid(parts, pump) {
    const partsWithData = parts.filter(part => getDiagnosticForPart(part, pump));

    if (partsWithData.length === 0) {
        return `
            <div class="spectral-empty">
                <i class="fas fa-chart-line"></i>
                <h4>Aucune analyse spectrale disponible</h4>
                <p>Les diagnostics spectraux seront affichés ici après traitement.</p>
            </div>
        `;
    }

    return `
        <div class="spectral-grid">
            ${partsWithData.map(part => {
                const diagnostic = getDiagnosticForPart(part, pump);
                const partCode = part.point_column || part.part_code || part.code || "—";
                const confidence = getSpectralConfidence(diagnostic.confidence);
                const fault = getSpectralFaultStyle(diagnostic.probable_fault);

                const signatures = [];
                if (diagnostic.peak_2x) signatures.push("2X");
                if (diagnostic.harmonics) signatures.push("Harmoniques");
                if (diagnostic.high_frequency_peaks) signatures.push("Hautes fréquences");
                if (diagnostic.broadband_noise) signatures.push("Bruit large bande");
                if (diagnostic.sidebands) signatures.push("Bandes latérales");

                return `
                    <div class="spectral-card">
                        <div class="spectral-card-header">
                            <div class="spectral-part-info">
                                <div class="spectral-icon">
                                    <i class="fas fa-microscope"></i>
                                </div>
                                <div>
                                    <h4>${escapeSafe(part.part_name || "Composant")}</h4>
                                    <span>${escapeSafe(partCode)}</span>
                                </div>
                            </div>

                            <div class="spectral-confidence">
                                <span>Confiance</span>
                                <div class="confidence-bar">
                                    <div class="confidence-fill ${confidence.level}" style="width:${confidence.percent}%"></div>
                                </div>
                                <strong class="${confidence.level}">${confidence.text}</strong>
                            </div>
                        </div>

                        <div class="spectral-card-body">
                            <div class="spectral-left-column">
                                <div class="spectral-section">
                                    <div class="spectral-label">
                                        <i class="fas fa-exclamation-triangle"></i>
                                        DÉFAUT DÉTECTÉ
                                    </div>
                                    <div class="fault-badge ${fault.level}">
                                        <i class="fas ${fault.icon}"></i>
                                        <span>${escapeSafe(diagnostic.probable_fault || "Analyse en cours")}</span>
                                    </div>
                                </div>

                                ${signatures.length > 0 ? `
                                    <div class="spectral-section">
                                        <div class="spectral-label">
                                            <i class="fas fa-waveform"></i>
                                            SIGNATURES SPECTRALES
                                        </div>
                                        <div class="signature-list">
                                            ${signatures.map(sig => `<span>${escapeSafe(sig)}</span>`).join("")}
                                        </div>
                                    </div>
                                ` : ""}
                            </div>

                            <div class="spectral-right-column">
                                <div class="spectral-recommendation">
                                    <div class="spectral-recommendation-header">
                                        <i class="fas fa-clipboard-list"></i>
                                        <span>ACTION RECOMMANDÉE</span>
                                    </div>
                                    <p>${escapeSafe(diagnostic.recommendation || "Surveiller l'évolution des vibrations sur les prochains cycles.")}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `;
}

// ---------- Main Render ----------
async function renderPumpDashboardRedesigned(pumpId) {
    console.log("renderPumpDashboardRedesigned:", pumpId);

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

        console.log("CURRENT MACHINE PARTS:", currentMachineParts);
        console.log("PREDICTIONS FROM DB:", pump.predictions);
        console.log("DIAGNOSTICS FROM DB:", pump.diagnostics);

        if (!currentMachineParts || currentMachineParts.length === 0) {
            renderNoPartsMessageRedesigned(pump);
            return;
        }

        pump.metrics = {};

        let totalRisk = 0;
        let criticalCount = 0;
        let warningCount = 0;
        let totalRul = 0;

        currentMachineParts.forEach(part => {
            const partKey = part.part_name || part.point_column || part.part_code || part.code;
            const m = buildPartMetrics(part, pump);

            pump.metrics[partKey] = m;

            if (m.risk === "Critique") criticalCount++;
            else if (m.risk === "Élevé") warningCount++;

            const riskValue =
                m.risk === "Critique" ? 80 :
                m.risk === "Élevé" ? 60 :
                m.risk === "Moyen" ? 40 :
                m.risk === "Indisponible" ? 0 :
                20;

            totalRisk += riskValue;
            totalRul += m.rul;
        });

        const avgRisk = currentMachineParts.length > 0 ? Math.round(totalRisk / currentMachineParts.length) : 0;
        const avgRul = currentMachineParts.length > 0 ? Math.round(totalRul / currentMachineParts.length) : 0;
        const overallRiskColor = avgRisk >= 70 ? "#d97777" : avgRisk >= 40 ? "#e6b422" : "#2c9e6b";

        const componentsHtml = currentMachineParts.map((part, index) => {
            const partKey = part.part_name || part.point_column || part.part_code || part.code;
            const m = pump.metrics[partKey];

            const vibPercentage = Math.min((m.vib / 11) * 100, 100);
            let vibColor = "#2c9e6b";

            if (vibPercentage > 70) vibColor = "#d97777";
            else if (vibPercentage > 40) vibColor = "#e6b422";

            return `
                <div class="component-card-redesign" style="animation: fadeInUp 0.3s ease ${index * 0.05}s both;">
                    <div class="component-header-redesign">
                        <div class="component-name-redesign">
                            <i class="${getPartIcon(part.part_name)}" style="color:#1e293b;"></i>
                            ${escapeSafe(part.part_name || "Composant")}
                            ${part.point_column ? `<span class="component-code">${escapeSafe(part.point_column)}</span>` : ""}
                            ${part.is_primary ? `<span class="primary-tag">Principal</span>` : ""}
                        </div>
                        <div class="status-dot ${statusDotClass(m.risk)}"></div>
                    </div>

                    <div class="component-body-redesign">
                        <div class="metric-group">
                            <div class="metric-group-title">
                                <i class="fas fa-waveform"></i> Vibration actuelle
                            </div>

                            <div class="metric-row">
                                <span class="metric-label">Valeur</span>
                                <span class="metric-value vibration-big" style="color:${vibColor};">
                                    ${m.vib.toFixed(2)} <span style="font-size:0.8rem;">mm/s</span>
                                </span>
                            </div>

                            <div class="progress-bar">
                                <div class="progress-fill" style="width:${vibPercentage}%; background:${vibColor};"></div>
                            </div>

                            <div class="metric-row">
                                <span class="metric-label">Seuil critique</span>
                                <span class="metric-value">7.0 mm/s</span>
                            </div>
                        </div>

                        <div class="prediction-grid">
                            <div class="pred-item">
                                <div class="pred-label">H+12</div>
                                <div class="pred-value">${m.pred12.toFixed(2)}</div>
                            </div>
                            <div class="pred-item">
                                <div class="pred-label">H+24</div>
                                <div class="pred-value">${m.pred24.toFixed(2)}</div>
                            </div>
                            <div class="pred-item">
                                <div class="pred-label">H+48</div>
                                <div class="pred-value">${m.pred48.toFixed(2)}</div>
                            </div>
                        </div>

                        <div class="metric-row">
                            <span class="metric-label">Risque</span>
                            <span class="metric-value ${riskClass(m.risk)}">${m.risk}</span>
                        </div>

                        <div class="metric-row">
                            <span class="metric-label">Santé / RUL</span>
                            <span class="metric-value">${m.health}% · ${m.rul}h</span>
                        </div>

                        <div class="metric-row">
                            <span class="metric-label">Recommandation</span>
                            <span class="metric-value" style="color:#1e293b;">
                                ${escapeSafe(m.recommendation.substring(0, 50))}
                                ${m.recommendation.length > 50 ? "..." : ""}
                            </span>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        const problemsHtml = currentMachineParts.map(part => {
            const partKey = part.part_name || part.point_column || part.part_code || part.code;
            const m = pump.metrics[partKey];

            return `
                <div class="problem-card-redesign">
                    <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.8rem;">
                        <i class="fas fa-exclamation-triangle" style="color:#d97777;"></i>
                        <strong>${escapeSafe(part.part_name || "Composant")}</strong>
                        ${part.point_column ? `<span style="font-size:0.6rem; color:#64748b;">(${escapeSafe(part.point_column)})</span>` : ""}
                    </div>

                    <div class="risk-levels">
                        <div class="risk-level">
                            <div class="risk-level-label">Actuel</div>
                            <div class="${riskClass(m.risk)}">${m.risk}</div>
                        </div>
                        <div class="risk-level">
                            <div class="risk-level-label">H+12</div>
                            <div class="${riskClass(m.risk12)}">${m.risk12}</div>
                        </div>
                        <div class="risk-level">
                            <div class="risk-level-label">H+24</div>
                            <div class="${riskClass(m.risk24)}">${m.risk24}</div>
                        </div>
                        <div class="risk-level">
                            <div class="risk-level-label">H+48</div>
                            <div class="${riskClass(m.risk48)}">${m.risk48}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join("");

        let alertsHtml = "";
        let hasAlert = false;

        currentMachineParts.forEach(part => {
            const partKey = part.part_name || part.point_column || part.part_code || part.code;
            const m = pump.metrics[partKey];

            if (m.risk === "Critique") {
                hasAlert = true;
                alertsHtml += `
                    <div class="alert-item-redesign alert-critical">
                        <i class="fas fa-skull-crossbones" style="color:#d97777; font-size:1.2rem;"></i>
                        <div>
                            <strong>${escapeSafe(part.part_name || "Composant")}</strong><br>
                            <span style="font-size:0.75rem;">${escapeSafe(m.alert)}</span>
                        </div>
                    </div>
                `;
            } else if (m.risk === "Élevé") {
                hasAlert = true;
                alertsHtml += `
                    <div class="alert-item-redesign alert-warning">
                        <i class="fas fa-chart-line" style="color:#e6b422; font-size:1.2rem;"></i>
                        <div>
                            <strong>${escapeSafe(part.part_name || "Composant")}</strong><br>
                            <span style="font-size:0.75rem;">${escapeSafe(m.alert)}</span>
                        </div>
                    </div>
                `;
            }
        });

        if (!hasAlert) {
            alertsHtml = `
                <div class="alert-item-redesign alert-ok">
                    <i class="fas fa-check-circle" style="color:#2c9e6b; font-size:1.2rem;"></i>
                    <div>Aucune alerte active - Tous les composants fonctionnent normalement</div>
                </div>
            `;
        }

        const solutionsHtml = `
            <div class="solution-card-redesign">
                <i class="fas fa-tools" style="font-size:1.5rem; color:#d97777; margin-bottom:0.5rem; display:inline-block;"></i>
                <div style="font-weight:700;">Maintenance prioritaire</div>
                <div style="font-size:0.75rem; color:#64748b;">Intervention sur ${criticalCount} composant(s) critique(s)</div>
            </div>

            <div class="solution-card-redesign">
                <i class="fas fa-chart-line" style="font-size:1.5rem; color:#e6b422; margin-bottom:0.5rem; display:inline-block;"></i>
                <div style="font-weight:700;">Surveillance renforcée</div>
                <div style="font-size:0.75rem; color:#64748b;">${warningCount} composant(s) en alerte - Planifier inspection</div>
            </div>

            <div class="solution-card-redesign">
                <i class="fas fa-calendar-alt" style="font-size:1.5rem; color:#2c9e6b; margin-bottom:0.5rem; display:inline-block;"></i>
                <div style="font-weight:700;">Planification préventive</div>
                <div style="font-size:0.75rem; color:#64748b;">RUL moyenne: ${avgRul}h - Programmer maintenance</div>
            </div>
        `;

        const filterButtonsHtml = currentMachineParts.map((part, idx) => `
            <button class="filter-btn-redesign ${idx === 0 ? "active" : ""}" data-part-key="${escapeSafe(part.part_name || part.point_column || part.part_code || part.code)}">
                <i class="${getPartIcon(part.part_name)}"></i>
                ${escapeSafe(part.part_name || "Composant")}
            </button>
        `).join("");

        const spectralHtml = generateSpectralAnalysisGrid(currentMachineParts, pump);

        document.getElementById("dashboardContent").innerHTML = `
            <div class="pump-dashboard-redesign">
                <div class="pump-header-redesign">
                    <div class="pump-title-redesign">
                        <div class="pump-icon-redesign">
                            <i class="fas fa-oil-can"></i>
                        </div>

                        <div class="pump-info-redesign">
                            <h1>${escapeSafe(pump.name)}</h1>
                            <p>
                                <i class="fas fa-building"></i>
                                ${escapeSafe(pump.dept)} · ${currentMachineParts.length} composants
                            </p>
                        </div>
                    </div>

                    <div class="pump-actions-redesign">
                        <button id="notifyBellBtnRedesign" class="bell-btn-redesign" style="background:${isSubscribed(pumpId) ? "#2c9e6b" : "#f1f5f9"}; color:${isSubscribed(pumpId) ? "white" : "#334155"};">
                            <i class="fas fa-bell"></i>
                        </button>
                        <button id="generateReportBtn" class="bell-btn-redesign" title="Générer rapport">
                            <i class="fas fa-file-pdf"></i>
                        </button>

                        <div class="status-badge-redesign">
                            <i class="fas fa-circle" style="font-size:0.6rem;"></i>
                            ${escapeSafe(pump.status)}
                        </div>
                    </div>
                </div>

                <div class="stats-row-redesign">
                    <div class="stat-card-redesign">
                        <div>
                            <div class="stat-label">RISQUE GLOBAL</div>
                            <div class="stat-value" style="color:${overallRiskColor}">${avgRisk}%</div>
                        </div>
                        <div class="stat-icon-redesign">
                            <i class="fas fa-gauge-high" style="color:${overallRiskColor}"></i>
                        </div>
                    </div>

                    <div class="stat-card-redesign">
                        <div>
                            <div class="stat-label">COMPOSANTS</div>
                            <div class="stat-value">${currentMachineParts.length}</div>
                        </div>
                        <div class="stat-icon-redesign">
                            <i class="fas fa-cubes"></i>
                        </div>
                    </div>

                    <div class="stat-card-redesign">
                        <div>
                            <div class="stat-label">RUL MOYENNE</div>
                            <div class="stat-value">${avgRul}<span style="font-size:0.8rem;">h</span></div>
                        </div>
                        <div class="stat-icon-redesign">
                            <i class="fas fa-hourglass-half"></i>
                        </div>
                    </div>

                    <div class="stat-card-redesign">
                        <div>
                            <div class="stat-label">CRITIQUE / ALERTE</div>
                            <div class="stat-value">
                                <span style="color:#d97777">${criticalCount}</span> /
                                <span style="color:#e6b422">${warningCount}</span>
                            </div>
                        </div>
                        <div class="stat-icon-redesign">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                    </div>
                </div>

                <div class="components-grid-redesign">
                    ${componentsHtml}
                </div>

                <div class="section-redesign">
                    <div class="section-title-redesign">
                        <i class="fas fa-stethoscope" style="color:#d97777;"></i>
                        Diagnostic des problèmes potentiels
                    </div>
                    <div class="problems-grid-redesign">
                        ${problemsHtml}
                    </div>
                </div>

                <div class="section-redesign">
                    <div class="section-title-redesign">
                        <i class="fas fa-chart-line" style="color:#2c9e6b;"></i>
                        Évolution vibratoire sur 48h
                    </div>

                    <div class="filter-buttons-redesign">
                        ${filterButtonsHtml}
                    </div>

                    <div class="chart-container">
                        <canvas id="mainPredictionChartRedesign" height="180" style="max-height:250px;"></canvas>
                    </div>

                    <div class="prediction-stats-redesign" id="predictionStatsRedesign"></div>
                </div>

                <div class="section-redesign">
                    <div class="section-title-redesign">
                        <i class="fas fa-microscope" style="color:#e6b422;"></i>
                        Analyse spectrale avancée
                    </div>
                    <div id="spectralGridRedesign">
                        ${spectralHtml}
                    </div>
                </div>

                <div class="section-redesign">
                    <div class="section-title-redesign">
                        <i class="fas fa-bell" style="color:#e6b422;"></i>
                        Alertes prédictives
                    </div>
                    <div class="alerts-container-redesign">
                        ${alertsHtml}
                    </div>
                </div>

                <div class="section-redesign">
                    <div class="section-title-redesign">
                        <i class="fas fa-lightbulb" style="color:#2c9e6b;"></i>
                        Actions recommandées
                    </div>
                    <div class="solutions-grid-redesign">
                        ${solutionsHtml}
                    </div>
                </div>
            </div>
        `;

        const primaryPart = currentMachineParts.find(p => p.is_primary) || currentMachineParts[0];
        initChartRedesigned(primaryPart, pump);

        document.querySelectorAll(".filter-btn-redesign").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".filter-btn-redesign").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const partKey = btn.getAttribute("data-part-key");
                const part = currentMachineParts.find(p =>
                    String(p.part_name || p.point_column || p.part_code || p.code) === partKey
                );

                if (part) updateChartRedesigned(part, pump);
            });
        });

        const notifyBtn = document.getElementById("notifyBellBtnRedesign");

        if (notifyBtn) {
            notifyBtn.addEventListener("click", async () => {
                try {
                    notifyBtn.disabled = true;

                    const success = await sendPredictionEmail(pump.name, machineId);

                    if (success) {
                        toggleSubscription(pumpId);
                        notifyBtn.style.background = "#2c9e6b";
                        notifyBtn.style.color = "white";

                        if (typeof showNotification === "function") {
                            showNotification("Alerte email envoyée avec succès", "success");
                        }
                    } else {
                        alert("Échec de l'envoi de l'email.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("Erreur lors de l'envoi.");
                } finally {
                    notifyBtn.disabled = false;
                }
            });
        }
            const reportBtn = document.getElementById("generateReportBtn");

                  if (reportBtn) {
                    reportBtn.addEventListener("click", () => {
                   generateMachineReport(pump, pumpId);
                    });
}
    } catch (error) {
        console.error("Error in renderPumpDashboardRedesigned:", error);
        renderNoPartsMessageRedesigned(pump);
    }
}
function generateMachineReport(pump, pumpId) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("landscape", "mm", "a4");

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    const green = [44, 158, 107];
    const dark = [30, 41, 59];
    const gray = [100, 116, 139];
    const light = [248, 250, 252];
    const red = [217, 119, 119];
    const yellow = [230, 180, 34];

    function textSafe(v) {
        return String(v ?? "—");
    }

    function partKey(part) {
        return part.part_name || part.point_column || part.part_code || part.code;
    }

    function riskColor(risk) {
        if (risk === "Critique") return red;
        if (risk === "Élevé") return yellow;
        if (risk === "Moyen" || risk === "Modéré") return [234, 179, 8];
        return green;
    }

    function drawLogo(x, y) {
        doc.setFillColor(...green);
        doc.circle(x, y, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text("⚙", x - 3.5, y + 4);

        doc.setTextColor(...dark);
        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.text("iPredict", x + 12, y + 2);

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...gray);
        doc.text("Predictive Maintenance Platform", x + 12, y + 8);
    }

    function drawFooter() {
        const pages = doc.internal.getNumberOfPages();

        for (let i = 1; i <= pages; i++) {
            doc.setPage(i);
            doc.setDrawColor(226, 232, 240);
            doc.line(14, pageH - 13, pageW - 14, pageH - 13);

            doc.setFontSize(8);
            doc.setTextColor(...gray);
            doc.text("iPredict · Rapport généré automatiquement · Maintenance prédictive basée sur l’IA", 14, pageH - 7);
            doc.text(`Page ${i}/${pages}`, pageW - 30, pageH - 7);
        }
    }

    function kpiCard(x, y, w, title, value, color) {
        doc.setFillColor(...light);
        doc.roundedRect(x, y, w, 25, 4, 4, "F");

        doc.setFontSize(8);
        doc.setTextColor(...gray);
        doc.text(title, x + 5, y + 8);

        doc.setFontSize(18);
        doc.setFont(undefined, "bold");
        doc.setTextColor(...color);
        doc.text(String(value), x + 5, y + 19);

        doc.setFont(undefined, "normal");
    }

    const criticalCount = currentMachineParts.filter(part => {
        const m = pump.metrics[partKey(part)];
        return m?.risk === "Critique";
    }).length;

    const warningCount = currentMachineParts.filter(part => {
        const m = pump.metrics[partKey(part)];
        return m?.risk === "Élevé";
    }).length;

    const avgRul = Math.round(
        currentMachineParts.reduce((sum, part) => {
            const m = pump.metrics[partKey(part)];
            return sum + Number(m?.rul || 0);
        }, 0) / currentMachineParts.length
    );

    const avgRisk = Math.round(
        currentMachineParts.reduce((sum, part) => {
            const m = pump.metrics[partKey(part)];
            const r = m?.risk;
            const v = r === "Critique" ? 80 : r === "Élevé" ? 60 : r === "Moyen" ? 40 : 20;
            return sum + v;
        }, 0) / currentMachineParts.length
    );

    // COVER / HEADER
    doc.setFillColor(...green);
    doc.rect(0, 0, pageW, 45, "F");

    doc.setFillColor(255, 255, 255);
    doc.circle(24, 22, 10, "F");

    doc.setTextColor(...green);
    doc.setFontSize(16);
    doc.text("⚙", 19.8, 27);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont(undefined, "bold");
    doc.text("iPredict", 40, 20);

    doc.setFontSize(13);
    doc.setFont(undefined, "normal");
    doc.text("Rapport de maintenance prédictive", 40, 30);

    doc.setFontSize(9);
    doc.text(`Généré le : ${new Date().toLocaleString("fr-FR")}`, pageW - 78, 20);

    // MACHINE INFO
    doc.setTextColor(...dark);
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(textSafe(pump.name), 14, 60);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...gray);
    doc.text(`Département : ${textSafe(pump.dept)}   ·   Statut : ${textSafe(pump.status)}   ·   Composants : ${currentMachineParts.length}`, 14, 68);

    kpiCard(14, 78, 62, "RISQUE GLOBAL", `${avgRisk}%`, avgRisk >= 70 ? red : avgRisk >= 40 ? yellow : green);
    kpiCard(83, 78, 62, "COMPOSANTS", currentMachineParts.length, dark);
    kpiCard(152, 78, 62, "RUL MOYENNE", `${avgRul}h`, green);
    kpiCard(221, 78, 62, "CRITIQUE / ALERTE", `${criticalCount} / ${warningCount}`, warningCount > 0 ? yellow : green);

    // COMPONENT CARDS
    let y = 118;

    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.setFont(undefined, "bold");
    doc.text("Résumé des composants", 14, y);

    y += 8;

    currentMachineParts.forEach((part, index) => {
        const m = pump.metrics[partKey(part)];
        if (!m) return;

        if (y > 165) {
            doc.addPage();
            y = 20;
            drawLogo(16, 18);
            y = 35;
        }

        const x = 14 + (index % 2) * 136;
        if (index % 2 === 0 && index !== 0) y += 48;

        const cardY = y;

        doc.setFillColor(...light);
        doc.roundedRect(x, cardY, 126, 42, 4, 4, "F");

        const rc = riskColor(m.risk);
        doc.setFillColor(...rc);
        doc.roundedRect(x, cardY, 4, 42, 2, 2, "F");

        doc.setTextColor(...dark);
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text(textSafe(part.part_name || "Composant"), x + 8, cardY + 8);

        doc.setFontSize(8);
        doc.setFont(undefined, "normal");
        doc.setTextColor(...gray);
        doc.text(`Code: ${textSafe(part.point_column || part.part_code || "—")}`, x + 8, cardY + 14);

        doc.setTextColor(...rc);
        doc.setFont(undefined, "bold");
        doc.text(`Risque: ${m.risk}`, x + 78, cardY + 8);

        doc.setTextColor(...dark);
        doc.setFont(undefined, "normal");
        doc.text(`Actuel: ${m.vib.toFixed(2)} mm/s`, x + 8, cardY + 23);
        doc.text(`H+12: ${m.pred12.toFixed(2)}   H+24: ${m.pred24.toFixed(2)}   H+48: ${m.pred48.toFixed(2)}`, x + 8, cardY + 30);
        doc.text(`Santé: ${m.health}%   RUL: ${m.rul}h`, x + 8, cardY + 37);

        doc.setTextColor(...gray);
        doc.text(doc.splitTextToSize(`Reco: ${m.recommendation}`, 48), x + 73, cardY + 20);
    });

    // FULL TABLE
    doc.addPage();
    drawLogo(16, 18);

    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.setFont(undefined, "bold");
    doc.text("Tableau détaillé des prédictions", 14, 38);

    const partRows = currentMachineParts.map(part => {
        const m = pump.metrics[partKey(part)];
        const trend = m.pred48 > m.vib ? "Hausse" : m.pred48 < m.vib ? "Baisse" : "Stable";

        return [
            textSafe(part.part_name),
            textSafe(part.point_column || part.part_code),
            part.is_primary ? "Oui" : "Non",
            `${m.vib.toFixed(2)}`,
            `${m.pred12.toFixed(2)}`,
            `${m.pred24.toFixed(2)}`,
            `${m.pred48.toFixed(2)}`,
            trend,
            m.risk,
            m.risk12,
            m.risk24,
            m.risk48,
            `${m.health}%`,
            `${m.rul}h`,
            textSafe(m.recommendation),
            textSafe(m.alert)
        ];
    });

    doc.autoTable({
        startY: 45,
        head: [[
            "Composant", "Code", "Principal", "Actuel", "H+12", "H+24", "H+48",
            "Tendance", "Risque", "R12", "R24", "R48", "Santé", "RUL",
            "Recommandation", "Alerte"
        ]],
        body: partRows,
        theme: "striped",
        headStyles: { fillColor: dark, textColor: 255 },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
            14: { cellWidth: 38 },
            15: { cellWidth: 50 }
        }
    });

    // SPECTRAL
    const spectralRows = currentMachineParts.map(part => {
        const diagnostic = getDiagnosticForPart(part, pump);
        if (!diagnostic) return null;

        const signatures = [];
        if (diagnostic.peak_2x) signatures.push("2X");
        if (diagnostic.harmonics) signatures.push("Harmoniques");
        if (diagnostic.high_frequency_peaks) signatures.push("Hautes fréquences");
        if (diagnostic.broadband_noise) signatures.push("Bruit large bande");
        if (diagnostic.sidebands) signatures.push("Bandes latérales");

        return [
            textSafe(part.part_name),
            textSafe(part.point_column),
            textSafe(diagnostic.confidence || "Moyenne"),
            textSafe(diagnostic.probable_fault || "Analyse en cours"),
            textSafe(signatures.join(", ") || "—"),
            textSafe(diagnostic.recommendation || "Surveiller l'évolution des vibrations.")
        ];
    }).filter(Boolean);

    doc.addPage();
    drawLogo(16, 18);

    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.setFont(undefined, "bold");
    doc.text("Analyse spectrale avancée", 14, 38);

    doc.autoTable({
        startY: 45,
        head: [["Composant", "Code", "Confiance", "Défaut détecté", "Signatures", "Action recommandée"]],
        body: spectralRows.length ? spectralRows : [["—", "—", "—", "Aucune analyse spectrale disponible", "—", "—"]],
        theme: "striped",
        headStyles: { fillColor: yellow, textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
            5: { cellWidth: 90 }
        }
    });

    // ALERTS
    const alertRows = currentMachineParts.map(part => {
        const m = pump.metrics[partKey(part)];
        if (!["Critique", "Élevé"].includes(m.risk)) return null;

        return [
            textSafe(part.part_name),
            m.risk,
            textSafe(m.alert),
            `${m.rul}h`
        ];
    }).filter(Boolean);

    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text("Alertes prédictives", 14, doc.lastAutoTable.finalY + 15);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 22,
        head: [["Composant", "Sévérité", "Message", "RUL"]],
        body: alertRows.length ? alertRows : [["—", "—", "Aucune alerte prédictive active", "—"]],
        theme: "grid",
        headStyles: { fillColor: red, textColor: 255 },
        styles: { fontSize: 9 },
        columnStyles: {
            2: { cellWidth: 150 }
        }
    });

    // ACTIONS
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text("Actions recommandées", 14, doc.lastAutoTable.finalY + 15);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 22,
        head: [["Action", "Détail"]],
        body: [
            ["Maintenance prioritaire", `Intervention sur ${criticalCount} composant(s) critique(s)`],
            ["Surveillance renforcée", `${warningCount} composant(s) en alerte - Planifier inspection`],
            ["Planification préventive", `RUL moyenne : ${avgRul}h - Programmer maintenance`]
        ],
        theme: "grid",
        headStyles: { fillColor: green, textColor: 255 },
        styles: { fontSize: 10 }
    });

    drawFooter();

    const safeName = String(pump.name || "machine").replace(/[^a-zA-Z0-9_-]/g, "_");
    doc.save(`Rapport_iPredict_${safeName}.pdf`);
}
function initChartRedesigned(part, pump) {
    const canvas = document.getElementById("mainPredictionChartRedesign");
    if (!canvas || !part) return;

    const partKey = part.part_name || part.point_column || part.part_code || part.code;
    const m = pump.metrics[partKey];

    if (!m) return;

    if (mainChart) mainChart.destroy();

    mainChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: ["Actuel", "H+12", "H+24", "H+48"],
            datasets: [
                {
                    label: `${part.part_name || "Composant"} - Vibration (mm/s)`,
                    data: [m.vib, m.pred12, m.pred24, m.pred48],
                    borderColor: "#1e293b",
                    backgroundColor: "rgba(30,60,114,0.05)",
                    borderWidth: 3,
                    tension: 0.3,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: "#1e293b",
                    pointBorderColor: "white",
                    pointBorderWidth: 2
                },
                {
                    label: "Seuil critique",
                    data: [7, 7, 7, 7],
                    borderColor: "#d97777",
                    borderWidth: 2,
                    borderDash: [8, 8],
                    fill: false,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: "Vibration (mm/s)"
                    }
                }
            }
        }
    });

    updatePredictionStatsRedesigned(part, pump);
}

function updateChartRedesigned(part, pump) {
    if (!mainChart) return;

    const partKey = part.part_name || part.point_column || part.part_code || part.code;
    const m = pump.metrics[partKey];

    if (!m) return;

    mainChart.data.datasets[0].label = `${part.part_name || "Composant"} - Vibration (mm/s)`;
    mainChart.data.datasets[0].data = [m.vib, m.pred12, m.pred24, m.pred48];
    mainChart.update();

    updatePredictionStatsRedesigned(part, pump);
}

function updatePredictionStatsRedesigned(part, pump) {
    const container = document.getElementById("predictionStatsRedesign");
    if (!container) return;

    const partKey = part.part_name || part.point_column || part.part_code || part.code;
    const m = pump.metrics[partKey];

    if (!m) return;

    const trend = m.pred48 > m.vib ? "📈 Hausse" : "📉 Baisse";
    const trendColor = m.pred48 > m.vib ? "#d97777" : "#2c9e6b";

    container.innerHTML = `
        <div class="pred-stat-redesign">
            <div class="stat-label">Actuel</div>
            <div class="stat-value" style="font-size:1.2rem;">${m.vib.toFixed(2)} mm/s</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">H+12</div>
            <div>${m.pred12.toFixed(2)} mm/s</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">H+24</div>
            <div>${m.pred24.toFixed(2)} mm/s</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">H+48</div>
            <div>${m.pred48.toFixed(2)} mm/s</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">Tendance</div>
            <div style="color:${trendColor};">${trend}</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">RUL</div>
            <div>${m.rul}h</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">Santé</div>
            <div>${m.health}%</div>
        </div>

        <div class="pred-stat-redesign">
            <div class="stat-label">Risque</div>
            <div class="${riskClass(m.risk)}">${m.risk}</div>
        </div>
    `;
}

function renderNoPartsMessageRedesigned(pump) {
    document.getElementById("dashboardContent").innerHTML = `
        <div class="pump-dashboard-redesign">
            <div class="pump-header-redesign">
                <div class="pump-title-redesign">
                    <div class="pump-icon-redesign">
                        <i class="fas fa-oil-can"></i>
                    </div>

                    <div class="pump-info-redesign">
                        <h1>${escapeSafe(pump.name)}</h1>
                        <p>${escapeSafe(pump.dept)}</p>
                    </div>
                </div>
            </div>

            <div class="section-redesign">
                <div class="section-title-redesign">
                    <i class="fas fa-info-circle"></i>
                    Aucune donnée disponible
                </div>
                <p>Aucune pièce n'a été enregistrée pour cette machine.</p>
            </div>
        </div>
    `;
}

// Override original function
window.renderPumpDashboard = renderPumpDashboardRedesigned;

console.log("Pump Dashboard fixed loaded successfully!");