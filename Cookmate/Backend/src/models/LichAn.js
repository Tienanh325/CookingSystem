const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('LichAn', {
  idLichAn: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
  tenLich: { type: DataTypes.STRING(150), allowNull: false },
  tuNgay: { type: DataTypes.DATEONLY, allowNull: false },
  denNgay: { type: DataTypes.DATEONLY, allowNull: false },
  mucTieuKcalMoiNgay: { type: DataTypes.INTEGER, allowNull: true },
  trangThai: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  ngayTao: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  ngayCapNhat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { tableName: 'LichAn', timestamps: false, indexes: [{ fields: ['idNguoiDung', 'tuNgay', 'denNgay'] }] });
