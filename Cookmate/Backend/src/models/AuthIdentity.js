const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
module.exports = sequelize.define(
  'AuthIdentity',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    provider: { type: DataTypes.STRING(20), allowNull: false },
    subject: { type: DataTypes.STRING(191), allowNull: false },
    idNguoiDung: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'NguoiDung', key: 'idNguoiDung' },
    },
  },
  {
    tableName: 'AuthIdentity',
    timestamps: false,
    indexes: [{ unique: true, fields: ['provider', 'subject'] }],
  },
);
