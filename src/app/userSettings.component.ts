import { Component } from '@angular/core';
import { AngularFireDatabase, FirebaseObjectObservable, FirebaseListObservable } from 'angularfire2/database';
import { AngularFireAuth } from 'angularfire2/auth';
import { Observable } from 'rxjs/Observable';
import * as firebase from 'firebase/app';
import { Router, ActivatedRoute } from '@angular/router'
import { userInterfaceService } from './userInterface.service';
import { databaseService } from './database.service';

@Component({
  selector: 'userSettings',
  template: `
  <div class="sheet" style="background-color:#f5f5f5">
  <div class="buttonDiv" style="color:red" (click)="this.logout();router.navigate(['login']);">logout</div>
  <div class="title">Teams</div>
  <ul class="listLight">
    <li style="cursor:default" *ngFor="let team of userTeams | async"
      [class.selected]="team.$key === UI.currentTeam">
      <div *ngIf="DB.getUserFollowing(UI.focusUser,team.$key)">
      <div style="width:300px;float:left">
      <img (error)="errorHandler($event)" [src]="DB.getTeamPhotoThumb(team.$key)" style="display: inline; float: left; margin: 7px 10px 7px 10px;object-fit:cover;height:20px;width:30px;border-radius:3px">
      <div style="float:left;margin-top:10px;color:#222">{{DB.getTeamName(team.$key)}}{{(DB.getTeamLeader(team.$key,UI.focusUser)?" *":"")}}</div>
      </div>
      <div style="width:100px;height:30px;float:left">
      <div *ngIf="!DB.getTeamLeader(team.$key,UI.focusUser)" class="buttonDiv" style="font-size:11px;color:red" (click)="db.object('userTeams/'+UI.currentUser+'/'+team.$key).update({following:false})">Stop following</div>
      </div>
      <div class="seperator"></div>
      </div>
    </li>
  </ul>
  </div>
  `,
})
export class UserSettingsComponent {
  userTeams: FirebaseListObservable<any>;

  constructor(public afAuth: AngularFireAuth, public db: AngularFireDatabase, public router: Router, public UI: userInterfaceService, public DB: databaseService, private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      this.UI.focusUser = params['id'];
      this.UI.currentTeam="";
      this.userTeams=db.list('userTeams/'+this.UI.focusUser, {
        query:{
          orderByChild:'lastChatVisitTimestampNegative',
        }
      });
    });
  }

  logout() {
    this.afAuth.auth.signOut()
  }

  errorHandler(event) {
    event.target.src = "https://static1.squarespace.com/static/5391fac1e4b07b6926545c34/t/54b948f4e4b0567044b6c023/1421428991081/";
  }

}
