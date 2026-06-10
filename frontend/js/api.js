// ========== API MODULE ==========
console.log("api.js loading...");

const API_URL = "http://localhost:3000/api";

window.departmentsFromDB = [];
window.machinesFromDB = [];
window.allPumpsData = window.allPumpsData || {};

async function getAuthToken() {
    return localStorage.getItem("ipredict_token");
}

async function apiCall(endpoint, method, data = null) {
    const token = await getAuthToken();

    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "API call failed");
    }

    return await response.json();
}

async function loadDepartmentsAndMachines() {
    console.log("Loading departments and machines...");

    try {
        const token = await getAuthToken();

        if (!token) {
            createFallbackData();
            renderStaticSidebar();
            return;
        }

        const deptResponse = await fetch(`${API_URL}/departments`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (deptResponse.ok) {
            window.departmentsFromDB = await deptResponse.json();
        }

        const machineResponse = await fetch(`${API_URL}/machines`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (machineResponse.ok) {
            window.machinesFromDB = await machineResponse.json();

            window.machinesFromDB.forEach(machine => {
                const dept = window.departmentsFromDB.find(
                    d => d.department_id === machine.department_id
                );

                const key = `machine_${machine.machine_id}`;

                window.allPumpsData[key] = {
                    id: key,
                    actualId: machine.machine_id,
                    name: machine.machine_name,
                    dept: dept ? dept.department_name : machine.department_name || "N/A",
                    status: machine.status || "En ligne",
                    metrics: {}
                };
            });
        }

        if (Object.keys(window.allPumpsData).length === 0) {
            createFallbackData();
        }

        if (typeof renderSidebarFromDatabase === "function") {
            renderSidebarFromDatabase();
        } else if (typeof renderStaticSidebar === "function") {
            renderStaticSidebar();
        }

    } catch (error) {
        console.error("Error loading departments/machines:", error);
        createFallbackData();

        if (typeof renderStaticSidebar === "function") {
            renderStaticSidebar();
        }
    }
}

function createFallbackData() {
    window.allPumpsData = {
        sap_p1: {
            id: "sap_p1",
            name: "Pompe SAP-01",
            dept: "SAP",
            status: "En ligne",
            actualId: 1,
            metrics: {}
        }
    };
}

async function loadAndDisplayMachine(machineId) {
    console.log("loadAndDisplayMachine called for:", machineId);

    try {
        const key = `machine_${machineId}`;

        if (window.allPumpsData[key]) {
            window.renderPumpDashboard(key);
            if (typeof window.renderPumpDashboard === "function") {
               window.renderPumpDashboard(key);
            } else {
                console.error("renderPumpDashboard not ready");
            }
            return;
        }

        const token = await getAuthToken();

        const response = await fetch(`${API_URL}/machines/${machineId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error("Machine not found");
        }

        const machine = await response.json();

        let departmentName = machine.department_name || "N/A";

        if (machine.department_id) {
            const deptResponse = await fetch(`${API_URL}/departments/${machine.department_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (deptResponse.ok) {
                const dept = await deptResponse.json();
                departmentName = dept.department_name;
            }
        }

        const dynamicKey = `machine_${machine.machine_id}`;

        window.allPumpsData[dynamicKey] = {
            id: dynamicKey,
            actualId: machine.machine_id,
            name: machine.machine_name,
            dept: departmentName,
            status: machine.status || "En ligne",
            metrics: {}
        };

        window.renderPumpDashboard(dynamicKey);
        if (typeof window.renderPumpDashboard === "function") {
           window.renderPumpDashboard(dynamicKey);
        } else {
            console.error("renderPumpDashboard not ready");
        }

    } catch (error) {
        console.error("Error loading machine:", error);

        document.getElementById("dashboardContent").innerHTML = `
            <div class="machine-title">
                <div class="machine-icon"><i class="fas fa-exclamation-triangle"></i></div>
                <div class="machine-info">
                    <h1>Machine #${machineId}</h1>
                    <p>Erreur de chargement: ${error.message}</p>
                </div>
            </div>
        `;
    }
}

// ---------- Machine parts ----------
async function fetchMachineParts(machineId) {
    console.log("Fetching parts for machine:", machineId);

    try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}/machine-parts/machine/${machineId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) return [];

        const parts = await response.json();
        console.log("Parts loaded:", parts.length);
        return parts;

    } catch (error) {
        console.error("Error fetching machine parts:", error);
        return [];
    }
}

async function fetchMachinePartsByName(machineName) {
    try {
        const token = await getAuthToken();

        const response = await fetch(
            `${API_URL}/machine-parts/machine-name/${encodeURIComponent(machineName)}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!response.ok) return [];

        return await response.json();

    } catch (error) {
        console.error("Error fetching parts by name:", error);
        return [];
    }
}

async function createMachinePart(machineId, partData) {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/machine-parts`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            machine_id: machineId,
            part_name: partData.part_name,
            point_column: partData.point_column,
            is_primary: partData.is_primary || false
        })
    });

    if (!response.ok) throw new Error("Failed to create machine part");
    return await response.json();
}

async function updateMachinePart(partId, partData) {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/machine-parts/${partId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(partData)
    });

    if (!response.ok) throw new Error("Failed to update machine part");
    return await response.json();
}

async function deleteMachinePart(partId) {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/machine-parts/${partId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to delete machine part");
    return true;
}

// ---------- Predictions ----------
async function fetchPredictionsByMachine(machineName) {
    try {
        const token = await getAuthToken();

        const response = await fetch(
            `${API_URL}/predictions/machine/${encodeURIComponent(machineName)}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!response.ok) {
            console.warn("No predictions found for machine:", machineName);
            return [];
        }

        return await response.json();

    } catch (error) {
        console.error("Error fetching predictions:", error);
        return [];
    }
}

// ---------- Email ----------
async function sendPredictionEmail(machineName, machineId) {
    try {
        const token = await getAuthToken();

        const response = await fetch(`${API_URL}/email/send-prediction-alert`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                machineName,
                machineId,
                hoursToFailure: 12
            })
        });

        const result = await response.json();

        if (result.success && typeof showNotification === "function") {
            showNotification("✅ Alerte envoyée par email!", "success");
        }

        return result.success;

    } catch (error) {
        console.error("Send email error:", error);
        return false;
    }
}

function testApi() {
    console.log("API test - allPumpsData:", Object.keys(window.allPumpsData).length);
    return window.allPumpsData;
}
async function fetchDiagnosticsByMachine(machineName) {
    try {
        const token = await getAuthToken();

        const response = await fetch(
            `${API_URL}/diagnostics/machine/${encodeURIComponent(machineName)}`,
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        if (!response.ok) return [];

        return await response.json();
    } catch (error) {
        console.error("Error fetching diagnostics:", error);
        return [];
    }
}

window.fetchDiagnosticsByMachine = fetchDiagnosticsByMachine;
// ---------- Exports ----------
window.API_URL = API_URL;
window.getAuthToken = getAuthToken;
window.apiCall = apiCall;

window.loadDepartmentsAndMachines = loadDepartmentsAndMachines;
window.loadAndDisplayMachine = loadAndDisplayMachine;

window.fetchMachineParts = fetchMachineParts;
window.fetchMachinePartsByName = fetchMachinePartsByName;
window.createMachinePart = createMachinePart;
window.updateMachinePart = updateMachinePart;
window.deleteMachinePart = deleteMachinePart;

window.fetchPredictionsByMachine = fetchPredictionsByMachine;
window.sendPredictionEmail = sendPredictionEmail;

window.testApi = testApi;
window.createFallbackData = createFallbackData;

console.log("api.js loaded successfully");
console.log("loadDepartmentsAndMachines type:", typeof loadDepartmentsAndMachines);