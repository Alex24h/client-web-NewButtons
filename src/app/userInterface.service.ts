import { Injectable }    from '@angular/core';
import * as firebase from 'firebase/app';
import { AngularFireAuth } from 'angularfire2/auth';
import { AngularFireDatabase, FirebaseObjectObservable, FirebaseListObservable } from 'angularfire2/database';

@Injectable()
export class userInterfaceService {
  focusUser:string;
  focusUserObj:any;
  focusProject:string;
  currentTeam:string;
  currentTeamObj:any;
  currentUser:string;
  currentUserObj:any;
  currentUserFirstName:string;
  currentUserLastName:string;
  currentUserImageUrlThumb:string;
  services:any;
  process:any;

  constructor(private afAuth: AngularFireAuth, public db: AngularFireDatabase) {
    this.process={};
    this.afAuth.authState.subscribe((auth) => {
      if (auth!=null) {
        this.currentUser=auth.uid;
        this.db.object('PERRINNUsers/'+this.currentUser).subscribe(snapshot=>{
          this.currentUserObj=snapshot;
        });
        if (this.focusUser==null) this.focusUser=auth.uid;
        this.db.object('PERRINNUsers/'+this.focusUser).subscribe(snapshot=>{
          if (this.currentTeam==null) this.currentTeam=snapshot.personalTeam;
        });
        firebase.database().ref('appSettings/PERRINNServices/').once('value').then(services=>{
          this.services=services;
        });
      }
      else {
        this.currentUser=null;
        this.focusUser=null;
        this.currentTeam=null;
      }
    });
  }

  createMessage (text,image,imageDownloadURL,linkTeamObj,linkUserObj) {
    text=text.replace(/(\r\n|\n|\r)/gm,"");
    if(text==''&&image=='')return null;
    this.analyseMessageText(text);
    if(this.processInputsInProgress())return null;
    if(this.processInputsComplete()){
      text='';
      image='';
      imageDownloadURL='';
      linkTeamObj={};
      linkUserObj={};
    }
    const now = Date.now();
    var messageID = this.db.list('ids/').push(true).key;
    var updateObj={};
    updateObj['teamMessages/'+this.currentTeam+'/'+messageID+'/payload']={
      timestamp:now,
      text:text,
      user:this.currentUser,
      firstName:this.currentUserObj.firstName,
      imageUrlThumbUser:this.currentUserObj.imageUrlThumb,
      image:image,
      imageDownloadURL:imageDownloadURL,
      linkTeam:linkTeamObj.key?linkTeamObj.key:null,
      linkTeamName:linkTeamObj.name?linkTeamObj.name:null,
      linkTeamImageUrlThumb:linkTeamObj.imageUrlThumb?linkTeamObj.imageUrlThumb:null,
      linkUser:linkUserObj.key?linkUserObj.key:null,
      linkUserFirstName:linkUserObj.firstName?linkUserObj.firstName:null,
      linkUserLastName:linkUserObj.lastName?linkUserObj.lastName:null,
      linkUserImageUrlThumb:linkUserObj.imageUrlThumb?linkUserObj.imageUrlThumb:null,
    };
    updateObj['teamMessages/'+this.currentTeam+'/'+messageID+'/process']=this.process[this.currentTeam]?this.process[this.currentTeam]:null;
    firebase.database().ref().update(updateObj);
    this.timestampChatVisit();
    this.clearProcessData();
  }

  analyseMessageText(text){
    var newProcess=false;
    this.services.forEach((service)=>{
      var serviceRegex = new RegExp(service.val().regex,"i");
      if (text.match(serviceRegex)) {
        if (service.val().process) {
          this.process[this.currentTeam]={
            user:this.currentUser,
            service:service.key,
            regex:service.val().regex,
            message:service.val().process[1].message.text,
            step:1,
            inputsComplete:false,
            inputs:{},
            inputsArray:[],
            function:service.val().process.function,
          };
        newProcess=true;
        }
      }
    });
    if (newProcess) {
      return null;
    }
    this.services.forEach((service)=>{
      if (this.process !== undefined) {
        if (this.process[this.currentTeam] !== undefined) {
          if (service.key==this.process[this.currentTeam].service) {
            if (service.child('process').child(this.process[this.currentTeam].step).val().input) {
              var inputRegex = new RegExp(service.child('process').child(this.process[this.currentTeam].step).child('input').val().regex,"i");
              var value=text.match(inputRegex);
              if (value) {
                var variable=service.child('process').child(this.process[this.currentTeam].step).child('input').val().variable;
                if (variable) {
                  var valueString=value[0];
                  if (service.child('process').child(this.process[this.currentTeam].step).child('input').val().toLowerCase) {
                    valueString=valueString.toLowerCase();
                  }
                  if (service.child('process').child(this.process[this.currentTeam].step).child('input').val().toUpperCase) {
                    valueString=valueString.toUpperCase();
                  }
                  this.process[this.currentTeam].inputs[variable]=valueString;
                  this.process[this.currentTeam].inputsArray.push([variable,valueString]);
                }
                if (!service.child('process').child(this.process[this.currentTeam].step+1).val()){
                  this.process[this.currentTeam].inputsComplete=true;
                }
                this.process[this.currentTeam].step+=1;
                if(!this.process[this.currentTeam].inputsComplete)this.process[this.currentTeam].message=service.val().process[this.process[this.currentTeam].step].message.text;
                else this.process[this.currentTeam].message='';
              }
            }
          }
        }
      }
    });
  }

  processInputsInProgress(){
    if(this.process[this.currentTeam]==undefined)return false;
    if(this.process[this.currentTeam]==null)return false;
    if(this.process[this.currentTeam].inputsComplete==undefined)return false;
    if(this.process[this.currentTeam].inputsComplete==null)return false;
    if(!this.process[this.currentTeam].inputsComplete)return true;
    return false;
  }

  processInputsComplete(){
    if(this.process[this.currentTeam]==undefined)return false;
    if(this.process[this.currentTeam]==null)return false;
    if(this.process[this.currentTeam].inputsComplete==undefined)return false;
    if(this.process[this.currentTeam].inputsComplete==null)return false;
    if(this.process[this.currentTeam].inputsComplete)return true;
    return false;
  }

  clearProcessData(){
    this.process[this.currentTeam]={};
  }

  timestampChatVisit(){
    const now = Date.now();
    this.db.object('viewUserTeams/'+this.currentUser+'/'+this.currentTeam).update({
      lastChatVisitTimestamp:now,
      lastChatVisitTimestampNegative:-1*now,
      name:this.currentTeamObj.name,
      imageUrlThumb:this.currentTeamObj.imageUrlThumb?this.currentTeamObj.imageUrlThumb:'',
    });
    this.db.object('subscribeTeamUsers/'+this.currentTeam).update({
      [this.currentUser]:true,
    });
  }

}
