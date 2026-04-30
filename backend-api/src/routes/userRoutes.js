const express = require('express');
const UserController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes (no auth needed)
router.get('/', UserController.getAll);
router.get('/:id', UserController.getById);
router.post('/', UserController.create);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);

// Protected profile routes (require authentication)
router.get('/profile/me', authMiddleware, UserController.getMyProfile);
router.put('/profile/me', authMiddleware, UserController.updateMyProfile);
router.put('/profile/me/password', authMiddleware, UserController.updateMyPassword);

module.exports = router;