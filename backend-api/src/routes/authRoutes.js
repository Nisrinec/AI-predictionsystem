const express = require('express');
const db = require('../config/database');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Test endpoint - to check if auth routes are working
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Auth routes are working!',
        timestamp: new Date().toISOString()
    });
});

// Login endpoint
router.post('/login', async (req, res) => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Request body:', req.body);
    
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
        console.log('Missing identifier or password');
        return res.status(400).json({ 
            success: false, 
            message: 'Email et mot de passe requis' 
        });
    }
    
    try {
        // Query user by email OR phone
        const result = await db.query(
            `SELECT user_id, full_name, email, phone_number, password_hash, 
                    role, department_id, is_active
             FROM users 
             WHERE email = $1 OR phone_number = $1`,
            [identifier]
        );
        
        console.log('Query result rows:', result.rows.length);
        
        if (result.rows.length === 0) {
            console.log('User not found:', identifier);
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou mot de passe incorrect' 
            });
        }
        
        const user = result.rows[0];
        console.log('User found:', user.email);
        console.log('Stored password:', user.password_hash);
        console.log('Provided password:', password);
        
        // Check password (plain text comparison)
        if (user.password_hash !== password) {
            console.log('Password mismatch');
            return res.status(401).json({ 
                success: false, 
                message: 'Email ou mot de passe incorrect' 
            });
        }
        
        if (!user.is_active) {
            console.log('Account inactive');
            return res.status(401).json({ 
                success: false, 
                message: 'Compte désactivé. Contactez l\'administrateur.' 
            });
        }
        
        console.log('Login successful!');
        
        // ✅ ADD THIS: Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.user_id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        console.log('Token generated successfully');
        
        // Remove password from response
        const { password_hash, ...userWithoutPassword } = user;
        
        // ✅ ADD THIS: Return the token to the client
        res.json({
            success: true,
            message: 'Login successful',
            token: token,  // <-- THIS IS CRITICAL
            user: userWithoutPassword
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur serveur: ' + error.message 
        });
    }
});

module.exports = router;