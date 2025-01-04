import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/login' , (req,res)=>{
    res.render('auth/login' , {error : null});
})

router.post('/login', (req,res)=>{
    const {email , password}=req.body;
    console.log('email : ',email);
    console.log('pass : ',password);
    if (!email || !password) {
        return res.render('auth/login', { error: 'Email et mot de passe sont requis.' });
    }
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql , [email] , async(err , results)=>{
        if (err) throw err;
        if(results.length===0){
            console.log('email');
            return res.render('auth/login',{error : 'Email ou mot de passe incorrect'} );
        }
        const user  = results[0];
        console.log('Mot de passe stocké dans la base de données:', user.mot_de_passe); 
        if (!user.mot_de_passe) {
            console.log('Problème avec les informations utilisateur');
            return res.render('auth/login', { error: 'Problème avec les informations utilisateur' });
          }
        const match = password===user.mot_de_passe;
        if(!match){
            console.log('pass');
           return res.render('auth/login',{error : 'Email ou mot de passe incorrect'});
        }
        console.log('match');
        req.session.user={
            id : user.id,
            nom : user.nom,
            prenom : user.prenom,
            email : user.email,
            categorie : user.categorie,
            exemplaires_max : user.exemplaires_max,
            duree_max : user.duree_max 
        };
        res.redirect('/documents');
    });
});




router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/auth/login');
    });
});




router.get('/signup' , (req,res)=>{
    res.render('auth/signup' , {error : null});
})

router.post('/signup' ,async (req,res)=>{
    const { name, lastname, email, password, categorie } = req.body;
    console.log(req.body);
    console.log('email : ',email);
    console.log('pass : ',password);
    if (!name || !email || !password || !categorie) {
        return res.render('auth/signup', { error: 'Veuillez remplir tous les champs obligatoires.' });
    }
    let exemplaires_max =1;
    let duree_max = 15;

    if(categorie==='abonne'){
        exemplaires_max = 4; 
        duree_max = 30;
    }
    else if(categorie==='privilegie'){
        exemplaires_max= 8;
        duree_max = 30;
    }
    try {

        const sql = `
            INSERT INTO users (nom, prenom, email, mot_de_passe, categorie, exemplaires_max, duree_max) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
            sql,
            [name, lastname, email, password, categorie, exemplaires_max, duree_max],
            (err, results) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('auth/signup', { error: 'Cet email est déjà utilisé.' });
                    }
                    throw err;
                }
                console.log('Utilisateur inscrit avec succès.');
                res.redirect('/auth/login');
            }
        );
    } catch (err) {
        console.error('Erreur lors de l inscription:', err);
        res.render('auth/signup', { error: 'Une erreur est survenue. Veuillez réessayer.' });
    }
});

export default router;