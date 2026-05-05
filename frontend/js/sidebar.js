// ========== SIDEBAR MODULE ==========
console.log('sidebar.js loading...');

// Render sidebar from database data
function renderSidebarFromDatabase() {
    console.log('renderSidebarFromDatabase called');
    const deptDropdown = document.getElementById('deptDropdown');
    if (!deptDropdown) return;
    
    if (!departmentsFromDB || departmentsFromDB.length === 0) {
        deptDropdown.innerHTML = '<div class="loading-depts">Aucun département trouvé</div>';
        return;
    }
    
    // Group machines by department
    const machinesByDept = {};
    machinesFromDB.forEach(machine => {
        const deptId = machine.department_id;
        if (!machinesByDept[deptId]) {
            machinesByDept[deptId] = [];
        }
        machinesByDept[deptId].push(machine);
    });
    
    // Build department items dynamically
    let dropdownHtml = '';
    
    departmentsFromDB.forEach(dept => {
        const deptId = dept.department_id;
        const deptName = dept.department_name;
        const deptKey = `dept_${deptId}`;
        const machines = machinesByDept[deptId] || [];
        
        dropdownHtml += `
            <div class="dept-item" data-dept="${deptKey}" data-dept-id="${deptId}">
                <i class="fas ${getDepartmentIcon(deptName)}"></i> ${deptName}
                <i class="fas fa-chevron-right dept-chevron"></i>
            </div>
            <div class="pumps-sublist" id="pumps-${deptKey}" style="display: none;">
        `;
        
        machines.forEach(machine => {
            const pumpKey = `machine_${machine.machine_id}`;
            dropdownHtml += `
                <div class="pump-item" data-pump-id="${pumpKey}" data-machine-id="${machine.machine_id}" data-pump-name="${escapeHtml(machine.machine_name)}">
                    <i class="fas fa-oil-can"></i> ${escapeHtml(machine.machine_name)}
                    <span class="pump-status">${machine.status || 'En ligne'}</span>
                </div>
            `;
        });
        
        dropdownHtml += `</div>`;
    });
    
    deptDropdown.innerHTML = dropdownHtml;
    
    // Attach event listeners after DOM is updated
    setTimeout(() => {
        attachSidebarEvents();
    }, 100);
}

// Attach event listeners to sidebar elements
function attachSidebarEvents() {
    console.log('Attaching sidebar events');
    
    // Department items click - toggle pumps sublist
    document.querySelectorAll('.dept-item').forEach(item => {
        // Remove old listener to avoid duplicates
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', (e) => {
            e.stopPropagation();
            const deptKey = newItem.getAttribute('data-dept');
            const pumpsList = document.getElementById(`pumps-${deptKey}`);
            const chevronIcon = newItem.querySelector('.dept-chevron');
            
            if (pumpsList) {
                const isVisible = pumpsList.style.display === 'flex';
                pumpsList.style.display = isVisible ? 'none' : 'flex';
                if (chevronIcon) {
                    chevronIcon.style.transform = !isVisible ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            }
        });
    });
    
    // Pump items click - render pump dashboard
    document.querySelectorAll('.pump-item').forEach(pump => {
        const newPump = pump.cloneNode(true);
        pump.parentNode.replaceChild(newPump, pump);
        
        newPump.addEventListener('click', (e) => {
            e.stopPropagation();
            const pumpId = newPump.getAttribute('data-pump-id');
            const machineId = newPump.getAttribute('data-machine-id');
            const pumpName = newPump.getAttribute('data-pump-name');
            
            console.log('Pump clicked - ID:', pumpId, 'Machine ID:', machineId, 'Name:', pumpName);
            
            // Update active state in navigation
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            
            // Check if pump exists in allPumpsData
            if (pumpId && allPumpsData && allPumpsData[pumpId]) {
                console.log('Found pump in allPumpsData, rendering dashboard');
                renderPumpDashboard(pumpId);
            } 
            // If not found but we have machineId, try to load from database
            else if (machineId && typeof loadAndDisplayMachine === 'function') {
                console.log('Pump not in allPumpsData, loading from database:', machineId);
                loadAndDisplayMachine(machineId);
            }
            // Fallback: create temporary pump data
            else {
                console.log('Creating fallback pump data for:', pumpName);
                const tempKey = pumpId || `temp_${Date.now()}`;
                if (!allPumpsData[tempKey]) {
                    allPumpsData[tempKey] = {
                        id: tempKey,
                        name: pumpName || 'Machine',
                        dept: 'Général',
                        status: 'En ligne',
                        metrics: {
                            motor: { acc: 2.5, temp: 75, vib: 1.8, risk: "Moyen", predVib: 2.2, rul: 350, futureRisk: "Moyen", align: 0 },
                            coupling: { acc: 3.2, temp: 70, vib: 2.2, align: 0.35, risk: "Moyen", predVib: 2.8, rul: 200, futureRisk: "Moyen" },
                            pump: { acc: 1.3, temp: 65, vib: 1.0, flow: 250, risk: "Faible", predVib: 1.2, rul: 900, futureRisk: "Faible", align: 0 }
                        }
                    };
                }
                renderPumpDashboard(tempKey);
            }
        });
    });
}

function getDepartmentIcon(deptName) {
    const name = deptName.toLowerCase();
    if (name.includes('sap')) return 'fa-flask';
    if (name.includes('af') || name.includes('filtration')) return 'fa-tint';
    if (name.includes('cap')) return 'fa-industry';
    if (name.includes('engrais')) return 'fa-leaf';
    return 'fa-building';
}

function renderStaticSidebar() {
    console.log('Using static sidebar data');
    const deptDropdown = document.getElementById('deptDropdown');
    if (deptDropdown) {
        deptDropdown.innerHTML = `
            <div class="dept-item" data-dept="sap">
                <i class="fas fa-flask"></i> SAP
                <i class="fas fa-chevron-right dept-chevron"></i>
            </div>
            <div class="pumps-sublist" id="pumps-sap" style="display: none;">
                <div class="pump-item" data-pump-id="sap_p1" data-machine-id="1" data-pump-name="Pompe SAP-01">
                    <i class="fas fa-oil-can"></i> Pompe SAP-01
                    <span class="pump-status">En ligne</span>
                </div>
                <div class="pump-item" data-pump-id="sap_p2" data-machine-id="2" data-pump-name="Pompe SAP-02">
                    <i class="fas fa-oil-can"></i> Pompe SAP-02
                    <span class="pump-status">En ligne</span>
                </div>
            </div>
            <div class="dept-item" data-dept="af">
                <i class="fas fa-tint"></i> AF
                <i class="fas fa-chevron-right dept-chevron"></i>
            </div>
            <div class="pumps-sublist" id="pumps-af" style="display: none;">
                <div class="pump-item" data-pump-id="af_p1" data-machine-id="3" data-pump-name="Pompe AF-101">
                    <i class="fas fa-oil-can"></i> Pompe AF-101
                    <span class="pump-status">En ligne</span>
                </div>
            </div>
            <div class="dept-item" data-dept="cap">
                <i class="fas fa-industry"></i> CAP
                <i class="fas fa-chevron-right dept-chevron"></i>
            </div>
            <div class="pumps-sublist" id="pumps-cap" style="display: none;">
                <div class="pump-item" data-pump-id="cap_p1" data-machine-id="4" data-pump-name="Pompe CAP-200">
                    <i class="fas fa-oil-can"></i> Pompe CAP-200
                    <span class="pump-status">En ligne</span>
                </div>
            </div>
        `;
        attachSidebarEvents();
    }
}

console.log('sidebar.js loaded successfully');