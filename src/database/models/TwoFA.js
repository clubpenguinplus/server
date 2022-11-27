import Sequelize from 'sequelize'

export default class TwoFA extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
                ip: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                },
                isAllowed: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                code: {
                    type: DataTypes.STRING(255),
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'twofa'}
        )
    }
}
