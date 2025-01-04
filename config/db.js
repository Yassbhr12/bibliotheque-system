import mysql from 'mysql2';

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '365Pass',
    database: 'sigb'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connecté à la base MySQL');
});


export default db;
