import Sequelize from 'sequelize'

export default class FlooringInventories extends Sequelize.Model {
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
                floorId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true
                }
            },
            {sequelize, timestamps: false, tableName: 'flooring_inventories'}
        )
    }
}
