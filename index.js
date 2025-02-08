const express = require('express');
const db = require('./database');
const app = express();
const PORT = 3000;
const {rateLimit} = require('express-rate-limit').default;
const request = require("request");
const axios = require("axios");

const Gemini_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyBNRi0l7_vPwfPRhomXk-LMJ4QxbkbPk-g"

let contents = []

function resetContents() {
    contents = [
        {
            "role": "user",
            "parts": [
                {
                    "text": `
                                Génère moi à chaque fois un JSON sous la forme lorsque tu réponds. :
                                { "response": "...", "new_objectives": [{"id": 1, "name": "...", "from": 0, "to": 1}], "update_objectives": [{"id": 1, "name": "...", "from": 0, "to": 100, "value": 95}]}
                                
                                "response" contient ta réponse. "new_objectives" doit être [] si aucun nouvel objectif est prévu. Sinon pour chaque nouvel objectif, le nom "name" et:
                                - Si c'est un objectif simple (atteint, non atteint), "from" doit etre à 0 et "to" à 1
                                - Si c'est en pourcentage, "from" doit être à 0 et "to" à 100
                                - Sinon, si tu estimes que le succès a plusieurs étapes, met une valeur "from" qui indique que l'objective n'est pas commencé, et "to" qu'il est terminé.
                                - "from", "to" et "value" sont toujours des entiers.
                                
                                
                                Le nom de l'objectif doit être court et simple (approximativement 5-10 mots)...
                                Les réponses doivent être aussi courtes, et remplace le Markdown par de l'HTML.
                                
                                Sur le même principe, si l'utilisateur possède déjà un objectif mais que son message te montre qu'il l'a compris, ou au contraire mal compris, adapte la clé "value" de l'objectif afin d'indiquer si son objectif avance ou pas.
                                Si il te confirme qu'il a adhérer la notion, met la value au maximum. Félicite le et dis lui que son objectif est marqué comme "atteint".
                                
                                Si il te demande un point particulier sur un sujet qui n'est pas dans ses objectifs, propose lui, si il est vraiment intéressé, de l'ajouter en objectif.

                                Si tu vois que l'utilisateur possède déjà cet objectif, je l'ajoute pas à la liste.
                            `
                }
            ]
        }
    ]
}

resetContents()

function getPrompt(text) {
    contents.push({
        "role": "user",
        "parts": [
            {
                "text": JSON.stringify({
                    "message": text,
                })
            }
        ]
    })
    return new Promise((resolve, reject) => axios({
        method: 'post',
        url: Gemini_URL,
        responseType: 'json',
        data: {
            "contents": contents,
            "generationConfig": {
                "temperature": 1,
                "topK": 64,
                "topP": 0.95,
                "maxOutputTokens": 30000,
                "responseMimeType": "application/json"
            }
        }
    }).then(function (response) {
        const data = JSON.parse(response.data.candidates[0].content.parts[0].text)
        contents.push({
            "role": "user",
            "parts": [
                {
                    "text": text
                }
            ]
        })
        resolve(data);
    }).catch(reject));
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-8',
    legacyHeaders: false
})

/*var corsOptions = {
    origin: ["http://www.example.com/","http://localhost:3000"]
}
app.use(cors(corsOptions));*/


app.use("/", express.static('dist'))

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // Autorise tous les domaines (*), à restreindre en prod
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }

    next();
});



app.use(limiter);
app.use(express.json());

function getObjectives() {
    let objectives = [];
    db.all("SELECT * FROM objectives", [], (err, rows) => {
        if (err) {
            return [];
        }
        let res = [];
        for (let row of rows) {
            res.push({
                id: row.id,
                name: row.label,
                from: row.fromValue,
                to: row.toValue,
                value: row.achieved
            });
        }
        return res;
    });
}


app.post('/chat', async (req, res) => {
    if (req.body.reset) resetContents();

    res.status(200).json(await getPrompt(req.body.text));
    /*const id = req.params.id;
    db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
        if (err) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        res.json({
            "message": "success",
            "data": row
        });
    });*/
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});