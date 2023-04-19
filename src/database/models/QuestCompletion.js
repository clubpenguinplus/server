import Sequelize from 'sequelize'

export default class QuestCompletion extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                user: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                id: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    primaryKey: true,
                },
                completion: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                info: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
            },
            {
                sequelize,
                timestamps: false,
                tableName: 'quest_completion',
            }
        )
    }
}
