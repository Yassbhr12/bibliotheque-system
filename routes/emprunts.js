import express from 'express';
import db from '../config/db.js';

const router = express.Router();
/*
router.get('/', (req, res) => {
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
        res.render('emprunts/index', { emprunts: results });
    });
});


router.get('/Ajouter', (req, res) => {
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


router.post('/Ajouter', (req, res) => {
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
                        res.redirect('/emprunts');
                    });
                });
            });
        });
    });
});


router.post('/retour/:id' , (req,res)=>{
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
        
                res.redirect('/emprunts');
            });
        });

    });
});
*/
export default router;