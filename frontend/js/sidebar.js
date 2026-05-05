function renderSidebarFromDatabase() {
    const deptDropdown = document.getElementById('deptDropdown');
    if (!deptDropdown) return;
    
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
        const deptCode = dept.department_code;
        const deptKey = deptCode ? deptCode.toLowerCase() : `dept_${deptId}`;
        const machines = machinesByDept[deptId] || [];
        
        dropdownHtml += `
            <div class="dept-item" data-dept="${deptKey}" data-dept-id="${deptId}">
                <i class="fas ${getDepartmentIcon(deptName)}"></i> ${deptName}
                <i class="fas fa-chevron-right dept-chevron"></i>
            </div>
            <div class="pumps-sublist" id="pumps-${deptKey}">
        `;
        
        machines.forEach(machine => {
            dropdownHtml += `
                <div class="pump-item" data-pump-id="${machine.machine_id}" data-pump-name="${machine.machine_name}">
                    <i class="fas fa-oil-can"></i> ${machine.machine_name}
                    <span class="pump-status">${machine.status || 'En ligne'}</span>
                </div>
            `;
        });
        
        dropdownHtml += `</div>`;
    });
    
    deptDropdown.innerHTML = dropdownHtml;
    
    // Re-attach event listeners for dynamically created elements
    attachSidebarEvents();
}
function attachSidebarEvents() {
    // Department toggle button
    const deptToggle = document.getElementById('departmentToggleBtn');
    const deptDropdown = document.getElementById('deptDropdown');
    const chevron = document.querySelector('.chevron-icon');
    
    if (deptToggle && deptDropdown) {
        // Remove old listener to avoid duplicates
        const newDeptToggle = deptToggle.cloneNode(true);
        deptToggle.parentNode.replaceChild(newDeptToggle, deptToggle);
        
        newDeptToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            deptDropdown.classList.toggle('show');
            const newChevron = newDeptToggle.querySelector('.chevron-icon');
            if (newChevron) {
                newChevron.style.transform = deptDropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }
    
    // Department items click - toggle pumps sublist
    document.querySelectorAll('.dept-item').forEach(item => {
        const newItem = item.cloneNode(true);
        item.parentNode.replaceChild(newItem, item);
        
        newItem.addEventListener('click', (e) => {
            e.stopPropagation();
            const deptKey = newItem.getAttribute('data-dept');
            const pumpsList = document.getElementById(`pumps-${deptKey}`);
            const chevronIcon = newItem.querySelector('.dept-chevron');
            
            if (pumpsList) {
                pumpsList.classList.toggle('show');
                if (chevronIcon) {
                    chevronIcon.style.transform = pumpsList.classList.contains('show') ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            }
        });
    });
    
    // Pump items click - render pump dashboard
    // Pump items click - render pump dashboard
document.querySelectorAll('.pump-item').forEach(pump => {
    const newPump = pump.cloneNode(true);
    pump.parentNode.replaceChild(newPump, pump);
    
    newPump.addEventListener('click', (e) => {
        e.stopPropagation();
        const pumpId = newPump.getAttribute('data-pump-id');
        const pumpName = newPump.getAttribute('data-pump-name');
        console.log('Selected pump - ID:', pumpId, 'Name:', pumpName);
        
        if (pumpId) {
            // Check if it's a static key (sap_p1, af_p2, etc.)
            if (allPumpsData[pumpId]) {
                renderPumpDashboard(pumpId);
            } else {
                // It's a database ID, load it dynamically
                loadAndDisplayMachine(pumpId);
            }
        }
        
        // Update active state
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
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
    // Keep your existing static HTML or show message
    console.log('Using static sidebar data');
}

// Call this after loading user data
async function initSidebar() {
    await loadDepartmentsAndMachines();
}