'use strict';

class Avatar {
    constructor(head, id, leftController, rightController){
        this.playerid = id;
        this.headset = head;
        this.leftController = leftController;
        this.rightController = rightController;
        //TODO: Do we really want this to be the default?
        this.mode = MR.UserType.browser; 
    }
}

class Headset {
    constructor(verts) {
        this.vertices = verts;
        this.position = [0,0,0];
        this.orientation = [0,0,0,0];
    }
}

class Controller {
  constructor(verts) {
    this.vertices = verts;
    this.position = [0,0,0];
    this.orientation = [0,0,0,0];
    this.analog = new Button();
    this.trigger = new Button();
    this.side = new Button();
    this.x = new Button();
    this.y = new Button();
  }  
}

class Button {
     //buttons have a 'pressed' variable that is a boolean.
        /*A quick mapping of the buttons:
          0: analog stick
          1: trigger
          2: side trigger
          3: x button
          4: y button
          5: home button
        */
    constructor(){
        this.pressed = false;
    }
}
