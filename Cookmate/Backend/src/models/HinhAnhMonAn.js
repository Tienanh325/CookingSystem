const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const HinhAnhMonAn = sequelize.define(
    "HinhAnhMonAn",
    {
        idHinhAnh: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        idMonAn: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        duongDan: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        moTa: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        thuTu: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },

        anhDaiDien: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 0
        },

        ngayTao: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "HinhAnhMonAn",
        timestamps: false
    }
);

module.exports = HinhAnhMonAn;