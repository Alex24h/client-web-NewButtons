const admin = require('firebase-admin')
const createMessageUtils = require('./createMessage')
const {google} = require('googleapis');

module.exports = {

  joinPERRINNGoogleGroup:(user)=>{
    return admin.auth().getUser(user).then(function(userRecord) {
      var email=userRecord.toJSON().email;
      var SERVICE_ACCOUNT_EMAIL = 'perrinn-service-account@perrinn.iam.gserviceaccount.com';
      var SERVICE_ACCOUNT_KEY_FILE = './perrinn-73e7f16c6042.json';
      const jwt = new google.auth.JWT(
          SERVICE_ACCOUNT_EMAIL,
          SERVICE_ACCOUNT_KEY_FILE,
          null,
          ['https://www.googleapis.com/auth/admin.directory.group'],
          'nicolas@perrinn.com'
      );
      const googleAdmin = google.admin({
        version: 'directory_v1',
        jwt,
      });
      return admin.firestore().doc('PERRINNTeams/'+user).update({
        "apps.Google.enabled":true,
        "apps.Google.timestamp":admin.firestore.FieldValue.serverTimestamp()
      }).then(()=>{
        return jwt.authorize().then(() => {
          return googleAdmin.members.insert({
            auth: jwt,
            groupKey: "perrinn-google-group@perrinn.com",
            requestBody:{
              email:email,
              role:'MEMBER'
            }
          }).then(()=>{
              return 'done';
          }).catch(error=>{
            return error.message;
          });
        });
      });
    }).catch(error=>{
      console.log(error);
      return error;
    });
  }

}
