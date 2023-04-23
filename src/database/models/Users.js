import Sequelize from 'sequelize'

export default class Users extends Sequelize.Model {
    static init(sequelize, DataTypes) {
        return super.init(
            {
                id: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    primaryKey: true,
                    autoIncrement: true,
                },
                username: {
                    type: DataTypes.STRING(12),
                    allowNull: false,
                },
                email: {
                    type: DataTypes.STRING(255),
                },
                password: {
                    type: DataTypes.STRING(60),
                    allowNull: false,
                },
                loginKey: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                rank: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 1,
                },
                has2FA: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                stealthMode: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 0,
                },
                permaBan: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                },
                joinTime: {
                    type: Sequelize.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                },
                coins: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 500,
                },
                head: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                face: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                neck: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                body: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                hand: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                feet: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                color: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 1,
                },
                photo: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                flag: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                username_approved: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 0,
                },
                username_rejected: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 0,
                },
                ip: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                },
                activationKey: {
                    type: DataTypes.STRING(1000),
                    allowNull: false,
                    defaultValue: '',
                },
                emailActivated: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 0,
                },
                over13: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: 1,
                },
                stampbookColor: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 1,
                },
                stampbookClasp: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 1,
                },
                stampbookPattern: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                customStamps: {
                    type: DataTypes.TEXT,
                    allowNull: false,
                    defaultValue: '',
                },
                cannon_data: {
                    type: DataTypes.STRING(1000),
                },
                walking: {
                    type: DataTypes.INTEGER(11),
                    allowNull: false,
                    defaultValue: 0,
                },
                last_login: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
                },
                current_igloo: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                epfStatus: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0,
                },
                filter: {
                    type: DataTypes.INTEGER(1),
                    allowNull: false,
                    defaultValue: 0,
                },
            },
            {sequelize, timestamps: false, tableName: 'users'}
        )
    }
}
