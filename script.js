// ["load","resize"].forEach(function(e){
//     window.addEventListener(e,start);
// });

window.addEventListener("load",start);

function start(){
    let canvas = document.querySelector(".canvas");
    let ctx = canvas.getContext("2d");
    let inputDiv = document.querySelector("input");

    canvas.width = this.window.innerWidth
    canvas.height = this.window.innerHeight - 30;
    ctx.fillStyle = "black";
    ctx.font = "20px san-serif";

    const GameStatus={
        Lost:{
            status:"Game Over",
            message:"You Lost!"
        },
        Win:{
            status:"Game Over",
            message:"You Won!"
        },
        Pause:{
            status:"Paused",
            message:"Press 'p' to Resume the game"
        },
        Play:{
            status:"Play",
            message:"Press 'p' to Pause the game"
        }
    }
    
    class UI{
        constructor(score=0, lives=3, gameStatus=GameStatus.Play){
            this.x = 20;
            this.y = 40;
            this.size = 20;
            this.space = 30;

            this.score = score;
            this.lives = lives;
            this.gameStatus = gameStatus;
        }
        draw(ctx){
            ctx.fillText( "Score : "+this.score, this.x, this.y);
            ctx.fillText( "Lives : " , this.x, this.y+28);
            for(let i=0;i<this.lives; i++){
                ctx.fillRect( this.x + 62 + i*this.space, this.y+10, this.size, this.size);
            }
            
            if(this.gameStatus!=GameStatus.Play){
                ctx.save();
                ctx.textAlign = "center"
                ctx.font = "50px Impact";
                ctx.fillText(this.gameStatus.status, canvas.width*0.5, canvas.height*0.5-30);
                ctx.font = "30px san-serif";
                ctx.fillText(this.gameStatus.message, canvas.width*0.5, canvas.height*0.5+30);
                ctx.restore();
            }
            else{
                ctx.save();
                ctx.textAlign = "right"
                ctx.fillText(this.gameStatus.message, canvas.width - 20, this.y);
                ctx.restore();
            }
        }
        update(score, lives, gameStatus){
            this.score = score;
            this.lives = lives;
            this.gameStatus = gameStatus
        }
    }

    class Balloon{
        constructor(){
            // selecting operator
            let opters = ["+", "-", "*"];
            let opterNo = Math.floor(Math.random()*3);
            let opter = opters[opterNo];

            // selecting digits
            let upperLimit = 10;
            let digit1 = Math.ceil(Math.random()*upperLimit);
            let digit2 = Math.ceil(Math.random()*upperLimit);
            if(digit2>digit1){
                let temp = digit1;
                digit1 = digit2;
                digit2 = temp;
            }

            // balloon question and answer
            this.expression = digit1 + opter + digit2;
            this.answer = eval(this.expression);

            // balloon spawning co-ordinates
            this.x = canvas.width*0.1 + Math.random()*canvas.width*0.8;
            this.y = canvas.height;
            
            // calculating difficulty to calculate score, balloon-size(radius), and speed
            let maxDifficulty = (upperLimit + upperLimit) * opters.length;
            let difficulty = (digit1 + digit2) * (opterNo+1) ;

            this.score = Math.ceil( difficulty / maxDifficulty * 10 );

            this.radius = 50 + 5 * this.score;
            this.speed = (11 - this.score)*0.2; // ascending speed is inversly proportional to difficulty

            
            this.markedForDeletion = false;
        }

        draw(ctx){
            ctx.fillRect(this.x, this.y, this.radius, this.radius);
            ctx.save();
            ctx.textAlign = "center";
            ctx.fillStyle = "white";
            ctx.fillText(this.expression,this.x + this.radius*0.5, this.y + this.radius*0.6);
            ctx.restore();
        }

        update(){
            this.y -= this.speed;
            if(this.y + this.radius <= 0){
                this.markedForDeletion = true;
                return true; // returning true to decrease lives if missed to burst the balloon
            }
            return false;
        }
    }

    class Projectile{
        constructor(m, x, y){
            this.x0 = canvas.width;
            this.y0 = canvas.height;
            this.speedX = 50;

            this.m=m;
            this.x1 = x;
            this.y1 = y;
            
            this.x2 = this.x1 + 5;
            this.y2 = calY( this.m, this.x2, this.x0, this.y0);
        }
        draw(ctx){
            ctx.save();
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo( this.x2, this.y2);
            ctx.lineTo( this.x1, this.y1);
            ctx.stroke();
            ctx.restore();
        }
        update(){
            this.x1 -= this.speedX;
            this.y1 = calY( this.m, this.x1, this.x0, this.y0);
            this.x2 -= this.speedX;
            this.y2 = calY( this.m, this.x2, this.x0, this.y0);
        }
    }

    class Laser{
        constructor(){
            this.muzzleSize = 90;
            this.x0 = canvas.width;
            this.y0 = canvas.height;
            this.x1 = this.x0 - this.muzzleSize;
            this.y1 = this.y0 
            this.radius = 50;
        }

        draw(ctx){
            // laser muzzle
            ctx.save();
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo( this.x0, this.y0);
            ctx.lineTo( this.x1, this.y1);
            ctx.stroke();
            ctx.restore();

            // laser body
            ctx.fillRect(this.x0 - this.radius, this.y0 - this.radius, this.radius, this.radius);
        }

        shoot(x, y){
            // laser direction
            let m = calSlope(this.x0, this.y0, x, y);
            let theta = Math.atan(m);
            
            let width = this.muzzleSize*Math.cos(theta);
            let height = this.muzzleSize*Math.sin(theta);

            this.x1 = this.x0 - width;
            this.y1 = this.y0 - height;

            let projectile = new Projectile( m, this.x1, this.y1);
            return projectile;
        }

    }

    class Game{
        constructor(){
            this.balloons = [];
            this.score = 0;
            this.maxScore = 200;
            this.lives = 3;
            this.gameStatus = GameStatus.Play;
            this.ui = new UI(this.score, this.lives, this.gameStatus);
            this.laser = new Laser();
            this.projectile = null;
            this.balloonDuration = 2000;
            this.balloonInterval = 0;
            this.markedBalloon = null;
        }
        draw(ctx){
            if(this.projectile!=null)this.projectile.draw(ctx);
            this.laser.draw(ctx);
            this.balloons.map(balloon=>balloon.draw(ctx));
            this.ui.draw(ctx);
        }

        update(deltaTime){
            this.ui.update(this.score, this.lives, this.gameStatus);

            // TODO : gameover
            if(this.score>=this.maxScore){
                this.gameStatus = GameStatus.Win;
            }
            else if(this.lives<=0){
                this.gameStatus = GameStatus.Lost;
            }

            if(this.gameStatus!=GameStatus.Play){
                return;
            }

            // updating projectile
            if(this.projectile!=null && this.markedBalloon!=null){
                this.projectile.update();

                // check collision between projectile and marked balloon
                if(this.projectile.x1 <= this.markedBalloon.x+this.markedBalloon.radius){

                    this.score += this.markedBalloon.score;
                    this.projectile = null;
                    this.markedBalloon.markedForDeletion = true;
                    this.markedBalloon = null;
                    // TODO: explosion

                    // 
                }
            }

            // spawning a balloon
            if(this.balloonInterval>this.balloonDuration){
                this.balloonInterval = 0;
                let balloon = new Balloon();
                this.balloons.push(balloon);
            }
            else{
                this.balloonInterval += deltaTime;
            }

            this.balloons.map(balloon=>{
                if(balloon.update() ){
                    this.lives--;
                }
            });
            this.balloons = this.balloons.filter(balloon=>!balloon.markedForDeletion);
        }

        checkAnswer(val){
            if(this.gameStatus!=GameStatus.Play){
                return;
            }

            for(let balloon of this.balloons){
                if(balloon.answer == val){
                    balloon.speed = 1;
                    this.markedBalloon = balloon;
                    this.projectile = this.laser.shoot(balloon.x, balloon.y);
                    break;
                }
            }
        }

        pauseOrPlay(){
            if(this.gameStatus==GameStatus.Play){
                this.gameStatus = GameStatus.Pause;
            }
            else if(this.gameStatus==GameStatus.Pause){
                this.gameStatus = GameStatus.Play;
            }
        }

    }

    class InputHandler{
        constructor(game,inputDiv){
            this.inputDiv = inputDiv;

            window.addEventListener("keypress", (e)=>{
                if(e.key === "Enter"){
                    game.checkAnswer(this.inputDiv.value);
                    this.inputDiv.value='';
                }
                else if(e.key === "p"){
                    game.pauseOrPlay();
                }
            })
        }
    }

    let game = new Game();
    new InputHandler(game, inputDiv);
    
    function animate(timestamp){
        inputDiv.focus();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let deltaTime = timestamp - lastlyAdded;
        lastlyAdded = timestamp;

        game.update(deltaTime);
        game.draw(ctx);
        requestAnimationFrame(animate)
    }

    let lastlyAdded = 0;
    animate(0);
}