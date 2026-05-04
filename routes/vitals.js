const express = require('express');
const router = express.Router();
const VitalRecord = require('../models/VitalRecord');
const auth = require('../middleware/auth');

// POST /api/vitals - Save biometric data
router.post('/', auth, async (req, res) => {
    try {
        const { bpm, spo2, respiration, status } = req.body;
        const newRecord = await VitalRecord.create({
            userId: req.user.id,
            bpm,
            spo2,
            respiration,
            status: status || 'Normal'
        });
        res.status(201).json({ message: 'Vitals logged successfully', data: newRecord });
    } catch (err) {
        console.error('Error logging vitals:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/vitals/history - Get historical vitals for user
router.get('/history', auth, async (req, res) => {
    try {
        const history = await VitalRecord.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50 // Last 50 readings
        });
        res.json(history.reverse());
    } catch (err) {
        console.error('Error fetching vitals history:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
