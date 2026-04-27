const express = require('express');
const DepartmentController = require('../controllers/departmentController');

const router = express.Router();

router.get('/', DepartmentController.getAll);
router.get('/:id', DepartmentController.getById);
router.post('/', DepartmentController.create);
router.put('/:id', DepartmentController.update);
router.delete('/:id', DepartmentController.delete);

module.exports = router;