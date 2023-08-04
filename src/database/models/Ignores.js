import Sequelize from 'sequelize'

export default class Ignores extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                ignoreId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                }
            },
            {sequelize, timestamps: false, tableName: 'ignores'}
        )
    }
}
