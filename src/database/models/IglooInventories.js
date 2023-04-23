import Sequelize from 'sequelize'

export default class IglooInventories extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                iglooId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'igloo_inventories'}
        )
    }
}
