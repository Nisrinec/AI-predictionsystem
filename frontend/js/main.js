setTimeout(() => {
    if (typeof loadDepartmentsAndMachines === 'function') {
        loadDepartmentsAndMachines();
    }
}, 500);
// Update profile in database

    const deptToggle = document.getElementById('departmentToggleBtn');
    const deptDropdown = document.getElementById('deptDropdown');
    const chevron = document.querySelector('.chevron-icon');
    if(deptToggle) deptToggle.addEventListener('click', (e) => { e.stopPropagation(); deptDropdown.classList.toggle('show'); chevron.style.transform = deptDropdown.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)'; });
    document.querySelectorAll('.dept-item').forEach(item => { const cr = item.querySelector('.dept-chevron'); item.addEventListener('click', (e) => { e.stopPropagation(); const deptKey = item.getAttribute('data-dept'); const pumpsList = document.getElementById(`pumps-${deptKey}`); if(pumpsList) { pumpsList.classList.toggle('show'); if(cr) cr.style.transform = pumpsList.classList.contains('show') ? 'rotate(90deg)' : 'rotate(0deg)'; } }); });
    const profileBtn = document.getElementById('userProfileBtn'); const userDropdown = document.getElementById('userDropdown');
    profileBtn?.addEventListener('click', (e) => { e.stopPropagation(); userDropdown.classList.toggle('show'); });
    document.addEventListener('click', () => userDropdown?.classList.remove('show'));
    // document.getElementById('logoutBtn')?.addEventListener('click', () => alert("Déconnexion simulée."));
    
    const navDashboard = document.getElementById('navDashboard');
    const navAlerts = document.getElementById('navAlerts');
    const navLinks = document.querySelectorAll('.nav-link');
    navDashboard.addEventListener('click', () => { navLinks.forEach(l => l.classList.remove('active')); navDashboard.classList.add('active'); renderOverallDashboard(); });
    navAlerts.addEventListener('click', () => { navLinks.forEach(l => l.classList.remove('active')); navAlerts.classList.add('active'); renderAlertsDashboard(); });
    
    // document.querySelectorAll('.pump-item').forEach(pump => { pump.addEventListener('click', (e) => { e.stopPropagation(); const pumpId = pump.getAttribute('data-pump'); if (pumpId && allPumpsData[pumpId]) { navLinks.forEach(l => l.classList.remove('active')); renderPumpDashboard(pumpId); } }); });
    
    const searchInput = document.getElementById('globalSearch');
    searchInput?.addEventListener('input', (e) => { const term = e.target.value.toLowerCase(); if (term.length > 0) { const match = Object.entries(allPumpsData).find(([id, p]) => p.name.toLowerCase().includes(term) || p.dept.toLowerCase().includes(term)); if (match) { navLinks.forEach(l => l.classList.remove('active')); renderPumpDashboard(match[0]); } else { renderOverallDashboard(); } } else { renderOverallDashboard(); } });
    
    renderOverallDashboard();
    // ========== USER MANAGEMENT (add to your existing <script>) ==========

// This function now only does localStorage backup (not the main save)
function saveUserToStorage() {
    localStorage.setItem("ipredict_user", JSON.stringify({ 
        fullName: currentUser.fullName, 
        role: currentUser.role, 
        email: currentUser.email, 
        phone: currentUser.phone,
        userId: currentUser.userId,
        passwordHash: currentUser.passwordHash 
    }));
    console.log('📱 User saved to localStorage (backup):', currentUser.fullName);
}

// Initial load user data from localStorage
loadUserFromStorage();
// Load departments and machines from database
loadDepartmentsAndMachines();