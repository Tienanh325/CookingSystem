const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MucTieuAnUong = sequelize.define(
  'MucTieuAnUong',
  {
    idMucTieuAnUong: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    maMucTieu: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    tenMucTieu: { type: DataTypes.STRING(100), allowNull: false },
    moTa: { type: DataTypes.TEXT, allowNull: true },
    giaMuaLe: { type: DataTypes.DECIMAL(12, 0), allowNull: false, defaultValue: 0 },
    trangThai: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  { tableName: 'MucTieuAnUong', timestamps: false },
);

module.exports = MucTieuAnUong;
