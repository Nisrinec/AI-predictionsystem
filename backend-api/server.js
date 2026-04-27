const app = require('./src/app');
const { pool } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Test database connection before starting server
pool.connect((err, client, release) => {
    if (err) {
        console.error('Failed to connect to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to PostgreSQL database');
    release();
    
    // Start server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📋 Users API: http://localhost:${PORT}/api/users`);
        console.log(`🔧 Machines API: http://localhost:${PORT}/api/machines`);
        console.log(`🏢 Departments API: http://localhost:${PORT}/api/departments`);
    });
});