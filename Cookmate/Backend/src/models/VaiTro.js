const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const VaiTro = sequelize.define(
    "VaiTro",
    {
        idVaiTro: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        tenVaiTro: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },

        moTa: {
            type: DataTypes.STRING(255),
            allowNull: true
        },

        trangThai: {
            type: DataTypes.TINYINT,
            allowNull: false,
            defaultValue: 1
        },

        ngayTao: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    },
    {
        tableName: "VaiTro",
        timestamps: false
    }
);

module.exports = VaiTro;