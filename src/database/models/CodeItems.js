import Sequelize from 'sequelize'

export default class CodeItems extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                codeId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                itemId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
            },
            {sequelize, timestamps: false, tableName: 'code_items'}
        )
    }
}
