import Sequelize from 'sequelize'

export default class GlobalChallenges extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                challenge_id: {
                    type: DataTypes.INTEGER(10),
                    allowNull: false,
                    defaultValue: 0
                },
                set: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
                },
                expires: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    defaultValue: null
                }
            },
            {sequelize, timestamps: false, tableName: 'global_challenges'}
        )
    }
}
