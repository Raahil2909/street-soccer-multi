const socketio = require('socket.io');
// server.js does not run again because it is already executed
const { server } = require("./server.js");
const { newRoomName } = require('./utils');
const {Game} = require("../client/game");
let games = {};
let idToRoom = {};

const io = socketio(server,{
    cors:{
        origin:'*',
    },
});
let intervalId = setInterval(() => {
    
    for(let [key,game] of Object.entries(games)){
        if(!game.ready) continue;
        game.update();
        game.serverSend();
    }
}, 33);
//io.sockets.something and io.something are same thing
io.on("connection", (sock) => {
    console.log(`Client Id ${sock.id} connected`);
    sock.on("ping",(sendtime)=>{
        sock.emit("ping",sendtime);
    });
    sock.on("disconnect", () => {
        if(sock.roomName in games && sock.id in games[sock.roomName].players){
            console.log(`deleting player id,name = ${games[sock.roomName].players[sock.id]}, ${sock.username}`);
            console.log(`length = ${Object.keys(games[sock.roomName].players).length}`)
            delete games[sock.roomName].players[sock.id];            
            if(Object.keys(games[sock.roomName].players).length == 0){
                console.log(`deleting room ${sock.roomName}`);
                delete games[sock.roomName];
            }
        console.log(`Client Id ${sock.id} disconnected`);
        }
    });
    sock.on("update",(keyInfo)=>{
        if(sock.roomName in games && sock.id in games[sock.roomName].players){
            games[sock.roomName].players[sock.id].moveHandler(keyInfo.ecode,keyInfo.direction);
        }else {
            console.log("not defined//refresh required");
        }
    });
    sock.on("mouse",(mouse)=>{
        if(sock.roomName in games && sock.id in games[sock.roomName].players){
            games[sock.roomName].players[sock.id].thetaHandler(mouse.x,mouse.y);
        }else {
            console.log("not defined//refresh required");
        }
    });
    sock.on('newRoom',handleNewRoom);
    sock.on('joinRoom',handleJoinRoom);
    function newPlayer(roomName,username){
        idToRoom[sock.id] =roomName;
        sock.emit('gameCode',roomName);
        sock.join(roomName);
        console.log(`playerid ${sock.id} joined the room ${roomName}`);
        const noOfPlayersInRoom = io.sockets.adapter.rooms.get(roomName).size;
        sock.number =noOfPlayersInRoom;
        sock.roomName = roomName;
        sock.username = username;
        const game = games[roomName];
        game.addPlayer(sock);
        sock.emit('init',{number:sock.number,roomName:roomName});
        // io.in(roomName).emit('newPlayer',{id:sock.id,playerNo:sock.number,username:sock.username});
    }
    
    function handleNewRoom(username){
        let roomName = newRoomName(4);
        console.log(`${username} joined the room telling this from handle join room in websocket.js`);
        games[roomName] = new Game(roomName,io);
        console.log("roomName",games[roomName].roomName);
        newPlayer(roomName,username);
        games[roomName].ready = true;
    }
    
    function handleJoinRoom(data){
        const {roomName,username} = data;
        console.log(data);
        console.log(`requesting to join room ${data.roomName}, ${data.username}`);
        console.log(`${roomName},${username}`);
        if(io.sockets.adapter.rooms.has(roomName)){
            newPlayer(roomName,username);
        } else{
            sock.emit('failedToJoinRoom','room does not exist');
        }

    }
    // function handleKeyDown(){

    // }
    
    
});