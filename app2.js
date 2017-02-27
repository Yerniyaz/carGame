//app.js
var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
    res.sendFile(__dirname + '/client/index2.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");
 
var SOCKET_LIST = {};
var PLAYER_LIST = {};
 
var Bullet = function(parent){
    var self = {
        x:0,
        y:0,
		speed: 10,
        spdX:0,
        spdY:0,
        id:Math.random(),
		//angle:0,
		parent: parent,
		toRemove: false,
		timer: 0
    }
    self.update = function(){
        self.updatePosition();
		if(self.timer++ >100){
			self.toRemove=true;
		}
		
		for(var i in Player.list){
			var p = Player.list[i];
            if(self.getDistance(p) < 30 && self.parent !== p.id){
                //handle collision. ex: hp--;
				Player.list[i].hp--;
                self.toRemove = true;
            }
		}
    }
    self.updatePosition = function(){
        self.x += self.spdX;
        self.y -= self.spdY;
    }
	
	self.getDistance = function(pt){
        return Math.sqrt(Math.pow(self.x-pt.x,2) + Math.pow(self.y-pt.y,2));
    }
	
	Bullet.list[self.id]=self;
    return self;
}
Bullet.list={};

Bullet.update = function(){
    var pack = [];
    for(var i in Bullet.list){
        var bullet = Bullet.list[i];
        bullet.update();
        if(bullet.toRemove)
            delete Bullet.list[i];
        else
            pack.push({
                x:bullet.x,
                y:bullet.y,
            });    
    }
    return pack;
}

var Player = function(id){
    var self = {
        x:1000*Math.random(),
        y:500*Math.random(),
		angle:0,
		moveAngle:0,
		speed:0,
        id:id,
		hp: 3,
		shootTimer: 0,
        pressingRight:false,
        pressingLeft:false,
        pressingUp:false,
        pressingDown:false,
		pressingShoot: false
    }
	
	self.update=function(){
		self.updatePosition();
		if(self.shootTimer>0){
			self.shootTimer--;
		} 
		if(self.pressingShoot){
			self.shoot();
		}
	}
	
    self.updatePosition = function(){
		self.moveAngle=0;
		self.speed=0;
		var changeAngle=2;
		if (self.pressingLeft && self.pressingDown) {self.moveAngle = changeAngle; }
		if (self.pressingRight && self.pressingDown) {self.moveAngle = (-1)*changeAngle; }
		if (self.pressingLeft && self.pressingUp) {self.moveAngle = (-1)*changeAngle; }
		if (self.pressingRight && self.pressingUp) {self.moveAngle = changeAngle; }
		if (self.pressingUp) {self.speed= 4; }
		if (self.pressingDown) {self.speed= -1; }
		
		self.angle+= self.moveAngle * Math.PI / 180;
		self.x += self.speed * Math.sin(self.angle);
        self.y -= self.speed * Math.cos(self.angle);
    }
	
	self.shoot=function(){
		if(self.shootTimer==0){
			self.shootTimer=20;
			var b=new Bullet(self.id);
			b.x=self.x;
			b.y=self.y;
			b.spdX=b.speed*Math.sin(self.angle);
			b.spdY=b.speed*Math.cos(self.angle);
			//b.angle=self.angle;
		}
	}
	
	
	Player.list[id] = self;
    return self;
}

Player.update=function(){
	var pack=[];
	for(var i in Player.list){
        var player = Player.list[i];
		if(player.hp<=0){
			delete Player.list[i];
		}
		player.update();
        pack.push({
            x:player.x,
            y:player.y,
			angle: player.angle,
			id: player.id
        });    
    }
	return pack;
}

Player.list={};
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
    socket.id = Math.random();
    SOCKET_LIST[socket.id] = socket;
 
    var player = Player(socket.id);
    socket.emit('id',socket.id);
   
    socket.on('disconnect',function(){
        delete SOCKET_LIST[socket.id];
        delete Player.list[socket.id];
    });
   
    socket.on('keyPress',function(data){
        if(data.inputId === 'left')
            player.pressingLeft = data.state;
        else if(data.inputId === 'right')
            player.pressingRight = data.state;
        else if(data.inputId === 'up')
            player.pressingUp = data.state;
        else if(data.inputId === 'down')
            player.pressingDown = data.state;
		if(data.inputId === 'shoot')
            player.pressingShoot = data.state;
    });
   
   
});
 
setInterval(function(){
    var pack = {
		players: Player.update(),
		bullets: Bullet.update()
	};
	
    for(var i in SOCKET_LIST){
        var socket = SOCKET_LIST[i];
        socket.emit('newPositions',pack);
    }
   
   
   
   
},1000/50);