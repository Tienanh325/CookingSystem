const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define(
  'AuthChallenge',
  {
    id: { type: DataTypes.UUID, primaryKey: true },
    kind: { type: DataTypes.STRING(20), allowNull: false },
    subject: { type: DataTypes.STRING(191), allowNull: false },
    payload: { type: DataTypes.JSON, allowNull: false },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    consumed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'AuthChallenge',
    timestamps: false,
    indexes: [{ fields: ['kind', 'subject', 'createdAt'] }],
  },
);
