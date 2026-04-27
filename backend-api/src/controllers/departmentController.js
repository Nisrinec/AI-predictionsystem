const db = require('../config/database');

class DepartmentController {
    static async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT d.department_id, d.department_name, d.department_code, d.description,
                       COUNT(m.machine_id) as machine_count
                FROM departments d
                LEFT JOIN machines m ON d.department_id = m.department_id
                GROUP BY d.department_id
                ORDER BY d.department_id
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
                SELECT department_id, department_name, department_code, description
                FROM departments WHERE department_id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Department not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const { department_name, department_code, description } = req.body;
            
            const existing = await db.query('SELECT department_id FROM departments WHERE department_code = $1', [department_code]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Department code already exists' });
            }
            
            const result = await db.query(`
                INSERT INTO departments (department_name, department_code, description)
                VALUES ($1, $2, $3)
                RETURNING department_id, department_name, department_code, description
            `, [department_name, department_code, description]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { department_name, department_code, description } = req.body;
            
            let updateFields = [];
            let values = [];
            let index = 1;
            
            if (department_name !== undefined) {
                updateFields.push(`department_name = $${index++}`);
                values.push(department_name);
            }
            if (department_code !== undefined) {
                updateFields.push(`department_code = $${index++}`);
                values.push(department_code);
            }
            if (description !== undefined) {
                updateFields.push(`description = $${index++}`);
                values.push(description);
            }
            
            // Remove updated_at if column doesn't exist
            // updateFields.push(`updated_at = NOW()`);
            
            values.push(id);
            
            const query = `
                UPDATE departments 
                SET ${updateFields.join(', ')}
                WHERE department_id = $${index}
                RETURNING department_id, department_name, department_code, description
            `;
            
            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Department not found' });
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
            
            const machines = await db.query('SELECT COUNT(*) FROM machines WHERE department_id = $1', [id]);
            if (parseInt(machines.rows[0].count) > 0) {
                return res.status(400).json({ error: 'Cannot delete department with associated machines' });
            }
            
            const users = await db.query('SELECT COUNT(*) FROM users WHERE department_id = $1', [id]);
            if (parseInt(users.rows[0].count) > 0) {
                return res.status(400).json({ error: 'Cannot delete department with associated users' });
            }
            
            const result = await db.query('DELETE FROM departments WHERE department_id = $1 RETURNING department_id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Department not found' });
            }
            
            res.json({ success: true, message: 'Department deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = DepartmentController;