const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define('YeuCauThanhToan', {
  idYeuCauThanhToan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
  loaiSanPham: { type: DataTypes.STRING(20), allowNull: false },
  idGoiDichVu: { type: DataTypes.INTEGER, allowNull: true },
  idMucTieuAnUong: { type: DataTypes.INTEGER, allowNull: true },
  soTien: { type: DataTypes.DECIMAL(12, 0), allowNull: false },
  nhaCungCap: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'THU_CONG' },
  maThamChieu: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  trangThai: { type: DataTypes.STRING(25), allowNull: false, defaultValue: 'CHO_XAC_NHAN' },
  ngayTao: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  ngayXacNhan: { type: DataTypes.DATE, allowNull: true },
  idNguoiXacNhan: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'YeuCauThanhToan', timestamps: false, indexes: [{ fields: ['idNguoiDung', 'trangThai'] }] });
