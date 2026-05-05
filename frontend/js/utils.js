function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 12px;
        color: white;
        font-size: 0.85rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? '#2c9e6b' : '#e74c3c'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
function escapeHtml(str) { return str.replace(/[&<>]/g, m => m==='&'?'&amp;':m==='<'?'&lt;':'&gt;'); }
// session-check.js - Include this in both dashboard pages
(function() {
    const session = localStorage.getItem('ipredict_session');
    const isLoggedIn = sessionStorage.getItem('ipredict_logged_in');
    
    if (!session || !isLoggedIn) {
        // No session, redirect to login
        window.location.href = 'login.html';
        return;
    }
    
    try {
        const userData = JSON.parse(session);
        const currentPage = window.location.pathname;
        
        // Check if user has access to current page
        if (currentPage.includes('admin_dashboard.html') && userData.role !== 'Admin') {
            // Non-admin trying to access admin page
            window.location.href = 'index.html';
        }
        
        // Display user info in header (optional)
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = userData.fullName;
        }
        
        const userRoleElement = document.getElementById('userRole');
        if (userRoleElement) {
            userRoleElement.textContent = userData.role;
        }
    } catch (e) {
        console.error('Session error:', e);
        window.location.href = 'login.html';
    }
})();
function toggleSubscription(pumpId) {
    emailSubscriptions[pumpId] = !emailSubscriptions[pumpId];
    localStorage.setItem('emailSubscriptions', JSON.stringify(emailSubscriptions));
    if (!emailSubscriptions[pumpId]) localStorage.removeItem(`notified_${pumpId}`);
    return emailSubscriptions[pumpId];
}
function getPredictionData(component, metrics) {
        const currentVib = metrics[component].vib;
        const predVib = metrics[component].predVib;
        return [currentVib, currentVib + (predVib - currentVib) * 0.2, currentVib + (predVib - currentVib) * 0.4, currentVib + (predVib - currentVib) * 0.6, currentVib + (predVib - currentVib) * 0.8, predVib];
    }
    
    function getThreshold(component) {
        if (component === 'motor') return 2.5;
        if (component === 'coupling') return 2.8;
        return 1.5;
    }
    function getRiskClass(risk) {
        if(risk === 'Critique') return 'risk-critical-text';
        if(risk === 'Élevé') return 'risk-high-text';
        if(risk === 'Modéré') return 'risk-medium-text';
        return 'risk-low-text';
    }
    
    function getExplanation(component, metrics) {
        const data = metrics[component];
        let explanations = [];
        if (data.vib > 2.0) explanations.push(`Vibration élevée (${data.vib} mm/s)`);
        if (data.temp > 75) explanations.push(`Température excessive (${data.temp}°C)`);
        if (data.acc > 3.0) explanations.push(`Accélération anormale (${data.acc} m/s²)`);
        if (component === 'coupling' && data.align > 0.5) explanations.push(`Désalignement critique`);
        if (explanations.length === 0) return "Paramètres normaux";
        return explanations.join(" + ");
    }
    
    
    function getDepartmentName(deptId) {
    const dept = departmentsFromDB.find(d => d.department_id === deptId);
    return dept ? dept.department_name : 'N/A';
}
function showProfileMsg(msg, type) {
    const container = document.getElementById('profileFormMessage');
    if(container) {
        container.innerHTML = `<div class="form-message ${type === 'success' ? 'success-message' : 'error-message'}">${msg}</div>`;
        setTimeout(() => { 
            if(container) container.innerHTML = ''; 
        }, 3000);
    }
}
function verifyPassword(plain) {
    // The stored password might be either plain text or base64 encoded
    const enteredHash = btoa(plain);
    
    console.log('Entered plain password:', plain);
    console.log('Entered base64 hash:', enteredHash);
    console.log('Stored password value:', currentUser.passwordHash);
    
    // Check if stored password is base64 encoded or plain text
    let storedHash = currentUser.passwordHash;
    
    // If stored password is not base64 (doesn't look like base64 or is shorter), encode it
    if (storedHash && storedHash.length < 10 && !storedHash.match(/^[A-Za-z0-9+/=]+$/)) {
        // Stored is plain text, encode it for comparison
        storedHash = btoa(storedHash);
        console.log('Converted stored plain to base64:', storedHash);
    }
    
    const isValid = enteredHash === storedHash;
    console.log('Passwords match:', isValid);
    return isValid;
}

function updatePassword(plain) {
    const newHash = btoa(plain);
    currentUser.passwordHash = newHash;
    saveUserToStorage();
    console.log('Password updated successfully. New hash:', newHash);
}
function updateProfile(newName, newEmail, newPhone) {
    currentUser.fullName = newName;
    currentUser.email = newEmail;
    currentUser.phone = newPhone;
    saveUserToStorage();
    
    // Also update the session storage so header updates persist
    const session = localStorage.getItem('ipredict_session');
    if(session) {
        try {
            const sessionData = JSON.parse(session);
            sessionData.fullName = newName;
            sessionData.email = newEmail;
            localStorage.setItem('ipredict_session', JSON.stringify(sessionData));
        } catch(e) {}
    }
    updateHeaderUI();
}