const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const SessionManager = require('../services/SessionManager');
const JWT_SECRET = process.env.JWT_SECRET || 'clinical-secret-key-999';

// Middleware to protect routes
const extractUser = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid token' });
    }
};

router.post('/start', extractUser, async (req, res) => {
    try {
        const { socketId, isDemo, patientName } = req.body;
        if (!socketId) return res.status(400).json({ error: "socketId required" });

        const session = await Session.create({
            userId: req.user.id,
            patientName: patientName || req.user.username,
            isDemo: isDemo || false
        });

        SessionManager.linkDatabaseSession(socketId, session.id, req.user.id, session.isDemo);

        res.json({ sessionId: session.id, message: "Session started" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.post('/demo/start', extractUser, async (req, res) => {
    const { socketId } = req.body;
    SessionManager.setDemoMode(socketId, true);
    res.json({ message: "Demo mode activated" });
});

router.post('/demo/stop', extractUser, async (req, res) => {
    const { socketId } = req.body;
    SessionManager.setDemoMode(socketId, false);
    res.json({ message: "Demo mode deactivated" });
});

router.post('/end', extractUser, async (req, res) => {
    try {
        const { sessionId, canvasSnapshot } = req.body;
        if (!sessionId) return res.status(400).json({ error: "sessionId required" });

        const session = await Session.findByPk(sessionId);
        if (session) {
            session.status = 'completed';
            session.endTime = new Date();
            if (canvasSnapshot) session.canvasSnapshot = canvasSnapshot;
            await session.save();
        }

        res.json({ message: "Session ended" });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

router.get('/list', extractUser, async (req, res) => {
    try {
        const sessions = await Session.findAll({
            where: { userId: req.user.id, status: 'completed' },
            order: [['createdAt', 'DESC']]
        });
        res.json(sessions);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
