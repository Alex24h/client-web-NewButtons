import { Component } from '@angular/core'
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Router, ActivatedRoute } from '@angular/router'
import { UserInterfaceService } from './userInterface.service'
import { AngularFireStorage } from '@angular/fire/storage'
import * as firebase from 'firebase/app'

@Component({
  selector: 'chat',
  template: `

  <div class="sheet">
    <div class="fixed" style="background:whitesmoke;color:#444;font-size:12px;cursor:pointer" (click)="showChatDetails=!showChatDetails">
      <div *ngIf="!showChatDetails" style="float:left;margin:0 5px 0 10px;min-height:40px">
        <div>
          <span *ngIf="chatLastMessageObj?.isLog" class="material-icons" style="float:left;font-size:15px;margin:2px 5px 0 0;color:rgba(0,0,0,0.6)">fact_check</span>
          <div style="float:left;font-weight:bold">{{chatLastMessageObj?.chatSubject}} </div>
        </div>
        <span *ngFor="let recipient of chatLastMessageObj?.recipientList;let last=last">{{recipient==UI.currentUser?'You':chatLastMessageObj?.recipients[recipient]?.name}}{{last?"":", "}}</span>
        <div *ngIf="math.floor(eventDate/60000-UI.nowSeconds/60)>-60" style="clear:both">
          <span class="material-icons-outlined" style="float:left;font-size:20px;margin-right:5px;color:rgba(0,0,0,0.6)">event</span>
          <div [style.background-color]="(math.floor((eventDate/1000-UI.nowSeconds)/60)>60*8)?'midnightblue':'red'" style="float:left;color:white;padding:0 5px 0 5px">in {{secondsToDhmDetail2(eventDate/1000-UI.nowSeconds)}}</div>
          <div *ngIf="math.floor(eventDate/60000-UI.nowSeconds/60)<=0&&math.floor(eventDate/60000-UI.nowSeconds/60)>-60" style="float:left;background-color:red;color:white;padding:0 5px 0 5px">Now</div>
          <div style="float:left;margin:0 5px 0 5px">{{eventDescription}}</div>
          <div style="float:left;margin:0 5px 0 0">{{eventDate|date:'EEEE d MMM HH:mm'}}</div>
        </div>
        <div *ngIf="(math.floor(UI.nowSeconds/3600/24-survey?.createdTimestamp/3600000/24)<7)&&survey?.createdTimestamp" style="clear:both">
          <span class="material-icons-outlined" style="float:left;font-size:20px;margin-right:5px;color:rgba(0,0,0,0.6)">poll</span>
          <div [style.background-color]="(math.floor(7*24-UI.nowSeconds/3600+survey.createdTimestamp/3600000)>8)?'midnightblue':'red'" style="float:left;color:white;padding:0 5px 0 5px">{{secondsToDhmDetail2(7*24*3600-UI.nowSeconds+survey.createdTimestamp/1000)}} left</div>
          <div style="float:left;margin:0 5px 0 5px">{{survey.question}}</div>
          <span *ngFor="let answer of survey.answers;let last=last" [style.font-weight]="answer?.votes.includes(UI.currentUser)?'bold':'normal'" style="float:left;margin:0 5px 0 5px">{{answer.answer}} ({{(answer.votes.length/survey.totalVotes)|percent:'1.0-0'}})</span>
          <span style="float:left;margin:0 5px 0 5px">{{survey.totalVotes}} vote{{survey.totalVotes>1?'s':''}}</span>
          <div *ngIf="!chatLastMessageObj?.recipients[UI.currentUser]?.voteIndexPlusOne" style="clear:both;color:red;margin:0 5px 0 5px">vote now</div>
        </div>
      </div>
      <div *ngIf="showChatDetails" style="background:whitesmoke">
        <div style="float:left;font-size:12px;line-height:20px;margin:10px;color:midnightblue;cursor:pointer">< messages</div>
      </div>
      <div class="seperator" style="width:100%;margin:0px"></div>
    </div>
  </div>


  <div class="sheet" *ngIf="showChatDetails" style="padding-top:40px">
    <input [(ngModel)]="chatSubject" style="width:60%;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" placeholder="What is the subject of this chat?">
    <div *ngIf="chatLastMessageObj?.chatSubject!=chatSubject&&chatSubject" style="float:right;width:75px;height:20px;text-align:center;line-height:18px;font-size:10px;margin:10px;color:white;background-color:midnightblue;border-radius:3px;cursor:pointer" (click)="saveNewSubject()">Save</div>
    <div class="seperator" style="width:100%;margin:0px"></div>
    <ul style="color:#333;margin:10px">
      <li *ngFor="let recipient of chatLastMessageObj?.recipientList" style="float:left"
     >
        <div style="float:left;cursor:pointer" (click)="router.navigate(['profile',recipient])">
          <img [src]="chatLastMessageObj?.recipients[recipient]?.imageUrlThumb" style="float:left;object-fit:cover;height:25px;width:25px;border-radius:50%;margin:3px 3px 3px 10px">
          <div style="float:left;margin:10px 5px 3px 3px;font-size:12px;line-height:10px;font-family:sans-serif">{{chatLastMessageObj?.recipients[recipient]?.name}}</div>
        </div>
        <div style="float:left;cursor:pointer;font-weight:bold;margin:10px 15px 3px 3px;font-size:12px;line-height:10px;font-family:sans-serif;color:red" (click)="removeRecipient(recipient,chatLastMessageObj?.recipients[recipient]?.name,chatLastMessageObj?.recipients[recipient]?.familyName)">X</div>
      </li>
    </ul>
    <input style="width:60%;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" maxlength="500" (keyup)="refreshSearchLists()" [(ngModel)]="searchFilter" placeholder="Add people">
    <ul class="listLight">
      <li *ngFor="let team of teams | async">
        <div *ngIf="!(chatLastMessageObj?.recipients||{})[team.key]" style="padding:5px">
          <div style="float:left;width:175px">
            <img [src]="team?.values?.imageUrlThumbUser" style="display:inline;float:left;margin: 0 5px 0 10px;opacity: 1;object-fit:cover;height:25px;width:25px;border-radius:50%">
            <span>{{team.values?.name}}</span>
            <span style="font-size:10px"> {{team.values?.familyName}}</span>
          </div>
          <div class="buttonDiv" style="float:left;width:50px;font-size:11px;background-color:midnightblue;color:white;border-style:none" (click)="addRecipient(team.values.user,team.values.name,team.values.familyName)">Add</div>
        </div>
      </li>
    </ul>
    <div class="seperator" style="width:100%;margin:0px"></div>
    <div *ngIf="chatLastMessageObj?.recipientList&&chatLastMessageObj?.recipientList.length!=2" style="font-size:10px;margin:10px;color:#777">To send COINS, chat must be between you and 1 other user only.</div>
    <div *ngIf="chatLastMessageObj?.recipientList&&chatLastMessageObj?.recipientList.length==2&&chatLastMessageObj?.recipientList.includes(UI.currentUser)">
      <div style="font-size:12px;margin:10px;color:#777">Send COINS to {{(chatLastMessageObj?.recipientList[0]==UI.currentUser)?(chatLastMessageObj?.recipients[chatLastMessageObj?.recipientList[1]].name):(chatLastMessageObj?.recipients[chatLastMessageObj?.recipientList[0]].name)}}</div>
      <input style="width:100px;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" maxlength="500" (keyup)="inputsValid=checkInputs()" [(ngModel)]="amount" placeholder="Amount">
      <input style="width:150px;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" maxlength="500" [(ngModel)]="code" placeholder="Code (optional)">
      <div *ngIf="amount>0&&amount<=UI.currentUserLastMessageObj?.wallet?.balance" style="clear:both;width:200px;height:20px;text-align:center;line-height:18px;font-size:10px;margin:10px;color:midnightblue;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer" (click)="sendCoins(amount,code)">
        Send {{amount}} Coins to {{(chatLastMessageObj?.recipientList[0]==UI.currentUser)?(chatLastMessageObj?.recipients[chatLastMessageObj?.recipientList[1]].name):(chatLastMessageObj?.recipients[chatLastMessageObj?.recipientList[0]].name)}}
      </div>
    </div>
    <div class="seperator" style="width:100%;margin:0px"></div>
    <div>
      <input style="width:60%;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" maxlength="200" [(ngModel)]="eventDescription" placeholder="Event description">
      <div style="font-size:12px;margin:10px;color:midnightblue">{{eventDate==0?'':eventDate|date:'EEEE d MMM HH:mm'}}</div>
      <div *ngIf="eventDate!=chatLastMessageObj?.eventDate||eventDescription!=chatLastMessageObj?.eventDescription" style="clear:both;width:100px;height:20px;text-align:center;line-height:18px;font-size:10px;margin:10px;color:midnightblue;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer" (click)="saveEvent()">Save event</div>
      <ul class="listLight" style="float:left;width:200px;margin:10px">
        <li *ngFor="let date of eventDates;let first=first" (click)="first?eventDate=date:eventDate=(date+(eventDate/3600000/24-math.floor(eventDate/3600000/24))*3600000*24)" [class.selected]="math.floor(date/3600000/24)==math.floor(eventDate/3600000/24)">
          <div *ngIf="math.round(date/3600000/24)==(date/3600000/24)||first" style="float:left;width:100px;min-height:10px">{{date|date:'EEEE'}}</div>
          <div *ngIf="math.round(date/3600000/24)==(date/3600000/24)||first" style="float:left;min-height:10px">{{date|date:'d MMM'}}</div>
        </li>
      </ul>
      <ul class="listLight" style="clear:none;float:left;width:100px;text-align:center;margin:10px">
        <li *ngFor="let date of eventDates;let first=first" (click)="eventDate=date" [class.selected]="eventDate==date">
          <div *ngIf="math.floor(date/3600000/24)==math.floor(eventDate/3600000/24)">{{date|date:'HH:mm'}}</div>
        </li>
      </ul>
    </div>
    <div class="seperator" style="width:100%;margin:0px"></div>
    <div>
      <input style="width:80%;margin:10px;border:0;background:none;box-shadow:none;border-radius:0px" maxlength="200" [(ngModel)]="survey.question">
      <div style="clear:both;width:100px;height:20px;text-align:center;line-height:18px;font-size:10px;margin:10px;color:midnightblue;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer" (click)="saveSurvey()">Save survey</div>
      <ul class="listLight" style="margin:10px">
        <li *ngFor="let answer of survey.answers;let i=index">
          <div>
            <div style="float:left;width:50px;margin:15px 5px 5px 0px">
              <div *ngIf="!answer?.votes.includes(UI.currentUser)" style="width:100%;height:20px;text-align:center;line-height:18px;font-size:10px;color:midnightblue;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer" (click)="voteSurvey(i)">Vote</div>
            </div>
            <input style="float:left;width:70%;border:0;background:none;box-shadow:none;border-radius:0px" [style.font-weight]="answer?.votes.includes(UI.currentUser)?'bold':'normal'" [(ngModel)]="survey.answers[i].answer">
          </div>
          <span *ngFor="let user of answer?.votes;let last=last">{{user==UI.currentUser?'You':chatLastMessageObj?.recipients[user]?.name}}{{last?"":", "}}</span>
        </li>
      </ul>
    </div>
    <div style="width:75px;margin:10px;height:20px;text-align:center;line-height:18px;font-size:10px;color:midnightblue;border-style:solid;border-width:1px;border-radius:3px;cursor:pointer" (click)="survey.answers.push({answer:'new answer',votes:[]})">Add answer</div>
    <div class="seperator" style="width:100%;margin-bottom:150px"></div>
  </div>

  <div class="sheet" id="chat_window" style="overflow-y:auto;height:100%" *ngIf="!showChatDetails" scrollable>
    <div class="spinner" *ngIf="UI.loading">
      <div class="bounce1"></div>
      <div class="bounce2"></div>
      <div class="bounce3"></div>
    </div>
    <div>
      <ul style="list-style:none;">
        <li *ngFor="let message of messages|async;let first=first;let last=last;let i=index">
          <div *ngIf="isMessageNewTimeGroup(message.payload?.serverTimestamp||{seconds:UI.nowSeconds*1000})||first" style="padding:50px 15px 15px 15px">
            <div *ngIf="first" style="color:midnightblue;width:200px;padding:15px;margin:0 auto;text-align:center;cursor:pointer" (click)="loadMore()">Load more</div>
            <div style="border-color:#bbb;border-width:1px;border-style:solid;color:#404040;background-color:#e9e8f9;width:200px;padding:5px;margin:0 auto;text-align:center;border-radius:3px">{{(message.payload?.serverTimestamp?.seconds*1000)|date:'fullDate'}}</div>
          </div>
          <div *ngIf="isMessageNewUserGroup(message.payload?.user,message.payload?.serverTimestamp||{seconds:UI.nowSeconds*1000})||first" style="clear:both;width:100%;height:15px"></div>
          <div *ngIf="message.payload?.imageUrlThumbUser&&(isMessageNewUserGroup(message.payload?.user,message.payload?.serverTimestamp||{seconds:UI.nowSeconds*1000})||first)" style="float:left;width:60px;min-height:10px">
            <img [src]="message.payload?.imageUrlThumbUser" style="cursor:pointer;display:inline;float:left;margin:10px;border-radius:50%; object-fit:cover; height:35px; width:35px" (click)="router.navigate(['profile',message.payload?.user])">
          </div>
          <div [style.background-color]="(message.payload?.user==UI.currentUser)?'#daebda':'white'" style="cursor:text;border-style:solid;border-width:1px;color:#ccc;margin:2px 10px 5px 60px">
            <div>
              <div *ngIf="isMessageNewUserGroup(message.payload?.user,message.payload?.serverTimestamp||{seconds:UI.nowSeconds*1000})||first">
                <div style="color:#777;font-size:12px;font-weight:bold;display:inline;float:left;margin:0px 10px 0px 5px">{{message.payload?.name}}</div>
                <div *ngIf="(UI.nowSeconds-message.payload?.serverTimestamp?.seconds)>43200" style="color:#777;font-size:11px;margin:0px 10px 0px 10px">{{(message.payload?.serverTimestamp?.seconds*1000)|date:'HH:mm'}}</div>
                <div *ngIf="(UI.nowSeconds-message.payload?.serverTimestamp?.seconds)<=43200" style="color:#777;font-size:11px;margin:0px 10px 0px 10px">{{secondsToDhmDetail1(math.max(0,(UI.nowSeconds-message.payload?.serverTimestamp?.seconds)))}}</div>
              </div>
              <div style="float:left;color:#404040;margin:5px 5px 0 5px" [innerHTML]="message.payload?.text | linky"></div>
              <div style="clear:both;text-align:center">
                <img class="imageWithZoom" *ngIf="message.payload?.chatImageTimestamp" [src]="message.payload?.chatImageUrlMedium" style="clear:both;width:70%;max-height:320px;object-fit:contain;margin:5px 10px 5px 5px;border-radius:3px" (click)="showFullScreenImage(message.payload?.chatImageUrlOriginal)">
              </div>
              <div *ngIf="messageShowDetails.includes(message.key)" style="margin:5px">
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">userStatus: {{message.payload?.userStatus|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">userChain: {{message.payload?.userChain|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">transactionOut: {{message.payload?.transactionOut|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">transactionIn: {{message.payload?.transactionIn|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">messagingCost: {{message.payload?.messagingCost|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">COIN purchase: {{message.payload?.purchaseCOIN|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">interest: {{message.payload?.interest|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">membership: {{message.payload?.membership|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">contract: {{message.payload?.contract|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">wallet: {{message.payload?.wallet|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">survey: {{message.payload?.survey|json}}</div>
                <div class="seperator" style="width:100%"></div>
                <div style="color:#666;font-size:10px">{{message.payload|json}}</div>
              </div>
            </div>
            <div class='messageFooter' style="cursor:pointer;clear:both;height:15px" (click)="messageShowActions.includes(message.key)?messageShowActions.splice(messageShowActions.indexOf(message.key),1):messageShowActions.push(message.key)">
              <div style="float:left;width:100px;text-align:right;line-height:10px">...</div>
              <span *ngIf="message.payload?.verified" class="material-icons" style="float:right;font-size:15px;margin:0 2px 2px 0;color:green">done</span>
              <span *ngIf="message.payload?.contract?.amount>0" style="float:right;font-size:10px;margin:0 5px 2px 0;line-height:15px;color:green">+{{UI.formatCOINS(message.payload?.contract?.amount)}}</span>
              <span *ngIf="message.payload?.userChain?.nextMessage=='none'&&message.payload?.wallet?.balance!=undefined" style="float:right;font-size:10px;margin:0 5px 2px 0;line-height:15px;color:#999">{{UI.formatCOINS(message.payload?.wallet?.balance)}}</span>
            </div>
            <div *ngIf="messageShowActions.includes(message.key)">
              <div style="float:left;padding:5px;color:#777;cursor:pointer;border-color:#ddd;border-style:solid;border-width:1px 1px 0 0" (click)="messageShowDetails.includes(message.key)?messageShowDetails.splice(messageShowDetails.indexOf(message.key),1):messageShowDetails.push(message.key)">Details</div>
            </div>
          </div>
          <div *ngIf="leftHere==message.key" style="margin:0 auto;text-align:center;color:#404040;font-size:12px;margin:35px 0 35px 0;background-color:#f4f7fc;border-style:solid;border-color:#bbb;border-width:1px 0 1px 0">Left here</div>
          {{storeMessageValues(message.payload)}}
          {{(last||i==(messageNumberDisplay-1))?scrollToBottom(message.payload?.serverTimestamp?.seconds):''}}
        </li>
      </ul>
      <div style="height:100px;width:100%"></div>
    </div>
  </div>

  <div class="sheet">
    <div class="fixed" style="bottom:0">
      <div *ngIf="chatLastMessageObj?.chatSubject==null" style="margin:5px;font-size:10px">This message will be the subject of this chat.</div>
      <span *ngFor="let recipient of draftRecipientNamesList" style="margin:5px;font-size:10px">+{{recipient}} </span>
      <div class="seperator" style="width:100%"></div>
      <div style="clear:both;float:left;width:90%">
        <textarea id="inputMessage" autocapitalize="none" style="float:left;width:95%;border-style:solid;border-width:0 1px 0 0;border-color:#ddd;padding:9px;resize:none;overflow-y:scroll" maxlength="500" (keyup)="messageInputKeyUp()" (keyup.enter)="addMessage()" [(ngModel)]="draftMessage" placeholder="Reply all"></textarea>
      </div>
      <div *ngIf="draftMessage" style="float:right;width:10%;cursor:pointer">
        <span class="material-icons-outlined" style="margin:15px 5px 5px 5px;font-size:30px;color:rgba(0,0,0,0.6)" (click)="addMessage()">send</span>
      </div>
      <div *ngIf="!draftMessage" style="float:right;width:10%;cursor:pointer">
        <input type="file" name="chatImage" id="chatImage" class="inputfile" (change)="onImageChange($event)" accept="image/*">
        <label class="buttonUploadImage" for="chatImage" id="buttonFile">
        <span class="material-icons-outlined" style="margin:15px 5px 5px 5px;font-size:30px;color:rgba(0,0,0,0.6)">photo_camera</span>
        </label>
      </div>
    </div>
  </div>
    `
})
export class ChatComponent {
  draftMessage:string
  draftRecipientList:any
  draftRecipientNamesList:any
  imageTimestamp:string
  imageDownloadUrl:string
  messageNumberDisplay:number
  lastChatVisitTimestamp:number
  scrollMessageTimestamp:number
  previousMessageServerTimestamp:any
  previousMessageUser:string
  messageShowDetails:[]
  messages:Observable<any[]>
  teams:Observable<any[]>
  searchFilter:string
  reads:any[]
  chatSubject:string
  chatLastMessageObj:any
  chatChain:string
  showChatDetails:boolean
  math:any
  eventDates:any
  eventDate:any
  eventDescription:string
  surveyDefault:any
  survey:any
  messageShowActions:[]
  leftHere:string

  constructor(
    public afs: AngularFirestore,
    public router: Router,
    public UI: UserInterfaceService,
    private route: ActivatedRoute,
    private storage: AngularFireStorage,
  ) {
    this.math=Math
    this.UI.loading=true
    this.reads=[]
    this.route.params.subscribe(params=>{
      this.leftHere=null
      this.chatChain=params.id
      this.messageShowActions=[]
      this.messageShowDetails=[]
      this.chatLastMessageObj={}
      this.previousMessageServerTimestamp={seconds:this.UI.nowSeconds*1000}
      this.previousMessageUser=''
      this.messageNumberDisplay=15
      this.chatSubject=''
      this.eventDescription=''
      this.surveyDefault={
        question:'Survey question',
        answers:[
          {answer:'Answer A',votes:[]},
          {answer:'Answer B',votes:[]},
          {answer:'Answer C',votes:[]}
        ]
      }
      this.survey=this.surveyDefault
      this.refreshMessages(params.id)
      this.refreshEventDates()
      this.resetChat()
    })
  }

  ngOnInit() {
    this.refreshSearchLists()
  }

  loadMore() {
    this.UI.loading=true
    this.messageNumberDisplay+=15
    this.refreshMessages(this.chatLastMessageObj.chain||this.chatChain)
  }

  refreshEventDates(){
    var i
    this.eventDates=[]
    for(i=0;i<500;i++){
      this.eventDates[i]=(Math.ceil(this.UI.nowSeconds/3600)+i)*3600000
    }
  }

  messageInputKeyUp(){
    let words=this.draftMessage.split(" ")
    if(words.length<2)return
    let indexFound=[]
    let searchNameDraft1=words[words.length-2]
    let searchNameDraft2=words[words.length-1]
    if(searchNameDraft1.length<3||!searchNameDraft2)return
    this.UI.searchNameIndex.forEach((value,index)=>{
      if(value.search(new RegExp(searchNameDraft1,"i"))==0&&(value.split(' ').slice(1).join(' ')).search(new RegExp(searchNameDraft2,"i"))==0)indexFound.push(index)
    })
    if(indexFound.length!=1)return
    if(!this.draftRecipientList.includes(this.UI.userObjectIndex[indexFound[0]].user)&&!((this.chatLastMessageObj||{}).recipientList||[]).includes(this.UI.userObjectIndex[indexFound[0]].user)){
      this.draftRecipientList.push(this.UI.userObjectIndex[indexFound[0]].user)
      this.draftRecipientNamesList.push(this.UI.userObjectIndex[indexFound[0]].name+' '+this.UI.userObjectIndex[indexFound[0]].familyName)
    }
  }

  refreshMessages(chain) {
    this.messages=this.afs.collection('PERRINNMessages',ref=>ref
      .where('chain','==',chain)
      .orderBy('serverTimestamp','desc')
      .limit(this.messageNumberDisplay)
    ).snapshotChanges().pipe(map(changes=>{
      this.UI.loading=false
      var batch=this.afs.firestore.batch()
      var nextMessageRead=true
      changes.forEach(c=>{
        if(!this.leftHere&&!nextMessageRead&&(c.payload.doc.data()['reads']||[])[this.UI.currentUser])this.leftHere=c.payload.doc.id
        nextMessageRead=(c.payload.doc.data()['reads']||[])[this.UI.currentUser]
        if(c.payload.doc.data()['lastMessage']){
          if(!this.reads.includes(c.payload.doc.id))batch.set(this.afs.firestore.collection('PERRINNTeams').doc(this.UI.currentUser).collection('reads').doc(c.payload.doc.id),{serverTimestamp:firebase.firestore.FieldValue.serverTimestamp()},{merge:true})
          this.reads.push(c.payload.doc.id)
          this.chatLastMessageObj=c.payload.doc.data()
          this.chatSubject=c.payload.doc.data()['chatSubject']
          this.eventDescription=c.payload.doc.data()['eventDescription']
          this.eventDate=c.payload.doc.data()['eventDate']
          this.survey=((c.payload.doc.data()['survey']||{})['createdTimestamp'])?c.payload.doc.data()['survey']:this.survey
        }
      })
      batch.commit()
      return changes.reverse().map(c=>({
        key:c.payload.doc.id,
        payload:c.payload.doc.data()
      }))
    }))
  }

  showFullScreenImage(src) {
    const fullScreenImage=document.getElementById('fullScreenImage') as HTMLImageElement
    fullScreenImage.src=src
    fullScreenImage.style.visibility='visible'
  }

  isMessageNewTimeGroup(messageServerTimestamp:any) {
    let isMessageNewTimeGroup:boolean
    isMessageNewTimeGroup=Math.abs(messageServerTimestamp.seconds - this.previousMessageServerTimestamp.seconds) > 60 * 60 * 4
    return isMessageNewTimeGroup
  }

  isMessageNewUserGroup(user: any, messageServerTimestamp: any) {
    let isMessageNewUserGroup:boolean
    isMessageNewUserGroup=Math.abs(messageServerTimestamp.seconds - this.previousMessageServerTimestamp.seconds) > 60 * 5 || (user != this.previousMessageUser)
    return isMessageNewUserGroup
  }

  storeMessageValues(message) {
    this.previousMessageUser=message.user
    this.previousMessageServerTimestamp=message.serverTimestamp||{seconds:this.UI.nowSeconds*1000}
  }

  scrollToBottom(scrollMessageTimestamp: number) {
    if (scrollMessageTimestamp != this.scrollMessageTimestamp) {
      const element=document.getElementById('chat_window')
      element.scrollTop=element.scrollHeight
      this.scrollMessageTimestamp=scrollMessageTimestamp
    }
  }

  saveNewSubject() {
    this.UI.createMessage({
      text:'Changing chat subject to: '+this.chatSubject+" (was: "+this.chatLastMessageObj.chatSubject+")",
      chain:this.chatLastMessageObj.chain||this.chatChain,
      chatSubject:this.chatSubject,
    })
    this.resetChat()
  }

  sendCoins(amount,code){
    let user=''
    if (this.chatLastMessageObj.recipientList[0]==this.UI.currentUser)user=this.chatLastMessageObj.recipientList[1]
    else user=this.chatLastMessageObj.recipientList[0]
    this.UI.createMessage({
      text:'sending '+amount+' COINS'+((code||null)?' using code ':'')+((code||null)?code:''),
      chain:this.chatLastMessageObj.chain||this.chatChain,
      transactionOut:{
        user:user,
        amount:amount,
        code:code||null
      }
    })
    this.resetChat()
  }

  saveEvent() {
    this.UI.createMessage({
      text:'new event',
      chain:this.chatLastMessageObj.chain||this.chatChain,
      eventDate:this.eventDate,
      eventDescription:this.eventDescription
    })
    this.resetChat()
  }

  saveSurvey() {
    this.UI.createMessage({
      text:'Survey saved',
      chain:this.chatLastMessageObj.chain||this.chatChain,
      survey:this.survey
    })
    this.resetChat()
  }

  voteSurvey(i) {
    this.UI.createMessage({
      text:'Survey vote: '+this.survey.answers[i].answer,
      chain:this.chatLastMessageObj.chain||this.chatChain,
      survey:{voteIndexPlusOne:i+1}
    })
    this.resetChat()
  }

  addMessage() {
    this.UI.createMessage({
      text:this.draftMessage,
      chain:this.chatLastMessageObj.chain||this.chatChain,
      recipientList:this.draftRecipientList,
      chatImageTimestamp:this.imageTimestamp,
      chatImageUrlThumb:this.imageDownloadUrl,
      chatImageUrlMedium:this.imageDownloadUrl,
      chatImageUrlOriginal:this.imageDownloadUrl
    })
    this.resetChat()
  }

  addRecipient(user,name,familyName) {
    this.UI.createMessage({
      text:'adding '+name+' '+(familyName||'')+' to this chat.',
      chain:this.chatLastMessageObj.chain||this.chatChain,
      recipientList:[user]
    })
    this.resetChat()
  }

  removeRecipient(user,name,familyName){
    this.UI.createMessage({
      text:'removing '+name+' '+(familyName||'')+' from this chat.',
      chain:this.chatLastMessageObj.chain||this.chatChain,
      recipientListToBeRemoved:[user]
    })
    this.resetChat()
  }

  onImageChange(event:any) {
    const image=event.target.files[0]
    const uploader=document.getElementById('uploader') as HTMLInputElement
    const storageRef=this.storage.ref('images/' + Date.now() + image.name)
    const task=storageRef.put(image)

    task.snapshotChanges().subscribe((snapshot)=>{
      document.getElementById('buttonFile').style.visibility='hidden'
      document.getElementById('uploader').style.visibility='visible'

      const percentage=(snapshot.bytesTransferred / snapshot.totalBytes) * 100
      uploader.value=percentage.toString()
    },
    (err:any)=>{
      document.getElementById('buttonFile').style.visibility='visible'
      document.getElementById('uploader').style.visibility='hidden'
      uploader.value='0'
    },
    ()=>{
      uploader.value='0'
      document.getElementById('buttonFile').style.visibility='visible'
      document.getElementById('uploader').style.visibility='hidden'
      this.imageTimestamp=task.task.snapshot.ref.name.substring(0, 13)
      storageRef.getDownloadURL().subscribe(url=>{
        this.imageDownloadUrl=url
        this.addMessage()
        event.target.value=''
      })
    })
  }

  refreshSearchLists() {
    if (this.searchFilter) {
      if (this.searchFilter.length > 1) {
        this.teams=this.afs.collection('PERRINNMessages', ref=>ref
        .where('userChain.nextMessage','==','none')
        .where('verified','==',true)
        .where('searchName','>=',this.searchFilter.toLowerCase())
        .where('searchName','<=',this.searchFilter.toLowerCase()+'\uf8ff')
        .orderBy('searchName')
        .limit(10))
        .snapshotChanges().pipe(map(changes=>{
          return changes.map(c=>({
            key:c.payload.doc.id,
            values:c.payload.doc.data()
          }))
        }))
      }
    } else {
      this.teams=null
    }
  }

  secondsToDhmDetail2(seconds){
    seconds= Number(seconds)
    var d=Math.floor(seconds/(3600*24))
    var h=Math.floor(seconds%(3600*24)/3600)
    var m=Math.floor(seconds%3600/60)
    var dDisplay=d>0?d+'d ':''
    var hDisplay=h>0?h+'h ':''
    var mDisplay=(m>=0&&d==0)?m+'m ':''
    return dDisplay+hDisplay+mDisplay
  }

  secondsToDhmDetail1(seconds){
    seconds= Number(seconds)
    var d=Math.floor(seconds/(3600*24))
    var h=Math.floor(seconds%(3600*24)/3600)
    var m=Math.floor(seconds%3600/60)
    var dDisplay=d>0?d+'d ':''
    var hDisplay=(h>0&&d==0)?h+'h ':''
    var mDisplay=(m>=0&&d==0&&h==0)?m+'m ':''
    return dDisplay+hDisplay+mDisplay
  }

  resetChat(){
    this.searchFilter=''
    this.teams=null
    this.draftMessage=''
    this.draftRecipientList=[]
    this.draftRecipientNamesList=[]
    this.imageTimestamp=''
    this.imageDownloadUrl=''
    this.showChatDetails=false
    this.messageShowDetails=[]
    this.messageShowActions=[]
  }

}
