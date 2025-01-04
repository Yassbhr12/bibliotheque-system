import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/',(req,res)=>{
    const admin = req.session.admin;
    const sql = `SELECT 
        (SELECT COUNT(*) FROM users) AS utilisateurs,
        (SELECT COUNT(*) FROM documents) AS documents,
        (SELECT COUNT(*) FROM emprunts WHERE statut = 'en cours') AS emprunts_en_cours`;

    const sqlt = `SELECT e.id , u.nom AS Utilisateur , d.titre,ex.numero_ordre AS Exemplaire , ex.statut AS ex_statut , ex.etat AS ex_etat , e.date_debut , e.date_fin , e.statut
            FROM emprunts e
            JOIN users u on u.id = e.user_id
            JOIN exemplaires ex on ex.id = e.exemplaire_id
            JOIN documents d on d.id = ex.document_id
            order by e.id desc limit 4`;

    const sqlpop = `SELECT d.id AS document_id,d.titre, d.type , d.editeur,COUNT(e.id) AS nombre_emprunts
            FROM 
            documents d
            JOIN exemplaires ex ON d.id = ex.document_id
            JOIN emprunts e ON ex.id = e.exemplaire_id
            GROUP BY  d.id, d.titre
            ORDER BY nombre_emprunts DESC
            LIMIT 3`;

    db.query(sql , (err,result)=>{
        if(err){
            console.error(err);
            res.status(500).send('Erreur serveur');
        }
        db.query(sqlt , (err , resultT)=>{
            if(err){
                console.error(err);
                res.status(500).send('Erreur serveur');
            }
            db.query(sqlpop , (err, resultpop)=>{
                console.log(resultT);
                console.log(result);
                res.render('admin/Dashboard' , {admin , statistique : result , activites : resultT , populaires : resultpop});
            })
        });
    });
});

router.get('/settings', (req,res)=>{
    res.render('admin/parametre');
})

router.get('/login' , (req,res)=>{
    res.render('admin/login' , {error : null});
});

router.post('/login' , (req,res)=>{
    const {username , password}=req.body;
    console.log('username : ',username);
    console.log('pass : ',password);
    if (!username || !password) {
        return res.render('admin/login', { error: 'Nom d\'utilisateur et mot de passe sont requis.' });
    }
    const sql = `SELECT * FROM bibliothecaires WHERE nom = ?`;
    db.query(sql , [username] , (err , result)=>{
        if (err) throw err;
        if(result.length===0){
            console.log('username');
            return res.render('admin/login' , {error : 'Nom d\'utilisateur incorrect.'});
        }
        const admin = result[0];
        const match = password ===admin.mot_de_passe;
        if(!match){
            console.log('pass');
            return res.render('admin/login' , {error : 'Mot de passe incorrect.'});
        }
        console.log(admin);
        req.session.admin = {
            id : admin.id , 
            nom : admin.nom , 
            prenom : admin.prenom,
            email : admin.email ,
            role : admin.role
        }
        res.redirect('/admin');
    });

});

router.get('/login/oublie' , (req,res)=>{
    res.render('admin/passe')
});

router.post('/login/oublie', async (req, res) => {
    const { email,Password, newPassword , conPassword } = req.body;

    if (!email || !Password || !newPassword || !conPassword) {
        return res.render('admin/login/oublie', { error: 'email d\'utilisateur et mot de passe sont requis.' });
    }
    const sql = `UPDATE bibliothecaires SET mot_de_passe = ? WHERE email = ?`;
    const sql2 = `select * from bibliothecaires where email = ? and mot_de_passe = ?`;
    db.query(sql2 , [email , Password] , (err,result)=>{
        if (err) throw err;
        if(result.length===0){
            return res.render('admin/login/oublie' , {error : 'Email d\'utilisateur ou mot de passe incorrect.'});
        }
        if(newPassword!=conPassword){
            return res.render('admin/login/oublie' , {errormatch : 'Les deux mot de passe ne sont pas identiques.'});   
        }
        db.query(sql , [newPassword , email ] , (err,result)=>{
            if(err){
                console.error(err);
                res.status(500).send('Erreur serveur');
            }
            console.log(result);
            res.redirect('/admin/login');
        })
    })
});

router.get('/users',(req,res)=>{
    const sql = `SELECT 
            u.* ,
            count(*) as total_empruntes,
            SUM(CASE WHEN e.statut = 'retourne' THEN 1 ELSE 0 END) AS total_retournes,
            SUM(CASE WHEN e.statut = 'en cours' THEN 1 ELSE 0 END) AS total_en_cours
            FROM users u
            LEFT JOIN emprunts e ON u.id = e.user_id
            GROUP BY u.id, u.nom, u.prenom;`;
    db.query(sql , (err,result)=>{
        if(err){
            console.error(err);
            res.status(500).send('Erreur serveur');
        }
        console.log(result);
        res.render('admin/users', {users : result , admin : req.session.admin});
    });
})

router.get('/documents',(req,res)=>{
    const sql = `SELECT d.id,d.titre,d.annee_publication,d.editeur,d.reference,d.type,d.theme, 
    MAX(l.auteur) AS auteur,
    MAX(l.isbn) AS isbn,
    MAX(p.volume) AS volume,
    MAX(p.numero) AS numero,
    MAX(p.issn) AS issn,
    COUNT(CASE WHEN e.statut = 'en rayon' THEN 1 END) AS exemplaires_en_rayon
    FROM documents d
    LEFT JOIN livres l ON d.id = l.document_id
    LEFT JOIN periodiques p ON d.id = p.document_id
    LEFT JOIN exemplaires e ON d.id = e.document_id
    GROUP BY d.id
    ORDER BY d.titre ASC;
        `;
    const sqltheme=`SELECT DISTINCT theme FROM documents`;

    db.query(sql , (err,result)=>{
        if(err){
            console.error(err);
            res.status(500).send('Erreur serveur');
        }
        db.query(sqltheme , (err,restheme)=>{
            if(err){
                console.error(err);
                res.status(500).send('Erreur serveur');
            }
            res.render('admin/documents', {documents : result , themes : restheme , admin : req.session.admin });
        });
        
    });
});


router.get('/documents/details/:id', (req, res) => {
    const docID = req.params.id;
    const sqlDocument = `
        SELECT d.*, l.auteur, l.isbn, p.volume, p.numero, p.issn
        FROM documents d
        LEFT JOIN periodiques p ON d.id = p.document_id
        LEFT JOIN livres l ON d.id = l.document_id
        WHERE d.id = ?
    `;

    const sqlExemplaires = `
        SELECT e.id,e.numero_ordre, e.date_achat, e.etat, e.statut
        FROM exemplaires e
        WHERE e.document_id = ?
    `;

    db.query(sqlDocument, [docID], (err, docResults) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur du serveur');
        }
        if (docResults.length === 0) {
            return res.status(404).send('Document introuvable');
        }
        const document = docResults[0];

        db.query(sqlExemplaires, [docID], (err, exemplaireResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur du serveur');
            }

            res.render('admin/details', {
                document,
                exemplaires: exemplaireResults,
                admin : req.session.admin,
            });
        });
    });
});



router.post('/delete/:id', (req, res) => {
    const { id } = req.params;
    const sqlDelete = 'DELETE FROM documents WHERE id = ?';
    db.query(sqlDelete, [id], (err) => {
        if (err) {
            console.error('Erreur lors de la suppression : ', err);
            return res.redirect('/documents');
        }
        res.redirect('/admin/documents');
    });
});

router.get('/edit/:id', (req,res)=>{
    const docID = req.params.id;
    console.log("L'ID est  : ",docID);
    const sql = ` SELECT d.* , l.auteur , l.isbn , p.volume , p.numero , p.issn
        FROM documents d
        LEFT JOIN periodiques p on d.id = p.document_id
        LEFT JOIN livres l on d.id = l.document_id
        WHERE d.id = ?
    `;

    db.query(sql , [docID] , (err , results)=>{
        if(err){
            console.error(err);
            return res.status(500).send('Erreur du serveur');
        }
        if(results.length===0){
            return res.status(404).send('Document introuvable');
        }
        const doc = results[0];
        res.render('admin/edit' , {doc  , admin : req.session.admin});
    });
});

router.post('/documents/edit/:id', (req, res) => {
    const { theme, titre, annee, editeur, reference, type, auteur, isbn, volume, issn, numero } = req.body;
    const docID = req.params.id;

    const sqlDoc = `
        UPDATE documents 
        SET theme = ?, titre = ?, annee_publication = ?, editeur = ?, reference = ?, type = ?
        WHERE id = ?
    `;

    db.query(sqlDoc, [theme, titre, annee, editeur, reference, type, docID], (err) => {
        if (err) {
            console.error('Erreur mise à jour documents : ', err);
            return res.status(500).send('Erreur serveur lors de la mise à jour du document');
        }

        if (type === 'livre') {
            const sqlLivre = `
                UPDATE livres 
                SET auteur = ?, isbn = ? 
                WHERE document_id = ?
            `;
            db.query(sqlLivre, [auteur, isbn, docID], (err) => {
                if (err) {
                    console.error('Erreur mise à jour livre : ', err);
                    return res.status(500).send('Erreur serveur lors de la mise à jour du livre');
                }
                res.redirect(`/admin/documents/details/${docID}`);
            });
        } else if (type === 'periodique') {
            const sqlPeriodique = `
                UPDATE periodiques 
                SET volume = ?, issn = ?, numero = ? 
                WHERE document_id = ?
            `;
            db.query(sqlPeriodique, [volume, issn, numero, docID], (err) => {
                if (err) {
                    console.error('Erreur mise à jour periodique : ', err);
                    return res.status(500).send('Erreur serveur lors de la mise à jour du périodique');
                }
                res.redirect(`/admin/documents/details/${docID}`); 
            });
        } else {
            console.error('Type invalide');
            res.status(400).send('Type de document invalide');
        }
    });
});

router.get('/documents/Ajouter' , (req,res)=>{
    res.render('admin/add');
});

router.post('/documents/Ajouter', (req, res) => {

    const { theme, titre, annee, editeur, reference, type, auteur, isbn, volume, issn, numero } = req.body;

    console.log(req.body);


    const sqlDocument = `
        INSERT INTO documents (theme, titre, annee_publication, editeur, reference, type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sqlDocument, [theme, titre, annee, editeur, reference, type], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.render('admin/add', { error: 'Cette référence est déjà utilisée.' });
            }
            console.error('Erreur lors de l ajout dans documents : ', err);
            return res.render('admin/add', { error: 'Une erreur est survenue. Veuillez réessayer.' });
        }

        console.log('Document ajouté avec succès.');
        const documentId = result.insertId;

 
        if (type === 'livre') {
            console.log({ auteur, isbn });
            const sqlLivre = `
                INSERT INTO livres (document_id, auteur, isbn)
                VALUES (?, ?, ?)
            `;

            db.query(sqlLivre, [documentId, auteur, isbn], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('documents/add', { error: 'Ce ISBN est déjà utilisé.' });
                    }
                    console.error('Erreur lors de l ajout du livre : ', err);
                    return res.render('documents/add', { error: 'Une erreur est survenue. Veuillez réessayer.' });
                }
                console.log('Livre ajouté avec succès.');
                res.redirect('/admin/documents'); 
            });


        } else if (type === 'periodique') {
            console.log({ volume, numero, issn });
            if (!volume || !numero || !issn) {
                return res.render('admin/add', { error: 'Veuillez remplir tous les champs pour un périodique.' });
            }
            
            const sqlPeriodique = `
                INSERT INTO periodiques (document_id, volume, numero, issn)
                VALUES (?, ?, ?, ?)
            `;

            db.query(sqlPeriodique, [documentId, volume, numero, issn], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('admin/add', { error: 'Ce ISSN est déjà utilisé.' });
                    }
                    console.error('Erreur lors de l ajout du périodique : ', err);
                    return res.render('admin/add', { error: 'Une erreur est survenue. Veuillez réessayer.' });
                }
                console.log('Périodique ajouté avec succès.');
                res.redirect('/admin/documents'); 
            });
        } else {

            console.error('Type de document invalide.');
            res.render('admin/add', { error: 'Type de document invalide.' });
        }
    });
});

router.get('/documents/search', (req, res) => {
    const { contenu, type, theme } = req.query;
    console.log({ contenu, type, theme });

    let sql = `
        SELECT 
            d.id, 
            d.titre, 
            d.annee_publication, 
            d.editeur, 
            d.reference, 
            d.type,
            d.theme, 
            MAX(l.auteur) AS auteur, 
            MAX(l.isbn) AS isbn, 
            MAX(p.volume) AS volume, 
            MAX(p.numero) AS numero, 
            MAX(p.issn) AS issn, 
            COUNT(CASE WHEN e.statut = 'en rayon' THEN 1 END) AS exemplaires_en_rayon
        FROM documents d
        LEFT JOIN livres l ON d.id = l.document_id
        LEFT JOIN periodiques p ON d.id = p.document_id
        LEFT JOIN exemplaires e ON d.id = e.document_id
        WHERE 1=1
    `;

    const sqlTheme = `SELECT DISTINCT theme FROM documents`;
    let params = [];

    if (contenu) {
        sql += ` AND (d.titre LIKE ? OR l.auteur LIKE ? OR l.isbn LIKE ?)`;
        params.push(`%${contenu}%`, `%${contenu}%`, `%${contenu}%`);
    }

    if (type && type !== 'tout') {
        sql += ` AND d.type = ?`;
        params.push(type);
    }

    if (theme && theme !== 'tout') {
        sql += ` AND d.theme = ?`;
        params.push(theme);
    }

    sql += `
        GROUP BY d.id
        ORDER BY d.titre ASC
    `;

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).send('Erreur lors de la recherche');
        }

        db.query(sqlTheme, (err, restheme) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur serveur');
            }

            res.render('admin/documents', { 
                documents: result, 
                themes: restheme, 
                admin: req.session.admin 
            });
        });
    });
});



router.get('/modifier/:id', (req,res)=>{
    const userID = req.params.id;
    console.log(userID);
    const sql = `SELECT * FROM users WHERE id = ?`;
    db.query(sql , [userID] , (err, result)=>{
        if(err){
            console.error(err);
            return res.status(500).send('Erreur du serveur');
        }
        const user= result[0];
        res.render('admin/modifier' , {user});
    });
});

router.post('/modifier/:id' , (req,res)=>{
    const { nom, prenom , email , categorie , exemplaires_max , duree_max}=req.body
    const userID = req.params.id;
    const sql = `UPDATE users SET nom = ? , prenom = ? , email = ? , categorie = ? , exemplaires_max = ? , duree_max = ? 
            WHERE id = ?
    `;
    db.query(sql , [nom, prenom , email , categorie , exemplaires_max , duree_max ,userID ] , (err,result)=>{
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.redirect('/admin/users');
    });
});

router.post('/supprimer/:id' , (req,res)=>{
    const userID = req.params.id;
    const sql = `DELETE FROM users WHERE id = ?`;
    db.query(sql , [userID] , (err,result)=>{
        if(err){
            console.error(err);
            return res.status(500).send('Erreur du serveur');
        }
         res.redirect('/admin/users');       
    });
});

router.get('/users/recherche', (req, res) => {
    const { contenu, categorie, trie } = req.query;
    console.log({ contenu, categorie, trie });
    let sql=`SELECT 
            u.* ,
            count(*) as total_empruntes,
            SUM(CASE WHEN e.statut = 'retourne' THEN 1 ELSE 0 END) AS total_retournes,
            SUM(CASE WHEN e.statut = 'en cours' THEN 1 ELSE 0 END) AS total_en_cours
            FROM users u
            LEFT JOIN emprunts e ON u.id = e.user_id
            WHERE 1=1`
    let sql123 = `
        SELECT u.*, COUNT(e.id) AS cnt
        FROM users u
        LEFT JOIN emprunts e ON e.user_id = u.id
        WHERE 1=1
    `;
    let params = [];

    if (contenu) {
        sql += ` AND (u.nom LIKE ? OR u.prenom LIKE ? OR u.email LIKE ?)`;
        params.push(`%${contenu}%`, `%${contenu}%`, `%${contenu}%`);
    }


    if (categorie && categorie !== 'tout') {
        sql += ` AND u.categorie = ?`;
        params.push(categorie);
    }


    sql += ` GROUP BY u.id`;


    if (trie && trie !== 'tout') {
        sql += ` ORDER BY`;
        switch (trie) {
            case 'plus':
                sql += ` total_empruntes DESC`;
                break;
            case 'moin':
                sql += ` total_empruntes ASC`;
                break;
            case 'recent':
                sql += ` u.id DESC`;
                break;
            case 'ancien':
                sql += ` u.id ASC`;
                break;
            default:
                sql += ` u.id ASC`; 
        }
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).send('Erreur lors de la recherche');
        }
        res.render('admin/users', { users: result , admin : req.session.admin });
    });
});


router.get('/loans', (req, res) => {
    const sql = `
        SELECT e.id, u.nom AS Utilisateur, ex.numero_ordre AS Exemplaire, ex.statut AS ex_statut, ex.etat AS ex_etat,
               e.date_debut, e.date_fin, e.statut, doc.titre AS Titre_Document
        FROM emprunts e
        JOIN users u ON u.id = e.user_id
        JOIN exemplaires ex ON ex.id = e.exemplaire_id
        JOIN documents doc ON doc.id = ex.document_id
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la récupération des emprunts.');
        }
        console.log(results);
        res.render('admin/index', { emprunts: results , admin : req.session.admin });
    });
});


router.get('/emprunts/Ajouter', (req, res) => {
    const sqlUsers = `SELECT id, nom FROM users`; 
    const sqlExemplaires = `
        SELECT ex.id, ex.numero_ordre, doc.titre 
        FROM exemplaires ex
        JOIN documents doc ON ex.document_id = doc.id
        WHERE ex.statut = 'en rayon'`; 

    db.query(sqlUsers, (err, users) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la récupération des utilisateurs.');
        }

        db.query(sqlExemplaires, (err, exemplaires) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la récupération des exemplaires.');
            }

            res.render('emprunts/add', { users, exemplaires });
        });
    });
});


router.post('/emprunts/Ajouter', (req, res) => {
    const { user_id, exemplaire_id } = req.body;

    const sqlEx = `SELECT statut FROM exemplaires WHERE id = ?`;
    db.query(sqlEx, [exemplaire_id], (err, resultEx) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la vérification de l\'exemplaire.');
        }
        if (!resultEx || resultEx.length === 0 || resultEx[0].statut !== 'en rayon') {
            return res.status(400).send('Cet exemplaire n\'est pas disponible.');
        }

        const sqlUs = `SELECT categorie, exemplaires_max, duree_max FROM users WHERE id = ?`;
        db.query(sqlUs, [user_id], (err, resultUs) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors de la vérification de l\'utilisateur.');
            }
            if (!resultUs || resultUs.length === 0) {
                return res.status(400).send('Cet utilisateur n\'est pas disponible.');
            }

            const sqlNbr = `SELECT COUNT(*) AS count FROM emprunts WHERE user_id = ? AND statut = 'en cours'`;
            db.query(sqlNbr, [user_id], (err, resultC) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send('Erreur lors du calcul');
                }
                if (resultC[0].count >= resultUs[0].exemplaires_max) {
                    return res.status(400).send('L\'utilisateur a atteint la limite d\'emprunts');
                }

                const date_emprunt = new Date();
                const date_retour_prevue = new Date();
                date_retour_prevue.setDate(date_emprunt.getDate() + resultUs[0].duree_max);

                const sqlEm = `
                    INSERT INTO emprunts(user_id, exemplaire_id, date_debut, date_fin, statut)
                    VALUES (?, ?, ?, ?, 'en cours')
                `;
                db.query(sqlEm, [user_id, exemplaire_id, date_emprunt, date_retour_prevue], (err, resultEm) => {
                    if (err) {
                        console.error(err);
                        return res.status(500).send('Une erreur est survenue. Veuillez réessayer.');
                    }
                    console.log('Emprunt ajouté avec succès.');

                    const sqlUp = `UPDATE exemplaires SET statut = 'en prêt' WHERE id = ?`;
                    db.query(sqlUp, [exemplaire_id], (err, resultUp) => {
                        if (err) {
                            console.error('Erreur mise à jour : ', err);
                            return res.status(500).send('Erreur serveur lors de la mise à jour du document');
                        }
                        res.redirect('/admin/loans');
                    });
                });
            });
        });
    });
});


router.post('/emprunts/retour/:id' , (req,res)=>{
    const empruntId = req.params.id;
    const sql = `SELECT e.id AS emprunt_id , e.exemplaire_id, e.date_fin, ex.statut AS exemplaire_statut
        FROM emprunts e
        JOIN exemplaires ex ON e.exemplaire_id=ex.id
        WHERE e.id= ? AND e.statut = 'en cours'
    `;
    db.query(sql , [empruntId] , (err,results)=>{
        if(err || results.length===0){
            console.error(err || 'Emprunt non trouvé.');
            return res.status(400).send('Emprunt non valide ou déjà retourné.');
        }
        const emprunt = results[0];
        const date_retour = new Date() ;
        const isLate = date_retour > new Date(emprunt.date_fin);

        const sqlUpdateEmprunt = `
            UPDATE emprunts SET statut = 'retourne', date_retour = ? WHERE id = ?;
        `;
        const sqlUpdateExemplaire = `
            UPDATE exemplaires SET statut = 'en rayon' WHERE id = ?;
        `;
        
        
        db.query(sqlUpdateEmprunt, [new Date(), empruntId], (err, result1) => {
            if (err) {
                console.error('Erreur lors de la mise à jour de l\'emprunt :', err);
                return res.status(500).send('Erreur serveur lors de la mise à jour de l\'emprunt.');
            }
        
            
            db.query(sqlUpdateExemplaire, [emprunt.exemplaire_id], (err, result2) => {
                if (err) {
                    console.error('Erreur lors de la mise à jour de l\'exemplaire :', err);
                    return res.status(500).send('Erreur serveur lors de la mise à jour de l\'exemplaire.');
                }
        
                res.redirect('/admin/loans');
            });
        });

    });
});


router.get('/profil' , (req,res)=>{
    res.render('admin/profil' , {admin : req.session.admin})
});

router.get('/profil/modifier' , (req,res)=>{
    const admin = req.session.admin;
    res.render('admin/modifierAdmin' ,{admin : req.session.admin});
});

router.post('/profil/modifier' ,(req,res)=>{
    const { nom, prenom, email } = req.body;
    const adminId = req.session.admin.id; 
    const sql = `
    UPDATE bibliothecaires
    SET nom = ?, prenom = ?, email = ?
    WHERE id = ?`;

    db.query(sql , [nom, prenom, email, adminId] , (err, result)=>{
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la vérification de l\'exemplaire.');
        }
        req.session.admin.nom = nom;
        req.session.admin.prenom = prenom;
        req.session.admin.email = email;
        res.redirect('/admin/profil');
    });
});

router.get('/exemplaires' , (req,res)=>{
    const sql = `SELECT d.titre , d.editeur,ex.statut,ex.numero_ordre ,ex.date_achat,ex.etat FROM exemplaires ex
    join documents d on d.id = document_id`;
    const sqletat = `SELECT DISTINCT etat FROM exemplaires`;
    db.query(sql , (err,result)=>{
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la vérification de l\'exemplaire.');
        }
        db.query(sqletat , (err,resultetat)=>{
            res.render('admin/exemplaires' , {exemplaires : result, etats : resultetat}) 
        })
       
    })
});
router.get('/exemplaires/search', (req, res) => {
    const { etat } = req.query; 
    
    let sql = `
        SELECT d.titre, d.editeur, ex.statut, ex.numero_ordre, ex.date_achat, ex.etat 
        FROM exemplaires ex
        JOIN documents d ON d.id = ex.document_id
    `;
    const sqletat = `SELECT DISTINCT etat FROM exemplaires`;

    const conditions = [];
    const params = [];

    if (etat && etat !== 'tout') {
        conditions.push("ex.etat = ?");
        params.push(etat);
    }
    if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(" AND ")}`;
    }

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur lors de la recherche des exemplaires.");
        }

        db.query(sqletat, (err, resultetat) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Erreur lors de la récupération des états.");
            }
            res.render('admin/exemplaires', { exemplaires: result, etats: resultetat });
        });
    });
});

router.post('/exemplaires/reparer/:numero_ordre', (req, res) => {
    const { numero_ordre } = req.params;

    const sql = `UPDATE exemplaires SET etat = 'neuf' WHERE numero_ordre = ?`;

    db.query(sql, [numero_ordre], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur lors de la mise à jour de l'état de l'exemplaire.");
        }
        res.redirect('/admin/exemplaires');
    });
});

router.get('/retards', (req, res) => {
    const sql = `
        SELECT 
            e.id AS emprunt_id,
            u.nom AS nom_utilisateur,
            u.prenom AS prenom_utilisateur,
            u.email,
            ex.numero_ordre,
            d.titre AS titre_document,
            e.date_debut,
            e.date_fin,
            DATEDIFF(CURDATE(), e.date_fin) AS jours_de_retard
        FROM 
            emprunts e
        JOIN 
            users u ON e.user_id = u.id
        JOIN 
            exemplaires ex ON e.exemplaire_id = ex.id
        JOIN 
            documents d ON ex.document_id = d.id
        WHERE 
            e.statut = 'en cours' AND e.date_fin < CURDATE();
    `;

    db.query(sql, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Erreur lors de la récupération des emprunts en retard.");
        }

        res.render('admin/retards', { retards: result });
    });
});


export default router;