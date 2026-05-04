const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const Session = require('../models/Session');
const VitalRecord = require('../models/VitalRecord');

const JWT_SECRET = process.env.JWT_SECRET || 'clinical-secret-key-999';

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

router.get('/generate', extractUser, async (req, res) => {
    try {
        const { sessionId, format } = req.query;
        if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

        const session = await Session.findByPk(sessionId, {
            include: [{ model: VitalRecord }]
        });
        if (!session) return res.status(404).json({ error: 'Session not found' });
        
        // Compute Summary
        const r = session.VitalRecords || [];
        const bpmList = r.map(x => x.bpm);
        const spo2List = r.map(x => x.spo2);
        const stressList = r.map(x => x.stress || 50);
        
        const summary = {
            durationSeconds: Math.floor((new Date(session.endTime) - new Date(session.createdAt)) / 1000) || session.duration || 0,
            bpmAvg: bpmList.length ? Math.round(bpmList.reduce((a,b)=>a+b,0)/bpmList.length) : '--',
            spo2Avg: spo2List.length ? Math.round(spo2List.reduce((a,b)=>a+b,0)/spo2List.length) : '--',
            stressAvg: stressList.length ? Math.round(stressList.reduce((a,b)=>a+b,0)/stressList.length) : '--',
            count: r.length
        };

        if (format === 'json') {
            return res.json({ session, summary });
        }
        
        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        let filename = `Report_${session.id.slice(0,8)}.pdf`;
        res.setHeader('Content-disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-type', 'application/pdf');
        
        doc.pipe(res);
        
        // Branding
        doc.fontSize(25).font('Helvetica-Bold').fillColor('#00f2b8').text('VitalSync Clinical Report', { align: 'center' });
        doc.moveDown();
        
        // Patient Data
        doc.fontSize(12).fillColor('black').font('Helvetica');
        doc.text(`Patient Profile: ${session.patientName}`);
        doc.text(`Attending ID: ${session.userId}`);
        doc.text(`Session ID: ${session.id}`);
        doc.text(`Recorded Date: ${new Date(session.createdAt).toLocaleString()}`);
        doc.text(`Mode/Classification: ${session.isDemo ? 'Demo Mode' : 'Live Extraction'}`);
        doc.moveDown(2);
        
        // Summary Table
        doc.fontSize(16).font('Helvetica-Bold').text('Biometric Summary');
        doc.fontSize(12).font('Helvetica');
        doc.text(`Session Duration: ${summary.durationSeconds} seconds`);
        doc.text(`Average Heart Rate: ${summary.bpmAvg} BPM`);
        doc.text(`Average SpO2: ${summary.spo2Avg} %`);
        doc.text(`Average Stress Level: ${summary.stressAvg} / 100`);
        doc.text(`Valid Data Points Logged: ${summary.count}`);
        doc.moveDown(2);

        if (session.canvasSnapshot) {
            try {
                // Determine format
                const base64Data = session.canvasSnapshot.replace(/^data:image\/(png|jpeg);base64,/, "");
                const imgBuffer = Buffer.from(base64Data, 'base64');
                doc.fontSize(16).font('Helvetica-Bold').text('System Snapshot');
                doc.image(imgBuffer, { fit: [500, 300], align: 'center' });
            } catch (imgE) {
                console.error("Failed to append snapshot image", imgE);
            }
        }
        
        doc.moveDown(2);
        doc.fontSize(10).fillColor('gray').text('This report is automatically synthesized via VitalSync rPPG analysis. Not for diagnostic use.', { align: 'center' });
        
        doc.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error generating report" });
    }
});

module.exports = router;
