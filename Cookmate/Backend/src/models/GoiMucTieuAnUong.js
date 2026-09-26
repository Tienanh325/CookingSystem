const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GoiMucTieuAnUong = sequelize.define(
  'GoiMucTieuAnUong',
  {
    idGoiDichVu: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    idMucTieuAnUong: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  },
  { tableName: 'GoiMucTieuAnUong', timestamps: false },
);

module.exports = GoiMucTieuAnUong;
