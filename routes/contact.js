import express from 'express';
import db from '../config/db.js';

const router =express.Router();

router.get('/contact' , (req,res)=>{ 
    const user = req.session.user || null;
    res.render('contact' , {user});
});

router.post('/contact' , (req,res)=>{
    const { name, lastname, email, phone, commentaire} = req.body;
    console.log(req.body);

    const sql = 'INSERT INTO messages_contact (nom, prenom, email, telephone, commentaire) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [name, lastname, email, phone,commentaire], (err, result) => {
        if (err) {
            console.error('Erreur lors de l\'envoi du message : ', err);
            return res.status(500).send('Erreur serveur. Veuillez réessayer.');
        }
        res.redirect('/contact?success=1');
    });
});

export default router;