const colors = require("colors");

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.sqlite', sqlite3.OPEN_READWRITE |

    sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connecté à la base de données SQLite.'.green);
        db.run(`
            CREATE TABLE IF NOT EXISTS objectives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                fromValue INT,
                toValue INT,
                achieved INT
                )`, (err) => {
            if (err) {
                console.error(err.message);
            }
        });
    }
});

module.exports = db;