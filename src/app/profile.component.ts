import { Component } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Router, ActivatedRoute } from '@angular/router';
import { UserInterfaceService } from './userInterface.service';
import * as firebase from 'firebase/app';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
  selector: 'profile',
  template: `
  <div class='sheet'>
    <div *ngIf="!UI.currentUserIsMember" style="background-color:#f2f5d0;padding:5px">
      <div style="color:#777;font-size:10px;float:left">To become a PERRINN member and gain full access, you need to top up your COINS (go to your settings). If you have any question about the membership, feel free to chat with Nicolas.</div>
      <div style="color:#777;font-size:10px;float:left;line-height:16px;margin:0 5px 0 5px;padding:0 3px 0 3px;border-radius:3px;border-style:solid;border-width:1px;cursor:pointer" onclick="window.open('https://sites.google.com/view/perrinn/perrinn-com/membership','_blank')">More info about the membership</div>
      <div style="color:#777;font-size:10px;float:left;line-height:16px;margin:0 5px 0 5px;padding:0 3px 0 3px;border-radius:3px;border-style:solid;border-width:1px;cursor:pointer" (click)="router.navigate(['profile','QYm5NATKa6MGD87UpNZCTl6IolX2'])">Chat with Nicolas</div>
    </div>
    <div *ngIf="id=='all'" style="clear:both;background:#f2f2f2;font-size:16px;padding:5px 15px 5px 15px">Team wide messages</div>
    <div *ngIf="id=='all'" class="seperator" style="width:100%;margin:0px"></div>
    <div *ngIf="id!='all'">
      <div style="clear:both;background-color:#f4f7fc"
      [ngClass]="UI.isContentAccessible(focusUserLastMessageObj?.user)?'clear':'encrypted'">
        <div style="float:left">
          <img [src]="focusUserLastMessageObj?.imageUrlThumbUser" style="display:inline;float:left;margin:7px;object-fit:cover;width:75px;height:75px;border-radius:50%">
        </div>
        <div style="padding:10px">
          <div style="clear:both;color:#222">
            <div style="float:left">
              <span >{{focusUserLastMessageObj?.name}}</span>
              <span style="font-size:10px"> {{focusUserLastMessageObj?.familyName}}</span>
              <span *ngIf="focusUserLastMessageObj?.PERRINN?.wallet?.balance>0" style="color:white;background-color:green;padding:2px 4px 2px 4px;border-radius:3px;font-size:10px;margin:5px">Member</span>
            </div>
            <img *ngIf="focusUserLastMessageObj?.PERRINN?.wallet?.balance>0" src="./../assets/App icons/driveLogo.png" style="float:left;width:15px;margin:5px;cursor:pointer" onclick="window.open('https://drive.google.com/drive/u/1/folders/1qvipN1gs1QS4sCh1tY8rSSFXV5S0-uR3','_blank')">
            <img *ngIf="focusUserLastMessageObj?.PERRINN?.wallet?.balance>0" src="./../assets/App icons/onshapeLogo.png" style="float:left;width:15px;margin:5px;cursor:pointer" onclick="window.open('https://cad.onshape.com/documents?nodeId=31475a51a48fbcc9cfc7e244&resourceType=folder','_blank')">
            <div *ngIf="UI.currentUser!=focusUserLastMessageObj?.user" (click)="newMessageToUser()" style="float:right;font-size:10px;padding:2px 4px 2px 4px;color:#4287f5;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer">New message to {{focusUserLastMessageObj?.name}}</div>
          </div>
          <div style="clear:both">
            <div style="float:left;font-size:10px;color:#666">{{focusUserLastMessageObj?.userEmail}}</div>
            <div style="clear:both;float:left;font-size:17px;color:green;margin-right:5px">{{(focusUserLastMessageObj?.PERRINN?.wallet?.balance||0)|number:'1.2-2'}}</div>
            <div style="float:left;font-size:10px;color:green;line-height:25px">COINS</div>
            <div style="clear:both;float:left;font-size:10px;color:#999">Created {{focusUserLastMessageObj?.createdTimestamp|date:'MMMM yyyy'}}, {{focusUserLastMessageObj?.userChain?.index}} Messages, {{focusUserLastMessageObj?.membership?.daysTotal|number:'1.1-1'}} Membership days, Verified {{((nowSeconds-focusUserLastMessageObj?.verifiedTimestamp?.seconds)/3600/24)|number:'1.2-2'}} days ago</div>
          </div>
        </div>
        <div class="seperator" style="width:100%;margin:0px"></div>
      </div>
    </div>
    <div class="spinner" *ngIf="UI.loading">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
    <ul class="listLight">
      <li *ngFor="let message of lastMessages|async;let last=last"
        (click)="router.navigate(['chat',message.payload.doc.data()?.chain])"
        [ngClass]="UI.isContentAccessible(message.payload.doc.data().user)?'clear':'encrypted'">
        <div style="float:left;min-width:60px;min-height:40px">
          <img [src]="message.payload.doc.data()?.imageUrlThumbUser" style="display:inline;float:left;margin: 7px 10px 7px 10px;object-fit:cover;height:40px;width:40px;border-radius:50%">
        </div>
        <div>
          <div style="clear:both;float:left;margin-top:5px;color:#111;font-size:14px">{{message.payload.doc.data()?.name}}</div>
          <div style="float:left;margin-top:5px;margin-left:5px;color:#111;font-size:11px">{{message.payload.doc.data()?.recipientList.length>1?'+'+(message.payload.doc.data()?.recipientList.length-1):''}}</div>
          <div *ngIf="(nowSeconds-message.payload.doc.data()?.serverTimestamp?.seconds)>43200" style="float:right;margin-top:5px;color:#999;font-size:11px;margin-right:10px;width:75px">{{(message.payload.doc.data()?.serverTimestamp?.seconds*1000)|date:'d MMM yyyy'}}</div>
          <div *ngIf="(nowSeconds-message.payload.doc.data()?.serverTimestamp?.seconds)<=43200" style="float:right;margin-top:5px;color:#999;font-size:11px;margin-right:10px;width:75px">{{(message.payload.doc.data()?.serverTimestamp?.seconds*1000)|date:'HH:mm'}}</div>
          <div style="float:right;margin:9px 15px 0 0;width:12px;height:12px;border-radius:6px" *ngIf="message.payload.doc.data()?.reads==undefinied?true:!message.payload.doc.data()?.reads[UI.currentUser]" [style.background-color]="message.payload.doc.data()?.recipients?(message.payload.doc.data()?.recipients[UI.currentUser]==undefined?'lightblue':'red'):'lightblue'"></div>
          <div style="clear:right;margin-top:5px;font-size:14px;font-weight:bold;white-space:nowrap;width:60%;text-overflow:ellipsis">{{message.payload.doc.data()?.chatSubject}} </div>
          <div style="clear:both;white-space:nowrap;width:80%;text-overflow:ellipsis;color:#888">{{message.payload.doc.data()?.text}}{{(message.payload.doc.data()?.chatImageTimestamp!=''&&message.payload.doc.data()?.chatImageTimestamp!=undefined)?' (image)':''}}</div>
        </div>
        <div class="seperator"></div>
      </li>
    </ul>
  </div>
  `,
})
export class ProfileComponent {
  lastMessages:Observable<any[]>;
  nowSeconds:number;
  scrollTeam:string;
  focusUserLastMessageObj:any;
  id:string;

  constructor(
    public afAuth: AngularFireAuth,
    public afs: AngularFirestore,
    public router: Router,
    public UI: UserInterfaceService,
    private route: ActivatedRoute
  ) {
    this.id=''
    this.UI.loading=false
    this.nowSeconds=Date.now()/1000
    this.scrollTeam=''
    this.route.params.subscribe(params => {
      this.id=params.id
      afs.collection<any>('PERRINNMessages',ref=>ref.where('user','==',this.id).where('verified','==',true).orderBy('serverTimestamp','desc').limit(1)).valueChanges().subscribe(snapshot=>{
        this.focusUserLastMessageObj=snapshot[0];
      });
      this.refreshMessages();
    });
  }

  refreshMessages(){
    if(this.id=='all'){
      this.afAuth.user.subscribe((auth) => {
        this.lastMessages=this.afs.collection<any>('PERRINNMessages',ref=>ref
          .where('lastMessage','==',true)
          .orderBy('serverTimestamp','desc')
          .limit(30)
        ).snapshotChanges();
      });
    }
    else{
      this.afAuth.user.subscribe((auth) => {
        this.lastMessages=this.afs.collection<any>('PERRINNMessages',ref=>ref
          .where('recipientList','array-contains',this.id)
          .where('lastMessage','==',true)
          .orderBy('serverTimestamp','desc')
          .limit(30)
        ).snapshotChanges();
      });
    }
  }

  showFullScreenImage(src) {
    const fullScreenImage = document.getElementById('fullScreenImage') as HTMLImageElement;
    fullScreenImage.src = src;
    fullScreenImage.style.visibility = 'visible';
  }

  objectToArray(obj) {
    if (obj == null) { return []; }
    return Object.keys(obj).map(function(key) {
      return [key, obj[key]];
    });
  }

  newMessageToUser() {
    let ID=this.newId()
    this.UI.createMessage({
      text:'Starting a new chat.',
      chain:ID,
      recipientList:[this.focusUserLastMessageObj.user]
    })
    this.router.navigate(['chat',ID])
  }

  newId():string{
    const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let autoId=''
    for(let i=0;i<20;i++){
      autoId+=chars.charAt(Math.floor(Math.random()*chars.length))
    }
    return autoId
  }

}
