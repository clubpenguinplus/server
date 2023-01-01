import Sequelize from 'sequelize'

export default class Codes extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                code: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                },
                coins: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
                Active: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
            },
            {sequelize, timestamps: false, tableName: 'codes'}
        )
    }
}
