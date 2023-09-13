import Sequelize from 'sequelize'

export default class SoundStudioTracks extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                trackId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true
                },
                userId: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                },
                name: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                mode: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                },
                sounds: {
                    type: DataTypes.TEXT,
                    allowNull: false
                },
                length: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false
                }
            },
            {sequelize, timestamps: false, tableName: 'soundstudio_tracks'}
        )
    }
}
