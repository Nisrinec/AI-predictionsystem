const db = require('../config/database');

class UserController {
    // Get all users
    static async getAll(req, res) {
        try {
            const result = await db.query(`
                SELECT u.user_id, u.full_name, u.email, u.phone_number, 
                       u.role, u.department_id, u.is_active, u.created_at,
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

    // Get user by ID
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

    // Create new user
    static async create(req, res) {
        try {
            const { full_name, email, phone_number, password_hash, role, department_id } = req.body;
            
            // Check if email exists
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

    // Update user
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
            
            values.push(id);
            
            const query = `
                UPDATE users 
                SET ${updateFields.join(', ')}, updated_at = NOW()
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

    // Delete user
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

    // ========== PROFILE METHODS (for current logged-in user) ==========

    // Get current user's own profile
    static async getMyProfile(req, res) {
        try {
            const userId = req.user.userId;
            
            const result = await db.query(
                `SELECT user_id, full_name, email, phone_number, role, department_id, is_active, created_at
                 FROM users WHERE user_id = $1`,
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json(result.rows[0]);
        } catch (error) {
            console.error('Error getting profile:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Update current user's own profile
    static async updateMyProfile(req, res) {
        try {
            const userId = req.user.userId;
            const { full_name, email, phone_number } = req.body;
            
            const result = await db.query(
                `UPDATE users 
                 SET full_name = COALESCE($1, full_name),
                     email = COALESCE($2, email),
                     phone_number = COALESCE($3, phone_number),
                     updated_at = NOW()
                 WHERE user_id = $4
                 RETURNING user_id, full_name, email, phone_number, role`,
                [full_name, email, phone_number, userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            res.json({ success: true, user: result.rows[0] });
        } catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // Update current user's own password
    static async updateMyPassword(req, res) {
        try {
            const userId = req.user.userId;
            const { current_password, new_password } = req.body;
            
            // Get current user's password
            const result = await db.query(
                `SELECT password_hash FROM users WHERE user_id = $1`,
                [userId]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }
            
            const user = result.rows[0];
            
            // Verify current password
            if (user.password_hash !== current_password) {
                return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
            }
            
            // Update password
            await db.query(
                `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2`,
                [new_password, userId]
            );
            
            res.json({ success: true, message: 'Password updated successfully' });
        } catch (error) {
            console.error('Error updating password:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = UserController;