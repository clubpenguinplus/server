import Sequelize from 'sequelize'

export default class IglooLikes extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
                iglooId: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    primaryKey: true,
                },
                likerId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                },
            },
            {sequelize, timestamps: false, tableName: 'igloo_likes'}
        )
    }
}
