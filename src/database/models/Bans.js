import Sequelize from 'sequelize'

export default class Bans extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                issued: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                },
                expires: {
                    type: Sequelize.DATE,
                    allowNull: false,
                },
                moderatorId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                message: {
                    type: DataTypes.STRING(60),
                    allowNull: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'bans'}
        )
    }
}
