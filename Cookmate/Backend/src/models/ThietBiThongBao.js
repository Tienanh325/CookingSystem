const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

module.exports = sequelize.define(
  'ThietBiThongBao',
  {
    idThietBiThongBao: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
    token: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    nenTang: { type: DataTypes.STRING(20), allowNull: false },
    maThietBi: { type: DataTypes.STRING(191), allowNull: true },
    hoatDong: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    ngayTao: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    ngayCapNhat: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'ThietBiThongBao',
    timestamps: false,
    indexes: [
      { fields: ['idNguoiDung', 'hoatDong'] },
      { unique: true, fields: ['token'], name: 'uq_push_token' },
    ],
  },
);
