const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        this.transporter = null;
        this.initTransporter();
    }

    initTransporter() {
        if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
            this.transporter = nodemailer.createTransport({
                host: process.env.EMAIL_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.EMAIL_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                },
                tls: {
                    rejectUnauthorized: false
                }
            });
            console.log('✅ Email service initialized');
        } else {
            console.log('⚠️ Email service: No credentials provided');
        }
    }

    async sendPredictionAlert(to, userName, machineName, machineId, hoursToFailure = 12) {
        const subject = `⚠️ ALERTE PRÉDICTIVE - ${machineName} risque de panne`;
        
        const html = this.buildEmailHTML(userName, machineName, machineId, hoursToFailure);
        const text = this.buildEmailText(userName, machineName, machineId, hoursToFailure);

        const mailOptions = {
            from: process.env.EMAIL_FROM || '"iPredict AI" <noreply@ipredict.com>',
            to: to,
            subject: subject,
            text: text,
            html: html
        };

        if (this.transporter) {
            try {
                const info = await this.transporter.sendMail(mailOptions);
                console.log(`📧 Email sent to ${to}:`, info.messageId);
                return { success: true, messageId: info.messageId };
            } catch (error) {
                console.error('Email send error:', error);
                return { success: false, error: error.message };
            }
        } else {
            // Fallback for development
            console.log('📧 MOCK EMAIL (no credentials):');
            console.log('To:', to);
            console.log('Subject:', subject);
            console.log('Body:', text);
            return { success: true, mock: true };
        }
    }

    buildEmailHTML(userName, machineName, machineId, hoursToFailure) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>iPredict Alerte</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0a1f1c 0%, #1b6e50 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 5px 0 0; opacity: 0.9; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; }
        .alert-box { background: #fff5f0; border-left: 4px solid #e74c3c; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .machine-name { color: #e74c3c; font-size: 1.3em; font-weight: bold; }
        .info-row { margin: 10px 0; padding: 8px; background: white; border-radius: 6px; }
        .label { font-weight: bold; color: #2c9e6b; width: 120px; display: inline-block; }
        .urgent { background: #e74c3c; color: white; padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: bold; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #e2e8f0; margin-top: 20px; }
        .button { background: #2c9e6b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 iPredict</h1>
            <p>Intelligence Prédictive Industrielle</p>
        </div>
        <div class="content">
            <h2>Bonjour ${userName},</h2>
            <p>Notre système de détection prédictive a identifié un risque critique sur l'une de vos machines :</p>
            
            <div class="alert-box">
                <h3 style="margin-top: 0;">📌 <span class="machine-name">${machineName}</span></h3>
                <div class="info-row">
                    <span class="label">⚠️ Statut:</span> RISQUE DE PANNE PRÉDIT
                </div>
                <div class="info-row">
                    <span class="label">⏰ Délai estimé:</span> Moins de ${hoursToFailure} heures
                </div>
                <div class="info-row">
                    <span class="label">🆔 ID Machine:</span> #${machineId}
                </div>
                <div class="info-row">
                    <span class="label">📅 Détection:</span> ${new Date().toLocaleString()}
                </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
                <span class="urgent">⚠️ INTERVENTION IMMÉDIATE REQUISE ⚠️</span>
            </div>
            
            <p><strong>🛠️ Actions recommandées :</strong></p>
            <ul>
                <li>Planifier une intervention de maintenance d'urgence</li>
                <li>Vérifier les paramètres de vibration et température</li>
                <li>Contacter l'équipe technique si nécessaire</li>
            </ul>
            
            <div style="text-align: center;">
                <a href="#" style="background: #2c9e6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    📊 Accéder au tableau de bord
                </a>
            </div>
        </div>
        <div class="footer">
            <p>Cet email a été généré automatiquement par iPredict.</p>
            <p>© 2025 iPredict - Maintenance Prédictive IA | Tous droits réservés</p>
            <p style="font-size: 11px;">Pour ne plus recevoir ces alertes, contactez votre administrateur.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    buildEmailText(userName, machineName, machineId, hoursToFailure) {
        return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                    iPredict - ALERTE PRÉDICTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Bonjour ${userName},

Notre système a détecté un risque critique sur votre machine :

📌 Machine: ${machineName}
⚠️ Risque: PANNÉE PRÉDITE
⏰ Délai: Moins de ${hoursToFailure} heures
🆔 ID: #${machineId}
📅 Date: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ INTERVENTION IMMÉDIATE REQUISE ⚠️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Actions recommandées:
1. Planifier une intervention d'urgence
2. Vérifier les paramètres critiques
3. Contacter l'équipe technique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
iPredict - Intelligence Prédictive
Cet email a été généré automatiquement.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `;
    }
}

module.exports = new EmailService();