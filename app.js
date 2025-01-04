import express from 'express';
import db from './config/db.js';
import bodyParser from 'body-parser';
import documentsRoutes from './routes/documents.js';
import session from 'express-session';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';
import modifierRoutes from './routes/modifier.js';
import empruntsRoutes from './routes/emprunts.js';

const app = express();
const port = 3000;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(session({
    secret: 'votre_secret',
    resave: false,
    saveUninitialized: true
}));

app.use((req,res,next)=>{
    if(req.session.user){
        res.locals.isAuthenticated=true;
        res.locals.user=req.session.user;
    }else{
        res.locals.isAuthenticated=false;
    }
    next();
});


app.use('/documents', documentsRoutes);
app.use('/auth', authRoutes);
app.use('/admin' , adminRoutes);
app.use('/', contactRoutes);
app.use('/' , modifierRoutes);
app.use('/emprunts', empruntsRoutes);

app.get('/', (req, res) => {
    const user = req.session.user || null;
    const sql = `SELECT d.id AS document_id,d.titre, d.type , d.editeur,COUNT(e.id) AS nombre_emprunts
            FROM 
            documents d
            JOIN exemplaires ex ON d.id = ex.document_id
            JOIN emprunts e ON ex.id = e.exemplaire_id
            GROUP BY  d.id, d.titre
            ORDER BY nombre_emprunts DESC
            LIMIT 3`;
    db.query(sql , (err,result)=>{
        if (err) {
            console.error(err);
            return res.status(500).send('Erreur serveur');
        }
        res.render('home.ejs' ,{user , documents : result});
    })
});

app.get('/about' , (req,res)=>{
    const user = req.session.user || null;
    res.render('about.ejs' , {user});
});

app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); 
    }
    console.log(req.session.user);
    const userID = req.session.user.id;
    const sql = `SELECT e.id, u.nom AS Utilisateur, ex.numero_ordre AS Exemplaire, ex.statut AS ex_statut, ex.etat AS ex_etat,
                 e.date_debut, e.date_fin, e.statut, d.* , e.date_retour
        FROM emprunts e
        JOIN users u ON u.id = e.user_id
        JOIN exemplaires ex ON ex.id = e.exemplaire_id
        JOIN documents d ON d.id = ex.document_id
        WHERE u.id= ? 
        `;
        db.query(sql ,[userID] , (err,result)=>{
            if (err) {
                console.error(err);
                return res.status(500).send('Erreur serveur');
            }
            res.render('profile' , {user : req.session.user , documents : result});
        });
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('admin/login');
    });
});

app.get('/login' , (req , res)=>{
    res.render('auth/login.ejs');
})



app.listen(port, () => {
    console.log(`Serveur en ligne sur http://localhost:${port}`);
});
