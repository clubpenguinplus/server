import Sequelize from 'sequelize'

export default class Challenges extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                user_id: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    defaultValue: 0
                },
                challenge_id: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    defaultValue: 0
                },
                completion: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    defaultValue: 0
                },
                complete: {
                    type: DataTypes.TINYINT(1),
                    allowNull: false,
                    defaultValue: 0
                },
                set: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                global_id: {
                    type: DataTypes.INTEGER(10),
                    defaultValue: null
                }
            },
            {sequelize, timestamps: false, tableName: 'challenges'}
        )
    }
}
