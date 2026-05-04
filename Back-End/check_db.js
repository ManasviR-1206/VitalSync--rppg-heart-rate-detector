const VitalRecord = require('./models/VitalRecord');
const User = require('./models/User');

async function check() {
    try {
        const users = await User.findAll();
        console.log(`Total users: ${users.length}`);
        
        const records = await VitalRecord.findAll();
        console.log(`Total vitals records: ${records.length}`);
        
        if (records.length > 0) {
            console.log('Latest record:', records[records.length - 1].toJSON());
        }
        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err);
        process.exit(1);
    }
}

check();
