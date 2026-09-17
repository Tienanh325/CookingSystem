const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DanhGia = sequelize.define(
  'DanhGia',
  {
    idDanhGia: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    idNguoiDung: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    idMonAn: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    soSao: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    noiDung: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    trangThai: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },

    ngayDanhGia: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    ngayCapNhat: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'DanhGia',
    indexes: [{ unique: true, fields: ['idNguoiDung', 'idMonAn'], name: 'uq_user_recipe_review' }],
    timestamps: false,
  },
);

module.exports = DanhGia;
