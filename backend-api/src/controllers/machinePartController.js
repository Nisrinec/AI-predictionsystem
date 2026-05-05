const db = require('../config/database'); 

const MachinePartController = {
    // Get all machine parts
    getAll: async (req, res) => {
        try {
            const result = await db.query(
                'SELECT * FROM machine_parts ORDER BY machine_id, part_name'
            );
            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Get parts by machine ID
    getByMachineId: async (req, res) => {
        const { machineId } = req.params;
        try {
            const result = await db.query(
                'SELECT * FROM machine_parts WHERE machine_id = $1 ORDER BY is_primary DESC, part_name',
                [machineId]
            );
            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Get single part by ID
    getById: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.query(
                'SELECT * FROM machine_parts WHERE id = $1',
                [id]
            );
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine part not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Create new machine part
    create: async (req, res) => {
        const { machine_id, part_name, point_column, is_primary } = req.body;
        
        if (!machine_id || !part_name) {
            return res.status(400).json({ error: 'machine_id and part_name are required' });
        }

        try {
            const result = await db.query(
                `INSERT INTO machine_parts (machine_id, part_name, point_column, is_primary) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING *`,
                [machine_id, part_name, point_column, is_primary || false]
            );
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Update machine part
    update: async (req, res) => {
        const { id } = req.params;
        const { part_name, point_column, is_primary } = req.body;

        try {
            const result = await db.query(
                `UPDATE machine_parts 
                 SET part_name = $1, point_column = $2, is_primary = $3, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $4 
                 RETURNING *`,
                [part_name, point_column, is_primary, id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine part not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    },

    // Delete machine part
    delete: async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.query(
                'DELETE FROM machine_parts WHERE id = $1 RETURNING id',
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine part not found' });
            }
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

module.exports = MachinePartController;