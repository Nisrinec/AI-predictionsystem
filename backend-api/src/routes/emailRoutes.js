const express = require('express');
const emailService = require('../services/emailService');
const { authMiddleware } = require('../middleware/authMiddleware');
const db = require('../config/database');

const router = express.Router();

// Send prediction alert email
router.post('/send-prediction-alert', authMiddleware, async (req, res) => {
    const { machineName, machineId, hoursToFailure } = req.body;
    const userId = req.user.userId;
    
    try {
        // Get user email from database
        const userResult = await db.query(
            'SELECT email, full_name FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const userEmail = userResult.rows[0].email;
        const userName = userResult.rows[0].full_name;
        
        // Send email
        const result = await emailService.sendPredictionAlert(
            userEmail,
            userName,
            machineName,
            machineId,
            hoursToFailure || 12
        );
        
        if (result.success) {
            res.json({ 
                success: true, 
                message: `Email sent to ${userEmail}`,
                mock: result.mock || false
            });
        } else {
            res.status(500).json({ success: false, error: result.error });
        }
        
    } catch (error) {
        console.error('Email route error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;