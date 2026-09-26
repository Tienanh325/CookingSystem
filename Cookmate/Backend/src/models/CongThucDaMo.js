const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CongThucDaMo = sequelize.define(
  'CongThucDaMo',
  {
    idCongThucDaMo: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    idNguoiDung: { type: DataTypes.INTEGER, allowNull: false },
    idMonAn: { type: DataTypes.INTEGER, allowNull: false },
    ngayMoDauTien: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: 'CongThucDaMo',
    timestamps: false,
    indexes: [
      { unique: true, fields: ['idNguoiDung', 'idMonAn'] },
      { fields: ['idNguoiDung', 'ngayMoDauTien'] },
    ],
  },
);

module.exports = CongThucDaMo;
