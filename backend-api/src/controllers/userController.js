const db = require('../config/database');

class UserController {
    static async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT u.user_id, u.full_name, u.email, u.phone_number, 
                       u.role, u.department_id, u.is_active,
                       d.department_name
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.department_id
                ORDER BY u.user_id
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
                SELECT user_id, full_name, email, phone_number, role, department_id, is_active
                FROM users WHERE user_id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    static async create(req, res) {
        try {
            const { full_name, email, phone_number, password_hash, role, department_id } = req.body;
            
            const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already exists' });
            }
            
            const result = await db.query(`
                INSERT INTO users (full_name, email, phone_number, password_hash, role, department_id, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, true)
                RETURNING user_id, full_name, email, phone_number, role, department_id, is_active
            `, [full_name, email, phone_number, password_hash, role, department_id || null]);
            
            res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { full_name, email, phone_number, password_hash, role, department_id, is_active } = req.body;
            
            let updateFields = [];
            let values = [];
            let index = 1;
            
            if (full_name !== undefined) {
                updateFields.push(`full_name = $${index++}`);
                values.push(full_name);
            }
            if (email !== undefined) {
                updateFields.push(`email = $${index++}`);
                values.push(email);
            }
            if (phone_number !== undefined) {
                updateFields.push(`phone_number = $${index++}`);
                values.push(phone_number);
            }
            if (password_hash !== undefined && password_hash !== '') {
                updateFields.push(`password_hash = $${index++}`);
                values.push(password_hash);
            }
            if (role !== undefined) {
                updateFields.push(`role = $${index++}`);
                values.push(role);
            }
            if (department_id !== undefined) {
                updateFields.push(`department_id = $${index++}`);
                values.push(department_id);
            }
            if (is_active !== undefined) {
                updateFields.push(`is_active = $${index++}`);
                values.push(is_active);
            }
            
            // Remove updated_at line if column doesn't exist
            // updateFields.push(`updated_at = NOW()`);
            
            values.push(id);
            
            const query = `
                UPDATE users 
                SET ${updateFields.join(', ')}
                WHERE user_id = $${index}
                RETURNING user_id, full_name, email, phone_number, role, department_id, is_active
            `;
            
            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
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
            const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;