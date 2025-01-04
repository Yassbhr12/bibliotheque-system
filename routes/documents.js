import express from 'express';
import db from '../config/db.js';

const router = express.Router();



router.get('/',(req,res)=>{
    const sql = `SELECT d.* , l.auteur , l.isbn , p.volume ,p.numero , p.issn
        FROM documents d
        LEFT JOIN periodiques p on d.id = p.document_id
        LEFT JOIN livres l on d.id = l.document_id 
    `

    db.query(sql , (err,results)=>{
        if(err){
            console.error(err);
            res.status(500).send('Erreur serveur');
        }
        console.log(results);
        res.render('documents/index' , {documents : results , user : req.session.user});
    })
})

router.get('/details/:id', (req, res) => {
    const docID = req.params.id;
    const sqlretard = `
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
            e.statut = 'en cours' AND e.date_fin < CURDATE();`
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
        const doc = docResults[0];

        db.query(sqlExemplaires, [docID], (err, exemplaireResults) => {
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur du serveur');
            }
            db.query(sqlretard , (err,result)=>{
                if (err) {
                    console.error(err);
                    return res.status(500).send('Erreur du serveur');
                }
                res.render('documents/detail', {
                    doc,
                    exemplaires: exemplaireResults,
                    retards : result , 
                    user : req.session.user,
                });
            })
        });
    });
});


/*
router.get('/modifier/:id', (req,res)=>{
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
        res.render('documents/edit' , {doc});
    })
});


router.post('/modifier/:id', (req, res) => {
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
                res.redirect(`/documents/details/${docID}`);
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
                res.redirect(`/documents/details/${docID}`); 
            });
        } else {
            console.error('Type invalide');
            res.status(400).send('Type de document invalide');
        }
    });
});*/


router.post('/supprimer/:id', (req, res) => {
    const { id } = req.params;
    const sqlDelete = 'DELETE FROM documents WHERE id = ?';
    db.query(sqlDelete, [id], (err) => {
        if (err) {
            console.error('Erreur lors de la suppression : ', err);
            return res.redirect('/documents');
        }
        res.redirect('/documents');
    });
});




/*router.get('/Ajouter' , (req,res)=>{
    res.render('documents/add')
});

router.post('/Ajouter', (req, res) => {

    const { theme, titre, annee, editeur, reference, type, auteur, isbn, volume, issn, numero } = req.body;

    console.log(req.body);


    const sqlDocument = `
        INSERT INTO documents (theme, titre, annee_publication, editeur, reference, type)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sqlDocument, [theme, titre, annee, editeur, reference, type], (err, result) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.render('documents/add', { error: 'Cette référence est déjà utilisée.' });
            }
            console.error('Erreur lors de l ajout dans documents : ', err);
            return res.render('documents/add', { error: 'Une erreur est survenue. Veuillez réessayer.' });
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
                res.redirect('/documents'); 
            });


        } else if (type === 'periodique') {
            console.log({ volume, numero, issn });
            if (!volume || !numero || !issn) {
                return res.render('documents/add', { error: 'Veuillez remplir tous les champs pour un périodique.' });
            }
            
            const sqlPeriodique = `
                INSERT INTO periodiques (document_id, volume, numero, issn)
                VALUES (?, ?, ?, ?)
            `;

            db.query(sqlPeriodique, [documentId, volume, numero, issn], (err) => {
                if (err) {
                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.render('documents/add', { error: 'Ce ISSN est déjà utilisé.' });
                    }
                    console.error('Erreur lors de l ajout du périodique : ', err);
                    return res.render('documents/add', { error: 'Une erreur est survenue. Veuillez réessayer.' });
                }
                console.log('Périodique ajouté avec succès.');
                res.redirect('/documents'); 
            });
        } else {

            console.error('Type de document invalide.');
            res.render('documents/add', { error: 'Type de document invalide.' });
        }
    });
});*/

router.get('/recherche', (req, res) => {
    const { critere, contenu } = req.query;
    console.log( req.query);

    let sql = `
        SELECT d.*, l.auteur, l.isbn, p.volume, p.numero, p.issn
        FROM documents d
        LEFT JOIN periodiques p ON d.id = p.document_id
        LEFT JOIN livres l ON d.id = l.document_id
    `;


    const params = [];


    if (critere && critere !== 'tout') {
        if (critere === 'auteur') {
            sql += ' WHERE l.auteur LIKE ?';
            params.push(`%${contenu}%`);
        } else {
            sql += ` WHERE d.${critere} LIKE ?`;
            params.push(`%${contenu}%`);
        }
    } else {

        sql += `
            WHERE d.theme LIKE ?
            OR d.titre LIKE ?
            OR d.editeur LIKE ?
            OR l.auteur LIKE ?
        `;
        params.push(`%${contenu}%`, `%${contenu}%`, `%${contenu}%`, `%${contenu}%`);
    }


    sql += ' ORDER BY d.titre ASC';

    db.query(sql, params, (err, result) => {
        if (err) {
            console.error('Erreur SQL :', err);
            return res.status(500).send('Erreur lors de la recherche');
        }
        res.render('documents/index', { documents: result });
    });
});


router.get('/confirmation/:id' , (req,res)=>{
    const idEx = req.params.id;
    console.log(idEx);
    const sqlEx = `SELECT * FROM exemplaires WHERE id = ?`;
    const sqlDoc = 'SELECT * FROM documents WHERE id in (SELECT document_id FROM exemplaires WHERE id = ?)';
    db.query(sqlEx , [idEx] , (err,resultEx)=>{
        if (err || resultEx.length === 0) {
            console.error(err);
            return res.status(500).send('Erreur lors de la récupération de l\'exemplaire.');
        }
        console.log(resultEx);
        db.query(sqlDoc , [idEx] , (err , resultDoc)=>{
            if (err || resultDoc.length === 0) {
                console.error(err);
                return res.status(500).send('Erreur lors de la récupération du document.');
            }
            console.log(resultDoc);
            res.render('emprunts/confirmation' , {doc : resultDoc[0] , exemplaire : resultEx[0] , user : req.session.user});
        });
    });
});

router.post('/valider' , (req,res)=>{
    const {user_id , exemplaire_id}= req.body;
    const sqlUs = `SELECT categorie, exemplaires_max, duree_max FROM users WHERE id = ?`;
    db.query(sqlUs , [user_id] , (err , resultUs)=>{
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur lors de la vérification de l\'utilisateur.');
        }
        const sqlNbr = `SELECT COUNT(*) AS count FROM emprunts WHERE user_id = ? AND statut = 'en cours'`;
        db.query(sqlNbr , [user_id] , (err ,resultC)=>{
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur lors du calcul');
            }
            if(resultC[0].count>=resultUs[0].exemplaires_max){
                return res.status(400).send('L\'utilisateur a atteint la limite d\'emprunts');
            }
            
            const date_emprunt = new Date();
            const date_retour_prevue = new Date();
            date_retour_prevue.setDate(date_emprunt.getDate() + resultUs[0].duree_max);
            const sqlEm = `
                INSERT INTO emprunts(user_id, exemplaire_id, date_debut, date_fin, statut)
                VALUES (?, ?, ?, ?, 'en cours')
            `;
            db.query(sqlEm , [user_id, exemplaire_id, date_emprunt, date_retour_prevue] , (err , resultEm)=>{
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
                    res.redirect('/documents');
                });
            });
        });
    });
});
export default router;