import Sequelize from 'sequelize'

export default class PendingBuddies extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                sender: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                recipient: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'pending_buddies'}
        )
    }
}
