const express = require('express');
const MachineController = require('../controllers/machineController');

const router = express.Router();

router.get('/', MachineController.getAll);
router.get('/:id', MachineController.getById);
router.post('/', MachineController.create);
router.put('/:id', MachineController.update);
router.delete('/:id', MachineController.delete);

module.exports = router;