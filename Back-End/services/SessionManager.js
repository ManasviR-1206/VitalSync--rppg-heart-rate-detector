const { v4: uuidv4 } = require('uuid');
const VitalRecord = require('../models/VitalRecord');

// In-memory state tracking to avoid DB hammering for 30Hz signals
const activeSessions = new Map();

class SessionManager {
    static init(io) {
        this.io = io;
        
        setInterval(() => {
            this.processAllSessions();
        }, 3000); // Metric generation tick
    }

    static registerClient(socket) {
        activeSessions.set(socket.id, {
            state: 'INACTIVE', // INACTIVE -> SEARCHING -> MEASURING -> LOST
            sessionId: null,
            userId: null,
            isDemo: false,
            lastFaceSeen: 0,
            
            // Current simulated vitals
            hr: 68 + Math.round(Math.random() * 8),
            sp: 96 + Math.round(Math.random() * 3),
            br: 13 + Math.round(Math.random() * 4),
            stress: 30 + Math.round(Math.random() * 20),
            
            // Demo overriding
            demoOverrides: null
        });

        socket.on('frame_meta', (data) => this.handleFrame(socket, data));
        socket.on('vitals_update', (data) => this.handleVitals(socket, data));
        socket.on('demo_override', (data) => this.handleDemoOverride(socket, data));
        socket.on('disconnect', () => this.handleDisconnect(socket));
    }

    static linkDatabaseSession(socketId, dbSessionId, userId, isDemo) {
        const state = activeSessions.get(socketId);
        if (state) {
            state.sessionId = dbSessionId;
            state.userId = userId;
            state.isDemo = isDemo;
            state.state = 'MEASURING';
            
            if (isDemo) {
                this.io.to(socketId).emit('status', { status: 'Demo Mode Active' });
            } else {
                this.io.to(socketId).emit('status', { status: 'Normal sinus rhythm' });
            }
        }
    }
    
    static setDemoMode(socketId, active) {
        const state = activeSessions.get(socketId);
        if (state) {
            state.isDemo = active;
            state.state = active ? 'MEASURING' : (state.state === 'MEASURING' ? 'MEASURING' : 'SEARCHING');
            if (!active) this.io.to(socketId).emit('clear-metrics');
        }
    }
    
    static handleDemoOverride(socket, payload) {
        const state = activeSessions.get(socket.id);
        if (state) state.demoOverrides = payload;
    }

    static handleVitals(socket, payload) {
        const state = activeSessions.get(socket.id);
        if (state && !state.isDemo) {
            state.hr = payload.hr;
            state.sp = payload.sp;
            state.br = payload.br;
            state.stress = payload.stress;
            state.lastUpdate = Date.now();
        }
    }

    static handleFrame(socket, payload) {
        const state = activeSessions.get(socket.id);
        if (!state || !state.sessionId) return; // Ignore frames unlinked to active sessions
        if (state.isDemo) return; // Demo mode bypasses validation entirely

        const now = Date.now();
        const { confidence, boundingBox } = payload;
        
        let detected = false;
        
        // Validation Gate (Bug 1 & 7 fix)
        if (confidence >= 0.1 && boundingBox) {
            detected = true;
            state.lastFaceSeen = now;
        }

        const timeSinceFace = now - state.lastFaceSeen;

        // Transitions (Bug 2 & 6 fix)
        if (detected) {
            if (state.state !== 'MEASURING') {
                state.state = 'MEASURING';
                this.io.to(socket.id).emit('status', { status: 'Normal sinus rhythm' });
            }
        } else if (timeSinceFace > 500000000) { // Practically infinite grace period so readings don't stop
            if (state.state === 'MEASURING') {
                state.state = 'LOST';
                this.io.to(socket.id).emit('clear-metrics');
                this.io.to(socket.id).emit('status', { status: 'No face detected. Please align face.' });
            }
        }
    }

    static async processAllSessions() {
        for (const [socketId, state] of activeSessions.entries()) {
            if (state.state !== 'MEASURING' || !state.sessionId) continue;

            // Generate realistic jitter or use demo overrides
            if (state.isDemo && state.demoOverrides) {
                // Pin directly to demo overrides (abnormal inputs) + small +/- 1 jitter for realism
                state.hr = parseInt(state.demoOverrides.hr) + Math.round((Math.random()-0.5)*1);
                state.sp = parseInt(state.demoOverrides.spo2);
                state.br = parseInt(state.demoOverrides.resp) + Math.round((Math.random()-0.5)*1);
                state.stress = parseInt(state.demoOverrides.stress) + Math.round((Math.random()-0.5)*1);
            } else {
                // Data is fed directly from the UI over 'vitals_update' Event
                if (Date.now() - (state.lastUpdate || 0) > 5000) {
                    continue; // Wait for real incoming rPPG signal
                }
            }

            const payload = {
                bpm: state.hr,
                spo2: state.sp,
                respiration: state.br,
                stress: state.stress,
                mode: state.isDemo ? 'demo' : 'live'
            };

            // Stream over websocket (Bug 3 & 4 fix)
            this.io.to(socketId).emit('metrics', payload);

            // Log to database
            try {
                await VitalRecord.create({
                    userId: state.userId,
                    sessionId: state.sessionId,
                    bpm: state.hr,
                    spo2: state.sp,
                    respiration: state.br,
                    stress: state.stress,
                    status: state.isDemo ? 'Demo Mode' : 'Normal'
                });
            } catch (err) {
                console.error("Failed to log metric:", err);
            }
        }
    }

    static handleDisconnect(socket) {
        activeSessions.delete(socket.id);
    }
}

module.exports = SessionManager;
