import Sequelize from 'sequelize'

export default class AuthTokens extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                key: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'beta_keys'}
        )
    }
}
