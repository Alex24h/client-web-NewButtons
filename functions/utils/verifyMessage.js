const admin = require('firebase-admin')
const emailUtils = require('./email')
const createMessageUtils = require('./createMessage')
const googleUtils = require('./google')
const onshapeUtils = require('./onshape')

module.exports = {

  verifyMessage:async(messageId,messageData)=>{

    const user=messageData.user
    const now=Date.now()
    var batch = admin.firestore().batch()

    try{

      //user chain
      let userChain={}
      let userPreviousMessageData={}
      userChain.currentMessage=messageId
      userChain.nextMessage='none'
      userChain.previousMessage='none'
      userChain.index=1
      userChain.newDay=true
      userChain.newMonth=true
      const lastUserMessages=await admin.firestore().collection('PERRINNMessages').where('user','==',user).where('verified','==',true).orderBy('serverTimestamp','desc').limit(2).get()
      lastUserMessages.forEach(message=>{
        if(message.id!=messageId&&userChain.previousMessage=='none'){
          userChain.previousMessage=message.id
          userPreviousMessageData=message.data()
          userChain.index=((userPreviousMessageData.userChain||{}).index+1)||1
          userChain.newDay=Math.floor(now/86400000)!=Math.floor(((userPreviousMessageData.verifiedTimestamp||{}).seconds/3600/24)||0)
          userChain.newMonth=Math.floor(now/86400000/30)!=Math.floor(((userPreviousMessageData.verifiedTimestamp||{}).seconds/3600/24/30)||0)
          batch.update(admin.firestore().doc('PERRINNMessages/'+userChain.previousMessage),{"userChain.nextMessage":admin.firestore.FieldValue.arrayUnion(messageId)},{create:true})
        }
      })

      //user data
      let authEmail=''
      if(!(messageData.userEmail||userPreviousMessageData.userEmail)&&(user!='-L7jqFf8OuGlZrfEK6dT')){
        const userRecord=await admin.auth().getUser(user)
        if(userRecord)authEmail=userRecord.toJSON().email
      }
      let userEmail=messageData.userEmail||userPreviousMessageData.userEmail||authEmail
      messageData.searchName=(messageData.name||userPreviousMessageData.name||'').toLowerCase()+' '+(messageData.familyName||userPreviousMessageData.familyName||'').toLowerCase()
      messageData.createdTimestamp=messageData.createdTimestamp||userPreviousMessageData.createdTimestamp||now
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{userEmail:userEmail||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{name:messageData.name||userPreviousMessageData.name||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{familyName:messageData.familyName||userPreviousMessageData.familyName||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{userImageTimestamp:messageData.userImageTimestamp||userPreviousMessageData.userImageTimestamp||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{imageUrlThumbUser:messageData.imageUrlThumbUserLong||messageData.imageUrlThumbUser||userPreviousMessageData.imageUrlThumbUser||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{imageUrlMedium:messageData.imageUrlMediumLong||messageData.imageUrlMedium||userPreviousMessageData.imageUrlMedium||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{imageUrlOriginal:messageData.imageUrlOriginalLong||messageData.imageUrlOriginal||userPreviousMessageData.imageUrlOriginal||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{createdTimestamp:messageData.createdTimestamp},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{searchName:messageData.searchName},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${user}.name`]:messageData.name||userPreviousMessageData.name||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${user}.familyName`]:messageData.familyName||userPreviousMessageData.familyName||null},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${user}.imageUrlThumb`]:messageData.imageUrlThumbUser||userPreviousMessageData.imageUrlThumbUser||null},{create:true})

      //chat chain
      let chatPreviousMessageData={}
      const chatPreviousMessages=await admin.firestore().collection('PERRINNMessages').where('chain','==',messageData.chain).where('lastMessage','==',true).get()
      let chatLastMessage=true
      chatPreviousMessages.forEach(message=>{
        if(message.data().serverTimestamp<messageData.serverTimestamp&&messageId!=message.id){
          batch.update(admin.firestore().doc('PERRINNMessages/'+message.id),{lastMessage:false})
          chatPreviousMessageData=message.data()
        } else if (message.data().serverTimestamp>messageData.serverTimestamp&&messageId!=message.id) {
          chatLastMessage=false
        }
      })
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{lastMessage:chatLastMessage})

      //message recipientList (merge with user, transactionOut user, previous chat list and remove duplicates and remove undefined and null)
      messageData.recipientList=[user].concat([(messageData.transactionOut||{}).user]||[]).concat(messageData.recipientList||[]).concat(chatPreviousMessageData.recipientList||[])
      messageData.recipientList=messageData.recipientList.filter((item,pos)=>messageData.recipientList.indexOf(item)===pos)
      messageData.recipientList.indexOf('undefined')!=-1&&messageData.recipientList.splice(messageData.recipientList.indexOf('undefined'),1)
      messageData.recipientList.indexOf(null)!=-1&&messageData.recipientList.splice(messageData.recipientList.indexOf(null),1)
      if(messageData.chain==user)messageData.recipientList=[user]
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{recipientList:messageData.recipientList||[]},{create:true})

      //message recipients data
      var reads=[]
      messageData.recipientList.forEach(recipient=>{
        if(recipient!=user)reads.push(admin.firestore().collection('PERRINNMessages').where('user','==',recipient||null).where('verified','==',true).orderBy('serverTimestamp','desc').limit(1).get())
      })
      const recipientsObj=await Promise.all(reads)
      recipientsObj.forEach((recipient)=>{
        if(recipient.docs[0]!=undefined)batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${recipient.docs[0].data().user}.name`]:(recipient.docs[0].data()||{}).name||null},{create:true})
        if(recipient.docs[0]!=undefined)batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${recipient.docs[0].data().user}.familyName`]:(recipient.docs[0].data()||{}).familyName||null},{create:true})
        if(recipient.docs[0]!=undefined)batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${recipient.docs[0].data().user}.imageUrlThumb`]:(recipient.docs[0].data()||{}).imageUrlThumbUser||null},{create:true})
        if(recipient.docs[0]!=undefined)batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${recipient.docs[0].data().user}.searchName`]:(recipient.docs[0].data()||{}).searchName||null},{create:true})
        if(recipient.docs[0]!=undefined)batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{[`recipients.${recipient.docs[0].data().user}.unreadMessages`]:((chatPreviousMessageData.reads||{})[recipient.docs[0].data().user]||null)?1:(((((chatPreviousMessageData.recipients||{})[recipient.docs[0].data().user]||{}).unreadMessages||1)+1)||null)},{create:true})
      })

      //email notifications
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{emailNotificationsList:messageData.recipientList},{create:true})
      batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{emailNotificationsStatus:messageData.emailNotificationsStatus||'pending'},{create:true})

      //*******INSTANT CREDIT/DEBIT*********************
        //messaging cost
        let messagingCost={}
        const costs=await admin.firestore().doc('appSettings/costs').get()
        messagingCost.amountWrite=costs.data().messageWrite||0
        messagingCost.amount=Math.round(Number(messagingCost.amountWrite)*100000)/100000
        messagingCost.amountWriteCummulate=((userPreviousMessageData.messagingCost||{}).amountWriteCummulate||0)+(messagingCost.amountWrite||0)
        //message transaction out
        let transactionOut={}
        const transactionOutUserLastMessages=await admin.firestore().collection('PERRINNMessages').where('user','==',(messageData.transactionOut||{}).user||null).where('verified','==',true).orderBy('serverTimestamp','desc').limit(1).get()
        let transactionOutUserLastMessageData=(transactionOutUserLastMessages.docs[0]!=undefined)?(transactionOutUserLastMessages.docs[0]||{}).data():{}
        transactionOut.user=(messageData.transactionOut||{}).user||null
        transactionOut.message=(messageData.transactionOut||{}).message||null
        transactionOut.name=transactionOutUserLastMessageData.name||null
        transactionOut.familyName=transactionOutUserLastMessageData.familyName||null
        transactionOut.imageUrlThumb=transactionOutUserLastMessageData.imageUrlThumbUser||null
        transactionOut.amount=Number((messageData.transactionOut||{}).amount||0)
        transactionOut.code=(messageData.transactionOut||{}).code||null
        transactionOut.amountCummulate=Number((userPreviousMessageData.transactionOut||{}).amountCummulate||0)+transactionOut.amount
        if(transactionOut.code=='PERRINNselfTRANSACTION'&&user=='QYm5NATKa6MGD87UpNZCTl6IolX2'){
          transactionOut.user='QYm5NATKa6MGD87UpNZCTl6IolX2'
          transactionOut.name=messageData.name||userPreviousMessageData.name||null
          transactionOut.familyName=messageData.familyName||userPreviousMessageData.familyName||null
          transactionOut.imageUrlThumb=messageData.imageUrlThumbUser||userPreviousMessageData.imageUrlThumbUser||null
        }
        //message transaction in
        let transactionIn={}
        const transactionInUserLastMessages=await admin.firestore().collection('PERRINNMessages').where('user','==',(messageData.transactionIn||{}).user||null).where('verified','==',true).orderBy('serverTimestamp','desc').limit(1).get()
        let transactionInUserLastMessageData=(transactionInUserLastMessages.docs[0]!=undefined)?(transactionInUserLastMessages.docs[0]||{}).data():{}
        transactionIn.user=(messageData.transactionIn||{}).user||null
        transactionIn.message=(messageData.transactionIn||{}).message||null
        transactionIn.name=transactionInUserLastMessageData.name||null
        transactionIn.familyName=transactionInUserLastMessageData.familyName||null
        transactionIn.imageUrlThumb=transactionInUserLastMessageData.imageUrlThumbUser||null
        transactionIn.amount=Number((messageData.transactionIn||{}).amount||0)
        if(transactionOut.code=='PERRINN'&&user=='QYm5NATKa6MGD87UpNZCTl6IolX2')transactionIn.amount=transactionOut.amount
        if(transactionOut.code=='PERRINNselfTRANSACTION'&&user=='QYm5NATKa6MGD87UpNZCTl6IolX2'){
          transactionIn.amount=transactionOut.amount
        }
        transactionIn.amountCummulate=Number((userPreviousMessageData.transactionIn||{}).amountCummulate||0)+transactionIn.amount
        if(transactionIn.message&&transactionIn.amount>0&&transactionIn.user)batch.update(admin.firestore().doc('PERRINNMessages/'+transactionIn.message),{"transactionOut.message":messageId},{create:true})
        //COIN Purchase
        let purchaseCOIN={}
        purchaseCOIN.chargeID=(messageData.purchaseCOIN||{}).chargeID||null
        purchaseCOIN.amount=(messageData.purchaseCOIN||{}).amount||0
        purchaseCOIN.amountCummulate=((userPreviousMessageData.purchaseCOIN||{}).amountCummulate||0)+purchaseCOIN.amount
        //message wallet
        let wallet={}
        wallet.previousBalance=((userPreviousMessageData.PERRINN||{}).wallet||{}).balance||0
        wallet.balance=wallet.previousBalance
        wallet.balance=Math.round((Number(wallet.balance)-Number(messagingCost.amount))*100000)/100000
        wallet.balance=Math.round((Number(wallet.balance)-Number(transactionOut.amount))*100000)/100000
        wallet.balance=Math.round((Number(wallet.balance)+Number(transactionIn.amount))*100000)/100000
        wallet.balance=Math.round((Number(wallet.balance)+Number(purchaseCOIN.amount))*100000)/100000
        wallet.balance=Math.max(0,wallet.balance)

      //*******TIME BASED INTEREST*************************
        let membership={}
        membership.dailyCost=costs.data().membershipDay
        //contract
        let contract={}
        contract.position=(messageData.contract||{}).position||(userPreviousMessageData.contract||{}).position||null
        contract.level=(messageData.contract||{}).level||(userPreviousMessageData.contract||{}).level||0
        contract.frequency=(messageData.contract||{}).frequency||(userPreviousMessageData.contract||{}).frequency||0
        contract.message=(messageData.contract||{}).message||(userPreviousMessageData.contract||{}).message||null
        if(contract.level!=((userPreviousMessageData.contract||{}).level||0)||contract.frequency!=((userPreviousMessageData.contract||{}).frequency||0)||contract.position!=((userPreviousMessageData.contract||{}).position||null))contract.createdTimestamp=now
        else contract.createdTimestamp=(userPreviousMessageData.contract||{}).createdTimestamp||null
        contract.days=0
        contract.amount=0
        contract.rateDay=0
        contract.signed=false
        if(contract.level&&contract.frequency&&contract.position&&contract.message&&contract.createdTimestamp){
          const contractSignatureMessage=await admin.firestore().doc('PERRINNMessages/'+contract.message).get()
          let contractSignatureMessageData=(contractSignatureMessage!=undefined)?(contractSignatureMessage||{}).data():{}
          if(contractSignatureMessageData.user=='QYm5NATKa6MGD87UpNZCTl6IolX2'
            &&((contractSignatureMessageData.contractSignature||{}).user||null)==user
            &&(((contractSignatureMessageData.contractSignature||{}).contract||{}).createdTimestamp||null)<=contract.createdTimestamp
            &&(((contractSignatureMessageData.contractSignature||{}).contract||{}).level||null)>=contract.level
            &&(((contractSignatureMessageData.contractSignature||{}).contract||{}).frequency||null)>=contract.frequency
          ){
            contract.signed=true
            contract.signedLevel=((contractSignatureMessageData.contractSignature||{}).contract||{}).level||null
            contract.signedFrequency=((contractSignatureMessageData.contractSignature||{}).contract||{}).frequency||null
            contract.days=(now/1000/3600/24-(userPreviousMessageData.verifiedTimestamp||{}).seconds/3600/24)||0
            contract.rateDay=contract.level*contract.frequency
            contract.amount=contract.days*contract.rateDay
          }
        }
        contract.daysTotal=((userPreviousMessageData.contract||{}).daysTotal||0)+contract.days
        contract.amountCummulate=((userPreviousMessageData.contract||{}).amountCummulate||0)+contract.amount
        //interest
        let interest={}
        interest.rateYear=costs.data().interestRateYear
        interest.days=(now/1000/3600/24-(userPreviousMessageData.verifiedTimestamp||{}).seconds/3600/24)||0
        interest.amountBase=wallet.balance-interest.days*membership.dailyCost/2+contract.amount/2
        interest.amount=Math.max(0,interest.amountBase*(Math.exp(interest.rateYear/365*interest.days)-1))
        interest.amountCummulate=((userPreviousMessageData.interest||{}).amountCummulate||0)+interest.amount
        wallet.balance=Math.round((Number(wallet.balance)+Number(interest.amount||0))*100000)/100000

      //*******TIME BASED CREDIT/DEBIT**********************
        //PERRINN contract
        wallet.balance=Math.round((Number(wallet.balance)+Number(contract.amount||0))*100000)/100000
        //PERRINN membership
        if(wallet.balance>0){
          googleUtils.googleGroupMemberInsert(userEmail)
          onshapeUtils.onshapeTeamMemberPost(userEmail)
          membership.days=(now/1000/3600/24-(userPreviousMessageData.verifiedTimestamp||{}).seconds/3600/24)||0
          if((membership.days*membership.dailyCost)>wallet.balance)membership.days=wallet.balance/membership.dailyCost
        } else membership.days=0
        membership.daysTotal=((userPreviousMessageData.membership||{}).daysTotal||0)+membership.days
        membership.amount=membership.days*membership.dailyCost
        membership.amountCummulate=((userPreviousMessageData.membership||{}).amountCummulate||0)+membership.amount
        wallet.balance=Math.round((Number(wallet.balance)-Number(membership.amount||0))*100000)/100000

      //*******MESSAGE WRITES**********************
        //message chat Subject
        if(messageData.chain==user)messageData.chatSubject='User records'
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{chatSubject:messageData.chatSubject||chatPreviousMessageData.chatSubject||messageData.text||null},{create:true})
        //message event
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{eventDate:messageData.eventDate||chatPreviousMessageData.eventDate||null},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{eventDescription:messageData.eventDescription||chatPreviousMessageData.eventDescription||null},{create:true})
        //message objects
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{userChain:userChain},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{messagingCost:messagingCost},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{purchaseCOIN:purchaseCOIN},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{transactionOut:transactionOut},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{transactionIn:transactionIn},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{membership:membership},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{contract:contract},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{interest:interest},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{wallet:wallet},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{"PERRINN.wallet":wallet},{create:true})
        //message verified
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{verified:true},{create:true})
        batch.update(admin.firestore().doc('PERRINNMessages/'+messageId),{verifiedTimestamp:admin.firestore.FieldValue.serverTimestamp()},{create:true})

        await batch.commit()

      //*******MESSAGES CREATION**********
        //transaction out
        if(!transactionOut.message&&transactionOut.amount>0&&transactionOut.user){
          createMessageUtils.createMessageAFS({
            user:transactionOut.user,
            text:transactionOut.amount+" COINS received",
            chain:messageData.chain,
            transactionIn:{
              user:user,
              message:messageId,
              amount:transactionOut.amount
            }
          })
        }

        //contract Signature
        if((messageData.contractSignature||{}).user||null){
          const contractSignatureUserLastMessage=await admin.firestore().collection('PERRINNMessages').where('user','==',messageData.contractSignature.user).where('verified','==',true).orderBy('serverTimestamp','desc').limit(1).get()
          createMessageUtils.createMessageAFS({
            user:messageData.contractSignature.user,
            text:'Contract signature activation',
            chain:messageData.contractSignature.user,
            contract:{
              message:messageId
            }
          })
        }

      return {
        user:user,
        userEmail:userEmail||null,
        wallet:wallet,
        transactionIn:transactionIn,
        transactionOut:transactionOut,
        purchaseCOIN:purchaseCOIN,
        membership:membership,
        contract:contract,
        messagingCost:messagingCost,
        interest:interest
      }

    }
    catch(error){
      console.log('user '+user+' error '+error)
      emailUtils.sendErrorEmail(error)
      return admin.firestore().doc('PERRINNMessages/'+messageId).update({verified:false})
    }

  },

}
