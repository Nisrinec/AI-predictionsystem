const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            console.log('📧 Service email : mode simulation activé');
            return;
        }

        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        console.log('✅ Service email prêt');
    }

    async sendPredictionAlert(to, userName, machineName, machinePart, machineId, hoursToFailure = 12) {
        const alertData = {
            to,
            userName,
            machineName,
            machinePart,
            machineId,
            hoursToFailure,
            timestamp: new Date().toLocaleString('fr-FR'),
            dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000/dashboard'
        };

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"iPredict" <noreply@ipredict.com>',
            to: alertData.to,
            subject: `⚠️ Alerte : ${machineName} - risque de panne sur ${machinePart}`,
            html: this.buildHtmlEmail(alertData),
            text: this.buildTextEmail(alertData)
        };

        if (!this.transporter) {
            this.logMockEmail(mailOptions);
            return { success: true, mock: true, to: alertData.to };
        }

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Alerte envoyée à ${alertData.to}`);
            return { success: true, messageId: info.messageId, to: alertData.to };
        } catch (error) {
            console.error(`❌ Échec d'envoi de l'alerte : ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    buildHtmlEmail(data) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 500px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        
        <!-- En-tête avec Logo -->
        <div style="background: linear-gradient(135deg, #1a3c34 0%, #2c9e6b 100%); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block;">
                <!-- Icône d'engrenage SVG -->
                <div style="margin-bottom: 10px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M19.4 15.05L18.3 15.65C18.1 15.75 17.9 15.85 17.7 15.95L17.5 16.05C16.9 16.35 16.4 17 16.3 17.7L16.1 18.9C16 19.6 15.4 20.1 14.7 20.1H9.3C8.6 20.1 8 19.6 7.9 18.9L7.7 17.7C7.6 17 7.1 16.4 6.5 16.1L5.3 15.5C4.7 15.2 4.3 14.6 4.3 13.9V10.1C4.3 9.4 4.7 8.8 5.3 8.5L6.5 7.9C7.1 7.6 7.6 7 7.7 6.3L7.9 5.1C8 4.4 8.6 3.9 9.3 3.9H14.7C15.4 3.9 16 4.4 16.1 5.1L16.3 6.3C16.4 7 16.9 7.6 17.5 7.9L18.7 8.5C19.3 8.8 19.7 9.4 19.7 10.1V13.9C19.7 14.5 19.6 14.8 19.4 15.05Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="white"/>
                    </svg>
                </div>
                <div style="color: white;">
                    <h2 style="margin: 0; font-size: 28px; font-weight: bold;">iPredict</h2>
                    <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Prédictive basée sur l'IA</p>
                </div>
            </div>
        </div>
        
        <!-- Contenu -->
        <div style="padding: 30px 25px;">
            <h2 style="color: #d32f2f; margin-top: 0;">⚠️ Alerte Maintenance</h2>
            
            <p>Bonjour <strong>${data.userName}</strong>,</p>
            
            <p>Nous avons détecté que <strong>${data.machineName}</strong> - <strong>${data.machinePart}</strong> risque de tomber en panne dans <strong>${data.hoursToFailure} heures</strong>.</p>
            
            <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 5px 0;"><strong>Machine :</strong> ${data.machineName}</p>
                <p style="margin: 5px 0;"><strong>Composant :</strong> ${data.machinePart}</p>
                <p style="margin: 5px 0;"><strong>Délai avant panne :</strong> ${data.hoursToFailure} heures</p>
                <p style="margin: 5px 0;"><strong>Détecté le :</strong> ${data.timestamp}</p>
            </div>
            
            <p>Nous vous conseillons de consulter le tableau de bord pour plus de détails et d'intervenir immédiatement.</p>
            
            <div style="text-align: center; margin: 25px 0;">
                <a href="${data.dashboardUrl}" style="display: inline-block; background: #2c9e6b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                    Voir le tableau de bord →
                </a>
            </div>
            
            <hr style="margin: 25px 0 15px; border: none; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #999; margin: 0; text-align: center;">iPredict - Système de Maintenance Prédictive</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    buildTextEmail(data) {
        return `
╔════════════════════════════════════════╗
║           iPredict                     ║
║     Prédictive basée sur l'IA          ║
╚════════════════════════════════════════╝

ALERTE MAINTENANCE
==================

Bonjour ${data.userName},

Nous avons détecté que ${data.machineName} - ${data.machinePart} risque de tomber en panne dans ${data.hoursToFailure} heures.

Machine : ${data.machineName}
Composant : ${data.machinePart}
Délai avant panne : ${data.hoursToFailure} heures
Détecté le : ${data.timestamp}

Nous vous conseillons de consulter le tableau de bord pour plus de détails et d'intervenir immédiatement.

Tableau de bord : ${data.dashboardUrl}

---
iPredict - Système de Maintenance Prédictive
        `;
    }

    logMockEmail(mailOptions) {
        console.log('\n📧 EMAIL SIMULÉ');
        console.log('À:', mailOptions.to);
        console.log('Sujet:', mailOptions.subject);
        console.log('Contenu:\n', mailOptions.text);
        console.log('---\n');
    }
}

module.exports = new EmailService();