import Sequelize from 'sequelize'

export default class PendingBuddies extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                sender: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
                recipient: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
            },
            {sequelize, timestamps: false, tableName: 'pending_buddies'}
        )
    }
}
