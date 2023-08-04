import Sequelize from 'sequelize'

export default class Buddies extends Sequelize.Model {
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
                buddyId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                isBff: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0
                }
            },
            {sequelize, timestamps: false, tableName: 'buddies'}
        )
    }
}
