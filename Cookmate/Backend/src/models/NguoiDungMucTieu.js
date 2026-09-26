const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NguoiDungMucTieu = sequelize.define(
  'NguoiDungMucTieu',
  {
    idNguoiDungMucTieu: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
    idMucTieuAnUong: { type: DataTypes.INTEGER, allowNull: false },
    nguonQuyen: { type: DataTypes.STRING(20), allowNull: false },
    thoiGianBatDau: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    thoiGianKetThuc: { type: DataTypes.DATE, allowNull: true },
    trangThai: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  {
    tableName: 'NguoiDungMucTieu',
    timestamps: false,
    indexes: [
      {
        name: 'uq_user_goal_source',
        unique: true,
        fields: ['idNguoiDung', 'idMucTieuAnUong', 'nguonQuyen'],
      },
      { name: 'ix_user_goal_active', fields: ['idNguoiDung', 'trangThai', 'thoiGianKetThuc'] },
    ],
  },
);

module.exports = NguoiDungMucTieu;
