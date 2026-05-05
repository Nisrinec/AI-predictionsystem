const express = require('express');
const MachinePartController = require('../controllers/machinePartController');

const router = express.Router();

router.get('/', MachinePartController.getAll);
router.get('/machine/:machineId', MachinePartController.getByMachineId);
router.get('/:id', MachinePartController.getById);
router.post('/', MachinePartController.create);
router.put('/:id', MachinePartController.update);
router.delete('/:id', MachinePartController.delete);

module.exports = router;