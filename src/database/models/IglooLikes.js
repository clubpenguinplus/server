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
                likedById: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                },
            },
            {sequelize, timestamps: false, tableName: 'igloo_likes'}
        )
    }
}
