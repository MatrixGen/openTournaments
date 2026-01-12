const admin = require('firebase-admin');
const serviceAccount = require('../ot-arena-firebase-adminsdk-fbsvc-dfebe333be.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;