// ========== UTILITY FUNCTIONS ==========
console.log('utils.js loading...');

// Global variables that need to be accessible everywhere
window.emailSubscriptions = JSON.parse(localStorage.getItem('emailSubscriptions') || '{}');
window.allPumpsData = window.allPumpsData || {};
window.departmentsFromDB = [];
window.machinesFromDB = [];

// Email subscription functions
function toggleSubscription(pumpId) {
    if (!window.emailSubscriptions) {
        window.emailSubscriptions = {};
    }
    window.emailSubscriptions[pumpId] = !window.emailSubscriptions[pumpId];
    localStorage.setItem('emailSubscriptions', JSON.stringify(window.emailSubscriptions));
    if (!window.emailSubscriptions[pumpId]) {
        localStorage.removeItem(`notified_${pumpId}`);
    }
    return window.emailSubscriptions[pumpId];
}

function isSubscribed(pumpId) {
    if (!window.emailSubscriptions) {
        window.emailSubscriptions = JSON.parse(localStorage.getItem('emailSubscriptions') || '{}');
    }
    return window.emailSubscriptions[pumpId] === true;
}

// Rest of your utility functions...
function getRiskClassFromValue(risk) {
    if (risk === 'Critique') return 'risk-high';
    if (risk === 'Élevé') return 'risk-medium';
    if (risk === 'Moyen') return 'risk-medium';
    return 'risk-low';
}

function getRiskClass(risk) {
    if (risk === 'Critique') return 'risk-critical-text';
    if (risk === 'Élevé') return 'risk-high-text';
    if (risk === 'Moyen') return 'risk-medium-text';
    return 'risk-low-text';
}

function getHighestRiskColor(risks) {
    if (!risks || risks.length === 0) return '#2c9e6b';
    if (risks.some(r => r.risk === 'Critique')) return '#d97777';
    if (risks.some(r => r.risk === 'Élevé')) return '#e6b422';
    return '#2c9e6b';
}

function getPredictionData(component, metrics) {
    if (!metrics || !metrics[component]) return [0, 0, 0, 0, 0, 0];
    const currentVib = parseFloat(metrics[component].vib) || 0;
    const predVib = parseFloat(metrics[component].predVib) || 0;
    return [
        currentVib, 
        currentVib + (predVib - currentVib) * 0.2, 
        currentVib + (predVib - currentVib) * 0.4, 
        currentVib + (predVib - currentVib) * 0.6, 
        currentVib + (predVib - currentVib) * 0.8, 
        predVib
    ];
}

function getThreshold(component) {
    if (component === 'motor') return 2.5;
    if (component === 'coupling') return 2.8;
    if (component === 'pump') return 1.5;
    return 2.0;
}

function getExplanation(component, metrics) {
    const data = metrics[component];
    if (!data) return "Données non disponibles";
    let explanations = [];
    if (parseFloat(data.vib) > 2.0) explanations.push(`Vibration élevée (${data.vib} mm/s)`);
    if (parseFloat(data.temp) > 75) explanations.push(`Température excessive (${data.temp}°C)`);
    if (parseFloat(data.acc) > 3.0) explanations.push(`Accélération anormale (${data.acc} m/s²)`);
    if (component === 'coupling' && data.align > 0.5) explanations.push(`Désalignement critique`);
    if (explanations.length === 0) return "Paramètres normaux";
    return explanations.join(" + ");
}

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
        background: ${type === 'success' ? '#2c9e6b' : type === 'error' ? '#e74c3c' : '#3498db'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    const icon = type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle');
    notification.innerHTML = `<i class="fas ${icon}"></i> ${message}`;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// User profile functions
let currentUser = {
    fullName: "Sara alaoui",
    role: "Responsable maintenance",
    email: "sara.alaoui@ipredict.com",
    phone: "+212 6 12 34 56 78",
    userId: null,
    passwordHash: btoa("sara@2024")
};

function updateHeaderUI() {
    const nameSpan = document.getElementById("headerUserName");
    const roleSpan = document.getElementById("headerUserRole");
    const avatarDiv = document.getElementById("headerAvatar");
    
    if(nameSpan && currentUser) {
        nameSpan.innerText = currentUser.fullName || "Utilisateur";
    }
    if(roleSpan && currentUser) {
        roleSpan.innerText = currentUser.role || "Rôle";
    }
    if(avatarDiv && currentUser) {
        const nameParts = (currentUser.fullName || "U").split(' ');
        let initials = nameParts[0].charAt(0).toUpperCase();
        if (nameParts.length > 1) {
            initials += nameParts[1].charAt(0).toUpperCase();
        }
        avatarDiv.innerText = initials;
    }
}

function saveUserToStorage() {
    if (currentUser) {
        localStorage.setItem("ipredict_user", JSON.stringify({ 
            fullName: currentUser.fullName, 
            role: currentUser.role, 
            email: currentUser.email, 
            phone: currentUser.phone,
            userId: currentUser.userId,
            passwordHash: currentUser.passwordHash 
        }));
    }
}

function loadUserFromStorage() {
    const stored = localStorage.getItem("ipredict_user");
    if(stored && currentUser) {
        try {
            const parsed = JSON.parse(stored);
            currentUser.fullName = parsed.fullName || currentUser.fullName;
            currentUser.email = parsed.email || currentUser.email;
            currentUser.phone = parsed.phone || currentUser.phone;
            currentUser.role = parsed.role || currentUser.role;
            currentUser.userId = parsed.userId;
            currentUser.passwordHash = parsed.passwordHash || currentUser.passwordHash;
        } catch(e) {
            console.error('Error loading user from storage:', e);
        }
    }
    updateHeaderUI();
}

function logout() {
    localStorage.removeItem('ipredict_session');
    localStorage.removeItem('ipredict_user');
    localStorage.removeItem('ipredict_token');
    sessionStorage.removeItem('ipredict_logged_in');
    sessionStorage.removeItem('user_role');
    
    showNotification('Déconnexion réussie', 'success');
    
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 500);
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

console.log('utils.js loaded successfully');