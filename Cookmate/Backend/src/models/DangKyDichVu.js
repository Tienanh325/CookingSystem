const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DangKyDichVu = sequelize.define(
  'DangKyDichVu',
  {
    idDangKyDichVu: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
    idGoiDichVu: { type: DataTypes.INTEGER, allowNull: false },
    thoiGianBatDau: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    thoiGianKetThuc: { type: DataTypes.DATE, allowNull: true },
    trangThai: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'HOAT_DONG' },
    nguon: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'HE_THONG' },
    tuDongGiaHan: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    ngayTao: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'DangKyDichVu',
    timestamps: false,
    indexes: [{ fields: ['idNguoiDung', 'trangThai', 'thoiGianKetThuc'] }],
  },
);

module.exports = DangKyDichVu;
