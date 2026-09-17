const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MonAnNguyenLieu = sequelize.define(
  'MonAnNguyenLieu',
  {
    idMonAn: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },

    idNguyenLieu: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },

    soLuong: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },

    donVi: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },

    ghiChu: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'MonAnNguyenLieu',
    timestamps: false,
  },
);

module.exports = MonAnNguyenLieu;
