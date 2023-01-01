import Sequelize from 'sequelize'

export default class UsedCodes extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                codeId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
            },
            {sequelize, timestamps: false, tableName: 'used_codes'}
        )
    }
}
