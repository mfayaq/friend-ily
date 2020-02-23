const functions = require('firebase-functions')
const app = require('express')()

const { getAllScreams, postOneScream } = require('./handlers/screams')
const { signup,login } = require('./handlers/users')
// admin.initializeApp()
const FBAuth = require('./util/fbAuth')


//Scream Routes
app.get('/screams',getAllScreams)
app.post('/scream',FBAuth,postOneScream)

//User Routes
app.post('/signup',signup)
app.post('/login',login)

exports.api = functions.region("asia-east2").https.onRequest(app)