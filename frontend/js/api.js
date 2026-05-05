// ========== API MODULE ==========
console.log('api.js loading...');

const API_URL = 'http://localhost:3000/api';

// Global variables
window.departmentsFromDB = [];
window.machinesFromDB = [];
window.allPumpsData = window.allPumpsData || {};

// Get auth token
async function getAuthToken() {
    return localStorage.getItem('ipredict_token');
}

// Generic API call function
async function apiCall(endpoint, method, data = null) {
    try {
        const token = await getAuthToken();
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : null
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API call failed');
        }
        return await response.json();
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
}

// Fetch departments from database
async function loadDepartmentsAndMachines() {
    console.log('Loading departments and machines...');
    
    try {
        const token = localStorage.getItem('ipredict_token');
        
        if (!token) {
            console.warn('No token found, using fallback data');
            createFallbackData();
            renderStaticSidebar();
            return;
        }
        
        // Fetch departments
        const deptResponse = await fetch(`${API_URL}/departments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (deptResponse.ok) {
            window.departmentsFromDB = await deptResponse.json();
            console.log('Departments loaded:', window.departmentsFromDB.length);
        }
        
        // Fetch machines
        const machineResponse = await fetch(`${API_URL}/machines`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (machineResponse.ok) {
            window.machinesFromDB = await machineResponse.json();
            console.log('Machines loaded:', window.machinesFromDB.length);
            
            // Populate allPumpsData from machines
            window.machinesFromDB.forEach(machine => {
                const dept = window.departmentsFromDB.find(d => d.department_id === machine.department_id);
                const dynamicKey = `machine_${machine.machine_id}`;
                
                if (!window.allPumpsData[dynamicKey]) {
                    window.allPumpsData[dynamicKey] = {
                        id: dynamicKey,
                        actualId: machine.machine_id,
                        name: machine.machine_name,
                        dept: dept ? dept.department_name : 'N/A',
                        status: machine.status || 'En ligne',
                        metrics: {
                            motor: { 
                                acc: 2.5, temp: 75, vib: 1.8, risk: "Moyen", 
                                predVib: 2.2, rul: 350, futureRisk: "Moyen", align: 0
                            },
                            coupling: { 
                                acc: 3.2, temp: 70, vib: 2.2, align: 0.35, risk: "Moyen", 
                                predVib: 2.8, rul: 200, futureRisk: "Moyen" 
                            },
                            pump: { 
                                acc: 1.3, temp: 65, vib: 1.0, flow: 250, risk: "Faible", 
                                predVib: 1.2, rul: 900, futureRisk: "Faible", align: 0
                            }
                        }
                    };
                }
            });
        }
        
        // If no machines were loaded, create fallback data
        if (Object.keys(window.allPumpsData).length === 0) {
            console.log('No machines from API, creating fallback data');
            createFallbackData();
        }
        
        // Render the sidebar
        if (typeof renderSidebarFromDatabase === 'function') {
            renderSidebarFromDatabase();
        } else if (typeof renderStaticSidebar === 'function') {
            renderStaticSidebar();
        }
        
    } catch (error) {
        console.error('Error loading departments/machines:', error);
        createFallbackData();
        if (typeof renderStaticSidebar === 'function') {
            renderStaticSidebar();
        }
    }
}

// Create fallback data for testing
function createFallbackData() {
    console.log('Creating fallback pump data');
    window.allPumpsData = {
        'sap_p1': {
            id: 'sap_p1',
            name: 'Pompe SAP-01',
            dept: 'SAP',
            status: 'En ligne',
            actualId: 1,
            metrics: {
                motor: { acc: 2.85, temp: 78, vib: 1.85, risk: "Moyen", predVib: 2.35, rul: 328, futureRisk: "Moyen", align: 0 },
                coupling: { acc: 4.20, temp: 72, vib: 2.45, align: 0.42, risk: "Élevé", predVib: 3.65, rul: 94, futureRisk: "Critique" },
                pump: { acc: 1.20, temp: 64, vib: 0.95, flow: 278, risk: "Faible", predVib: 1.08, rul: 1250, futureRisk: "Faible", align: 0 }
            }
        },
        'af_p1': {
            id: 'af_p1',
            name: 'Pompe AF-101',
            dept: 'AF',
            status: 'En ligne',
            actualId: 2,
            metrics: {
                motor: { acc: 2.45, temp: 76, vib: 1.65, risk: "Moyen", predVib: 2.15, rul: 410, futureRisk: "Moyen", align: 0 },
                coupling: { acc: 3.20, temp: 70, vib: 2.15, align: 0.35, risk: "Moyen", predVib: 2.95, rul: 220, futureRisk: "Moyen" },
                pump: { acc: 1.35, temp: 65, vib: 1.05, flow: 260, risk: "Faible", predVib: 1.25, rul: 890, futureRisk: "Faible", align: 0 }
            }
        }
    };
}

// Load and display a specific machine
async function loadAndDisplayMachine(machineId) {
    console.log('loadAndDisplayMachine called for:', machineId);
    
    try {
        // Check if we already have this machine in allPumpsData
        const existingKey = `machine_${machineId}`;
        if (window.allPumpsData[existingKey]) {
            renderPumpDashboard(existingKey);
            return;
        }
        
        const token = localStorage.getItem('ipredict_token');
        const response = await fetch(`${API_URL}/machines/${machineId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Machine not found');
        
        const machine = await response.json();
        
        // Get department name
        let departmentName = 'N/A';
        if (machine.department_id) {
            const deptResponse = await fetch(`${API_URL}/departments/${machine.department_id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (deptResponse.ok) {
                const dept = await deptResponse.json();
                departmentName = dept.department_name;
            }
        }
        
        // Create dynamic key and add to allPumpsData
        const dynamicKey = `machine_${machine.machine_id}`;
        window.allPumpsData[dynamicKey] = {
            id: dynamicKey,
            actualId: machine.machine_id,
            name: machine.machine_name,
            dept: departmentName,
            status: machine.status || 'En ligne',
            metrics: {
                motor: { acc: 2.5, temp: 75, vib: 1.8, risk: "Moyen", predVib: 2.2, rul: 350, futureRisk: "Moyen", align: 0 },
                coupling: { acc: 3.2, temp: 70, vib: 2.2, align: 0.35, risk: "Moyen", predVib: 2.8, rul: 200, futureRisk: "Moyen" },
                pump: { acc: 1.3, temp: 65, vib: 1.0, flow: 250, risk: "Faible", predVib: 1.2, rul: 900, futureRisk: "Faible", align: 0 }
            }
        };
        
        // Render the pump dashboard
        if (typeof renderPumpDashboard === 'function') {
            renderPumpDashboard(dynamicKey);
        } else {
            console.error('renderPumpDashboard is not defined');
        }
        
    } catch (error) {
        console.error('Error loading machine:', error);
        document.getElementById('dashboardContent').innerHTML = `
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
// ========== MACHINE PARTS API FUNCTIONS ==========

// Fetch machine parts from database
async function fetchMachineParts(machineId) {
    console.log('Fetching parts for machine:', machineId);
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/machine-parts/machine/${machineId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            console.warn('Failed to fetch machine parts, status:', response.status);
            return [];
        }
        
        const parts = await response.json();
        console.log('Parts loaded:', parts.length);
        return parts;
    } catch (error) {
        console.error('Error fetching machine parts:', error);
        return [];
    }
}

// Create a new machine part
async function createMachinePart(machineId, partData) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/machine-parts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                machine_id: machineId,
                part_name: partData.part_name,
                point_column: partData.point_column,
                is_primary: partData.is_primary || false
            })
        });
        
        if (!response.ok) throw new Error('Failed to create machine part');
        return await response.json();
    } catch (error) {
        console.error('Error creating machine part:', error);
        throw error;
    }
}

// Update machine part
async function updateMachinePart(partId, partData) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/machine-parts/${partId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(partData)
        });
        
        if (!response.ok) throw new Error('Failed to update machine part');
        return await response.json();
    } catch (error) {
        console.error('Error updating machine part:', error);
        throw error;
    }
}

// Delete machine part
async function deleteMachinePart(partId) {
    try {
        const token = await getAuthToken();
        const response = await fetch(`${API_URL}/machine-parts/${partId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to delete machine part');
        return await response.json();
    } catch (error) {
        console.error('Error deleting machine part:', error);
        throw error;
    }
}

// Make functions globally available
window.fetchMachineParts = fetchMachineParts;
window.createMachinePart = createMachinePart;
window.updateMachinePart = updateMachinePart;
window.deleteMachinePart = deleteMachinePart;
// Send prediction email
async function sendPredictionEmail(machineName, machineId) {
    try {
        const token = localStorage.getItem('ipredict_token');
        
        if (!token) {
            if (typeof showNotification === 'function') {
                showNotification('❌ Veuillez vous reconnecter', 'error');
            }
            return false;
        }
        
        const response = await fetch(`${API_URL}/email/send-prediction-alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                machineName: machineName,
                machineId: machineId,
                hoursToFailure: 12
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (typeof showNotification === 'function') {
                if (result.mock) {
                    showNotification(`📧 [TEST] Email simulé pour ${machineName}`, 'info');
                } else {
                    showNotification(`✅ Alerte envoyée par email!`, 'success');
                }
            }
            return true;
        } else {
            if (typeof showNotification === 'function') {
                showNotification(`❌ Erreur: ${result.error}`, 'error');
            }
            return false;
        }
    } catch (error) {
        console.error('Send email error:', error);
        if (typeof showNotification === 'function') {
            showNotification('❌ Erreur de connexion', 'error');
        }
        return false;
    }
}

// Add a simple test function
function testApi() {
    console.log('API test - allPumpsData:', Object.keys(window.allPumpsData).length);
    return window.allPumpsData;
}

// Make functions globally available
window.loadDepartmentsAndMachines = loadDepartmentsAndMachines;
window.loadAndDisplayMachine = loadAndDisplayMachine;
window.sendPredictionEmail = sendPredictionEmail;
window.testApi = testApi;
window.createFallbackData = createFallbackData;

console.log('api.js loaded successfully');
console.log('loadDepartmentsAndMachines type:', typeof loadDepartmentsAndMachines);