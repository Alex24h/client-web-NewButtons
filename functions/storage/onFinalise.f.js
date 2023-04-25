const functions = require('firebase-functions')
const admin = require('firebase-admin')
try { admin.initializeApp() } catch (e) {}
const gcs = require('@google-cloud/storage')({
  keyFilename:'perrinn-d5fc1-c86aeb94515d.json',
});

exports=module.exports=functions.storage.object().onFinalize(async(data,context)=>{
  try{
    const object=data;
    const filePath=object.name;
    const fileName=filePath.split('/').pop();
    const imageID=fileName.substring(0,13);
    const bucket=gcs.bucket(object.bucket);
    const file=bucket.file(filePath);
    const config={
      action:'read',
      expires:'01-01-2501'
    };
    const url=await file.getSignedUrl(config)
    const messagesUser=await admin.firestore().collection('PERRINNMessages').where('userImageTimestamp','==',imageID).get()
    const messagesChat=await admin.firestore().collection('PERRINNMessages').where('chatImageTimestamp','==',imageID).get()
    var batch = admin.firestore().batch();
    if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_180x180')){
      batch.update(admin.firestore().collection('Images').doc(imageID),{imageUrlThumb:url[0]},{create:true})
    }
    if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_540x540')){
      batch.update(admin.firestore().collection('Images').doc(imageID),{imageUrlMedium:url[0]},{create:true})
    }
    messagesUser.forEach(message=>{
      if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_180x180')){
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageUrlThumbUser:url[0]},{create:true})
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageResized:true},{create:true})
      }
      if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_540x540')){
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageUrlMedium:url[0]},{create:true})
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageResized:true},{create:true})
      }
    })
    messagesChat.forEach(message=>{
      if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_180x180')){
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{chatImageUrlThumb:url[0]},{create:true})
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageResized:true},{create:true})
      }
      if(fileName.substring(0,fileName.lastIndexOf('.')).endsWith('_540x540')){
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{chatImageUrlMedium:url[0]},{create:true})
        batch.update(admin.firestore().collection('PERRINNMessages').doc(message.id),{imageResized:true},{create:true})
      }
    })
    await batch.commit();
  }
  catch(error){
    console.log(error)
  }
})
