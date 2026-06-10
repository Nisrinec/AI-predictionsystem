const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const emailRoutes = require('./routes/emailRoutes');

const userRoutes = require('./routes/userRoutes');
const machineRoutes = require('./routes/machineRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const authRoutes = require('./routes/authRoutes'); 
const machinePartRoutes = require('./routes/machinePartRoutes'); // THIS LINE MUST EXIST
const diagnosticRoutes = require("./routes/diagnosticRoutes");
const predictionRoutes = require('./routes/predictionRoutes');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../../frontend')));
// Routes - ORDER MATTERS
app.use('/api/auth', authRoutes);     // THIS LINE MUST EXIST
app.use('/api/users', userRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/machine-parts', machinePartRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        endpoints: {
            auth_test: '/api/auth/test',
            auth_login: '/api/auth/login',
            users: '/api/users',
            machines: '/api/machines',
            departments: '/api/departments',
            predictions: '/api/predictions'
        }
    });
});

app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.static(path.join(__dirname, '../../')));
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found: ' + req.method + ' ' + req.url });
});
// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});
app.use('/api/email', emailRoutes);

module.exports = app;