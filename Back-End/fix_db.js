const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/vitalsync.sqlite');

db.serialize(() => {
  db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(rows);
    
    // Attempt to drop the backup table if it exists
    db.run("DROP TABLE IF EXISTS Sessions_backup;", (err) => {
      if (err) {
        console.error("Error dropping Sessions_backup:", err);
      } else {
        console.log("Sessions_backup dropped successfully (if it existed).");
      }
    });
  });
});
