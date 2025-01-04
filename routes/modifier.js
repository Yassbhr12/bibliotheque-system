import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/profile/modifier' , (req,res)=>{
    if(!req.session.user){
        return res.redirect('/login');
    }
    res.render('modifier' , {user : req.session.user});
});



router.post('/profile/update', (req, res) => {
    const { nom, prenom , email , password } = req.body;
    const userId = req.session.user.id;
    console.log(req.body);

    let sql = 'UPDATE users SET nom = ?, prenom = ?, email = ? WHERE id = ?';
    let params = [nom, prenom, email, userId];
    

    if (password) {
        sql = 'UPDATE users SET nom = ?, prenom = ?, email = ?, mot_de_passe = ? WHERE id = ?';
        params = [nom, prenom, email, password, userId];
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        req.session.user.nom = nom;
        req.session.user.prenom = prenom;
        req.session.user.email = email;
        res.redirect('/profile');
    });
});

export default router;