// Email Service for frontend
const EmailService = {
    // Send prediction alert email to the connected user
    async sendPredictionAlert(machineName, machineId, hoursToFailure = 12) {
        try {
            // Get the currently logged-in user from localStorage
            const session = localStorage.getItem('ipredict_session');
            const user = JSON.parse(session || '{}');
            const userEmail = user.email || this.getUserEmailFromStorage();
            
            if (!userEmail) {
                console.error('No user email found');
                this.showEmailSimulation(machineName, 'Email non trouvé');
                return false;
            }
            
            const token = localStorage.getItem('ipredict_token');
            
            const emailData = {
                to: userEmail,  // Send to the connected user's email
                subject: `⚠️ ALERTE PRÉDICTIVE - ${machineName} risque de panne`,
                template: 'prediction-alert',
                data: {
                    machineName: machineName,
                    machineId: machineId,
                    hoursToFailure: hoursToFailure,
                    userName: user.fullName || 'Utilisateur',
                    userEmail: userEmail,
                    date: new Date().toLocaleString()
                }
            };
            
            const response = await fetch(`${API_URL}/email/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(emailData)
            });
            
            if (response.ok) {
                const result = await response.json();
                showNotification(`📧 Alerte envoyée à ${userEmail}`, 'success');
                return true;
            } else {
                this.showEmailSimulation(machineName, userEmail);
                return false;
            }
        } catch (error) {
            console.error('Email error:', error);
            this.showEmailSimulation(machineName, 'Erreur d\'envoi');
            return false;
        }
    },
    
    getUserEmailFromStorage() {
        // Try to get from ipredict_user
        const userData = localStorage.getItem('ipredict_user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.email || '';
            } catch(e) {}
        }
        return '';
    },
    
    getUserName() {
        const session = localStorage.getItem('ipredict_session');
        const user = JSON.parse(session || '{}');
        return user.fullName || 'Utilisateur';
    },
    
    showEmailSimulation(machineName, userEmail) {
        const email = userEmail || 'utilisateur@ipredict.com';
        alert(`📧 SIMULATION D'EMAIL\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📨 À: ${email}\n📋 Objet: ALERTE PRÉDICTIVE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔔 ALERTE MAINTENANCE PRÉDICTIVE\n\nMachine: ${machineName}\n⚠️ Risque: Panne prédite dans les 12 heures\n🛠️ Action: Intervention immédiate requise\n\n📧 Email envoyé à l'utilisateur connecté: ${email}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📌 iPredict - Intelligence Prédictive\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        showNotification(`🔔 Simulation: Alerte pour ${machineName} envoyée à ${email}`, 'info');
    }
};
function simulateEmail(pumpId, pumpName) {
    alert(`📧 SIMULATION: Email envoyé à responsable@ipredict.com\nObjet: ALERTE - ${pumpName} est EN PANNE !\n\nMachine: ${pumpName}\nStatut: Critique (RUL < 100h)\nIntervention requise immédiatement.`);
    console.log(`[EMAIL] To: responsable@ipredict.com - ${pumpName} en panne`);
}



function isSubscribed(pumpId) {
    return emailSubscriptions[pumpId] === true;
}

// Periodically check subscribed machines for failure (every 30 seconds)
setInterval(() => {
    for (let [pumpId, subscribed] of Object.entries(emailSubscriptions)) {
        if (!subscribed) continue;
        const pump = allPumpsData[pumpId];
        if (!pump) continue;
        const isPanne = pump.metrics.coupling.risk === 'Critique' || pump.metrics.motor.risk === 'Critique';
        const alreadyNotified = localStorage.getItem(`notified_${pumpId}`) === 'true';
        if (isPanne && !alreadyNotified) {
            simulateEmail(pumpId, pump.name);
            localStorage.setItem(`notified_${pumpId}`, 'true');
        } else if (!isPanne) {
            localStorage.removeItem(`notified_${pumpId}`);
        }
    }
}, 30000);