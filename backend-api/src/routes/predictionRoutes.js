const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.get('/machine/:machineName', async (req, res) => {
    try {
        const { machineName } = req.params;

        const tables = [
            'predictions_sap',
            'predictions_af',
            'predictions_cap',
            'predictions_engrais'
        ];

        let predictions = [];

        for (const table of tables) {
            try {
                const result = await pool.query(
                    `
                    SELECT *
                    FROM "${table}"
                    WHERE machine_name = $1
                    ORDER BY prediction_time DESC
                    `,
                    [machineName]
                );

                predictions = predictions.concat(result.rows);
            } catch (err) {
                console.warn(`Skipping ${table}:`, err.message);
            }
        }

        res.json(predictions);
    } catch (error) {
        console.error('Prediction route error:', error);
        res.status(500).json({ error: 'Failed to load predictions' });
    }
});

module.exports = router;