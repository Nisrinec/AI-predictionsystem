const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.get("/machine/:machineName", async (req, res) => {
    try {
        const { machineName } = req.params;

        const result = await db.query(`
            SELECT *
            FROM manual_diagnostics
            WHERE machine_name = $1
            ORDER BY created_at DESC
        `, [machineName]);

        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;