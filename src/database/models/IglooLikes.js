import Sequelize from 'sequelize'

export default class IglooLikes extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    references: {
                        model: 'users',
                        key: 'id',
                    },
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
                    references: {
                        model: 'users',
                        key: 'id',
                    },
                },
            },
            {sequelize, timestamps: false, tableName: 'igloo_likes'}
        )
    }
}
