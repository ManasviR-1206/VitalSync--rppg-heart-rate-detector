const sequelize = require('./db');
const User = require('./models/User');
const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, 'data', 'users.json');

async function migrate() {
    try {
        await sequelize.sync({ force: true });
        console.log('Database synced.');

        if (fs.existsSync(usersFilePath)) {
            const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
            for (const userData of users) {
                await User.create({
                    username: userData.username,
                    password: userData.password
                });
                console.log(`Migrated user: ${userData.username}`);
            }
        }
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
