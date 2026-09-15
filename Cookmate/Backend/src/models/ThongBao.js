const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ThongBao = sequelize.define(
    "ThongBao",
    {
        idThongBao: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        tieuDe: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        noiDung: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        loai: {
            type: DataTypes.STRING(50),
            allowNull: true
        },

        duongDan: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        ngayTao: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "ThongBao",
        timestamps: false
    }
);

module.exports = ThongBao;