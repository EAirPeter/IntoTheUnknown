"use strict";

function clamp(val,min_,max_){return Math.max(min_,Math.min(max_,val));}

export class BasicFirstPerson {
    constructor(args) {
        this.startPosition   = args.startPosition || [0.0, 0.0, 5.0];
        this.position        = args.position || [
            this.startPosition[0], 
            this.startPosition[1], 
            this.startPosition[2]
        ];

        this.velocity        = args.velocity || [0, 0, 0];
        this.angle           = args.angle || 0.0;
        this.angularVelocity = args.angularVelocity || 0.0;
        this.accleration     = args.accleration || 100.0;
        this.angularAcceleration = args.angularAcceleration || 20;
        this.maxSpeed        = args.maxSpeed || 28;

        this.rotateX = 0;
        this.rotateY = 0;
    }

    updateWithCursor(deltaTime, friction, left_, right_, up_, down_, vertical_, xRes, yRes, cx, cy) {

        // mouse controls
        let yRot = -0.5 * Math.PI * (((cx / xRes) * 2) - 1)
        let xRot = (0.5 * Math.PI * (((cy / yRes) * 2) - 1));

        const dist2 = (xRot * xRot) + (yRot * yRot);

        if (dist2 < 0.1 * 0.1) {
            yRot = 0.0;
            xRot = 0.0;
        }

        this.update(deltaTime, friction, left_, right_, up_, down_, vertical_, xRot, yRot);
    }
    update(deltaTime, friction, left_, right_, up_, down_, vertical_, rotateX, rotateY) {
        this.rotateX = rotateX || 0.0;
        this.rotateY = rotateY || 0.0;

        let up        = 0;
        let down      = 0;
        let left      = left_;
        let right     = right_;
        let forward   = up_;
        let backward  = down_;

        const v = this.velocity;
        const ACC = this.accleration;

        if (vertical_) {
            up       = -forward;
            down     = -backward;
            forward  = 0;
            backward = 0;

            const hz = left + right;
            const vt = up + down;
            const hypo = Math.sqrt((hz * hz) + (vt * vt));
        
            const hcomp = ACC * (hz / hypo);
            const vcomp = ACC * (vt / hypo);

            v[1] += ACC * vt * deltaTime;            
        } else {
            const hz = left + right;
            this.angularVelocity += this.angularAcceleration * hz * deltaTime;

            this.angle += this.angularVelocity * deltaTime;
            let az = Math.cos(this.angle);
            let ax = Math.sin(this.angle);

            const vt = (forward + backward);

            if (vt != 0.0) {
                const hcomp = ACC * ax * vt;
                const vcomp = ACC * az * vt;

                v[0] -= hcomp * deltaTime;
                v[2] += vcomp * deltaTime;
            }
        }

        // clamp speed
        const MAX_SPEED = this.maxSpeed;
        v[0] = clamp(v[0], -MAX_SPEED, MAX_SPEED);
        v[1] = clamp(v[1], -MAX_SPEED, MAX_SPEED);
        v[2] = clamp(v[2], -MAX_SPEED, MAX_SPEED);
        
        // apply drag
        const drag = Math.pow(friction, deltaTime);
        v[0] *= drag;
        v[1] *= drag;
        v[2] *= drag;
        this.angularVelocity *= drag;

        const pos = this.position;
        pos[0] += v[0] * deltaTime;
        pos[1] += v[1] * deltaTime;
        pos[2] += v[2] * deltaTime;
    }

    updateUsingDefaults(deltaTime, FRICTION, Input, cursor, cvs) {
        if (Input.keyWentDown(Input.KEY_ZERO)) {
            this.reset();
            return;
        }

        // look-around with mouse cursor
        if (cursor.z()) {
            // press down the mouse cursor to look around in the non-VR view
            const cpos = cursor.position();
            this.updateWithCursor(
                deltaTime,
                FRICTION,
                -Input.keyIsDown(Input.KEY_LEFT),
                 Input.keyIsDown(Input.KEY_RIGHT),
                -Input.keyIsDown(Input.KEY_UP),
                 Input.keyIsDown(Input.KEY_DOWN),
                 Input.keyIsDown(Input.KEY_SHIFT),
                 cvs.width,
                 cvs.height,
                 cpos[0],
                 cpos[1]
            );
        } 
        else {
            this.update(
                deltaTime,
                FRICTION,
                -Input.keyIsDown(Input.KEY_LEFT),
                 Input.keyIsDown(Input.KEY_RIGHT),
                -Input.keyIsDown(Input.KEY_UP),
                 Input.keyIsDown(Input.KEY_DOWN),
                 Input.keyIsDown(Input.KEY_SHIFT),
            );
        }
    }

    reset() {
        this.position[0] = this.startPosition[0];
        this.position[1] = this.startPosition[1];
        this.position[2] = this.startPosition[2];
        this.angle = 0.0;
        this.angularVelocity = 0.0;
        this.velocity[0] = 0.0;
        this.velocity[1] = 0.0;
        this.velocity[2] = 0.0;
        this.rotateX = 0;
        this.rotateY = 0;
    }
}
