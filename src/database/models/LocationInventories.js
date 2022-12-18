import Sequelize from 'sequelize'

export default class LocationInventories extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                locationId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'location_inventories'}
        )
    }
}
