const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Session = sequelize.define('Session', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    patientName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active' // 'active', 'completed'
    },
    isDemo: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: true
    },
    canvasSnapshot: {
        type: DataTypes.TEXT('long'), // Base64 image
        allowNull: true
    }
});

module.exports = Session;
