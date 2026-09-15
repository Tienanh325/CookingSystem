const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChiTietLichSuNau = sequelize.define(
    "ChiTietLichSuNau",
    {
        idChiTiet: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        idLichSu: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        idBuocNau: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        daHoanThanh: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0
        },

        thoiGianHoanThanh: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: "ChiTietLichSuNau",
        timestamps: false
    }
);

module.exports = ChiTietLichSuNau;