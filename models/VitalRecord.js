const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Session = require('./Session');

const VitalRecord = sequelize.define('VitalRecord', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sessionId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: Session,
            key: 'id'
        }
    },
    bpm: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    spo2: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    respiration: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    stress: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Normal'
    }
});

Session.hasMany(VitalRecord, { foreignKey: 'sessionId' });
VitalRecord.belongsTo(Session, { foreignKey: 'sessionId' });

module.exports = VitalRecord;
