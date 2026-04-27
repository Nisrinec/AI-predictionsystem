const db = require('../config/database');

class MachineController {
    static async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT m.machine_id, m.machine_name, m.machine_code, m.machine_type,
                       m.status, m.department_id, m.installation_date,
                       d.department_name
                FROM machines m
                LEFT JOIN departments d ON m.department_id = d.department_id
                ORDER BY m.machine_id
            `);
            res.json(result.rows);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query(`
                SELECT machine_id, machine_name, machine_code, machine_type, status, department_id, installation_date
                FROM machines WHERE machine_id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const { machine_name, machine_code, machine_type, status, department_id, installation_date } = req.body;
            
            const existing = await db.query('SELECT machine_id FROM machines WHERE machine_code = $1', [machine_code]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Machine code already exists' });
            }
            
            const result = await db.query(`
                INSERT INTO machines (machine_name, machine_code, machine_type, status, department_id, installation_date)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING machine_id, machine_name, machine_code, machine_type, status, department_id, installation_date
            `, [machine_name, machine_code, machine_type, status || 'Active', department_id || null, installation_date || null]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { machine_name, machine_code, machine_type, status, department_id, installation_date } = req.body;
            
            let updateFields = [];
            let values = [];
            let index = 1;
            
            if (machine_name !== undefined) {
                updateFields.push(`machine_name = $${index++}`);
                values.push(machine_name);
            }
            if (machine_code !== undefined) {
                updateFields.push(`machine_code = $${index++}`);
                values.push(machine_code);
            }
            if (machine_type !== undefined) {
                updateFields.push(`machine_type = $${index++}`);
                values.push(machine_type);
            }
            if (status !== undefined) {
                updateFields.push(`status = $${index++}`);
                values.push(status);
            }
            if (department_id !== undefined) {
                updateFields.push(`department_id = $${index++}`);
                values.push(department_id);
            }
            if (installation_date !== undefined) {
                updateFields.push(`installation_date = $${index++}`);
                values.push(installation_date);
            }
            
            // Remove updated_at if column doesn't exist
            // updateFields.push(`updated_at = NOW()`);
            
            values.push(id);
            
            const query = `
                UPDATE machines 
                SET ${updateFields.join(', ')}
                WHERE machine_id = $${index}
                RETURNING machine_id, machine_name, machine_code, machine_type, status, department_id, installation_date
            `;
            
            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine not found' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const result = await db.query('DELETE FROM machines WHERE machine_id = $1 RETURNING machine_id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Machine not found' });
            }
            
            res.json({ success: true, message: 'Machine deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = MachineController;