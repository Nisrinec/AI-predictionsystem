// ========== MAIN INITIALIZATION ==========
console.log('Main.js loaded');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // Check if required functions exist
    if (typeof loadDepartmentsAndMachines === 'undefined') {
        console.error('loadDepartmentsAndMachines is not defined! Check if api.js loaded correctly');
    }
    
    if (typeof renderOverallDashboard === 'undefined') {
        console.error('renderOverallDashboard is not defined! Check if dashboard.js loaded correctly');
    }
    
    // Initialize event listeners
    initEventListeners();
    
    // Load departments and machines first, then render dashboard
    initializeApp();
});

async function initializeApp() {
    console.log('Initializing app...');
    
      
    try {
        // Load user profile from database first
        if (typeof loadUserProfileFromDatabase === 'function') {
            await loadUserProfileFromDatabase();
            console.log('User profile loaded from database');
        }
        
        // Load user from storage as fallback
        if (typeof loadUserFromStorage === 'function') {
            loadUserFromStorage();
        }
        
        // Load departments and machines
        if (typeof loadDepartmentsAndMachines === 'function') {
            await loadDepartmentsAndMachines();
        }
        
        // Render dashboard
        if (typeof renderOverallDashboard === 'function') {
            renderOverallDashboard();
        }
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        if (typeof renderOverallDashboard === 'function') {
            renderOverallDashboard();
        }
    }
}

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
        },
        'cap_p1': {
            id: 'cap_p1',
            name: 'Pompe CAP-200',
            dept: 'CAP',
            status: 'En ligne',
            actualId: 3,
            metrics: {
                motor: { acc: 2.65, temp: 75, vib: 1.75, risk: "Moyen", predVib: 2.25, rul: 380, futureRisk: "Moyen", align: 0 },
                coupling: { acc: 3.80, temp: 71, vib: 2.35, align: 0.38, risk: "Élevé", predVib: 3.35, rul: 145, futureRisk: "Élevé" },
                pump: { acc: 1.15, temp: 63, vib: 0.90, flow: 270, risk: "Faible", predVib: 1.02, rul: 1100, futureRisk: "Faible", align: 0 }
            }
        }
    };
}

function initEventListeners() {
    console.log('Initializing event listeners');
    
    // Department toggle
    const deptToggle = document.getElementById('departmentToggleBtn');
    const deptDropdown = document.getElementById('deptDropdown');
    const chevron = document.querySelector('.chevron-icon');
    
    if(deptToggle) {
        deptToggle.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if(deptDropdown) {
                deptDropdown.classList.toggle('show'); 
            }
            if(chevron) {
                chevron.style.transform = deptDropdown && deptDropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
            }
        });
    }
    
    // Profile dropdown
    const profileBtn = document.getElementById('userProfileBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if(profileBtn) {
        profileBtn.addEventListener('click', (e) => { 
            e.stopPropagation(); 
            if(userDropdown) userDropdown.classList.toggle('show'); 
        });
    }
    
    document.addEventListener('click', () => {
        if(userDropdown) userDropdown.classList.remove('show');
    });
    
    // Navigation
    const navDashboard = document.getElementById('navDashboard');
    const navAlerts = document.getElementById('navAlerts');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if(navDashboard) {
        navDashboard.addEventListener('click', () => { 
            navLinks.forEach(l => l.classList.remove('active')); 
            navDashboard.classList.add('active'); 
            if(typeof renderOverallDashboard === 'function') {
                renderOverallDashboard(); 
            }
        });
    }
    
    if(navAlerts) {
        navAlerts.addEventListener('click', () => { 
            navLinks.forEach(l => l.classList.remove('active')); 
            navAlerts.classList.add('active'); 
            if(typeof renderAlertsDashboard === 'function') {
                renderAlertsDashboard(); 
            }
        });
    }
    
    // Search functionality
    const searchInput = document.getElementById('globalSearch');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => { 
            const term = e.target.value.toLowerCase(); 
            if (term.length > 0 && window.allPumpsData) { 
                const match = Object.entries(window.allPumpsData).find(([id, p]) => 
                    p.name.toLowerCase().includes(term) || p.dept.toLowerCase().includes(term)
                ); 
                if (match && typeof renderPumpDashboard === 'function') { 
                    navLinks.forEach(l => l.classList.remove('active')); 
                    renderPumpDashboard(match[0]); 
                } else if (typeof renderOverallDashboard === 'function') { 
                    renderOverallDashboard(); 
                } 
            } else if (typeof renderOverallDashboard === 'function') { 
                renderOverallDashboard(); 
            } 
        });
    }
    
    // Profile menu item
   // Profile menu item click handler
const profileMenuItem = document.getElementById('profileMenuItem');
if (profileMenuItem) {
    profileMenuItem.addEventListener('click', (e) => {
        e.stopPropagation();
        // Close dropdown
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) userDropdown.classList.remove('show');
        // Render profile page
        if (typeof renderProfilePage === 'function') {
            renderProfilePage();
        } else {
            console.error('renderProfilePage is not defined');
            alert('Function renderProfilePage not available');
        }
    });
} else {
    console.warn('profileMenuItem not found in DOM');
}
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        const newLogoutBtn = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
        
        newLogoutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(typeof logout === 'function') {
                logout();
            }
        });
    }
}

console.log('main.js loaded successfully');