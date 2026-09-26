const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('BuaAnTrongLich', {
  idBuaAnTrongLich: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idLichAn: { type: DataTypes.INTEGER, allowNull: false },
  idMonAn: { type: DataTypes.INTEGER, allowNull: false },
  ngay: { type: DataTypes.DATEONLY, allowNull: false },
  loaiBua: { type: DataTypes.STRING(20), allowNull: false },
  soKhauPhan: { type: DataTypes.DECIMAL(6, 2), allowNull: false, defaultValue: 1 },
  thuTu: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  ghiChu: { type: DataTypes.STRING(500), allowNull: true },
}, { tableName: 'BuaAnTrongLich', timestamps: false, indexes: [{ fields: ['idLichAn', 'ngay', 'loaiBua'] }] });
