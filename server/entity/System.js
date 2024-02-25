const Room = require('./Room');

class System {
    // 保存所有房间
    rooms = {} 
    constructor() { }
    getRoom(roomid) {
        if(this.rooms[roomid] === undefined) this.rooms[roomid] = new Room(roomid);
        return this.rooms[roomid];
    }
    leaveRoom(roomid, playerid) {
        var room = this.getRoom(roomid)
        room.removePlayer(playerid);

        if (room.players.length === 0) {
            this.removeRoom(roomid);
        }
    }
    removeRoom(roomid) {
        delete this.rooms[`${roomid}`];
    }
    /**
     * 
     * @param {Room} room 
     * @param {*} msg 
     * @returns 
     */
    handleMessage(room, msg, ws) {
        var playerid = msg.playerid;
        switch (msg.type) {
            case 0: {
                // 进入房间
                var player = room.addPlayer();
                playerid = player.playerid;
                msg.playerid = playerid;

                ws.playerid = playerid;

                room.wss.push(ws);
                console.log(room.wss.length);
                this.sendMessageToAllPlayer(room, _ws => {
                    if (_ws === ws) {
                        _ws.send(JSON.stringify({ players: room.players, position: player.position, ...msg }))
                    } else {
                        _ws.send(JSON.stringify({ players: room.players, position: player.position, ...msg }))
                    }
                });
                console.log(`玩家${playerid}进入${room.roomid}号房间`);
                break;
            }
            case 1: {
                // 玩家准备
                room.getPlayer(playerid).ready();
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                if(room.isEnabledStartGame()){
                    room.startGame();
                }
                break;
            }
            case 2: {
                // 玩家出牌
                var player = room.getPlayer(playerid);
                var card = player.removeCard(msg.cardIndex);
                msg.card = card;
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                room.nextPlayer();
                // 让下家考虑
                room.wss.forEach(_ws=>{
                    if(_ws.playerid === room.currentPlayer.playerid){
                        _ws.send(JSON.stringify({type: 15}));
                    }
                })
                break;
            }
            case 3: {
                // 玩家摸牌,服务器告诉玩家摸的牌，但不让其他玩家知道
                var card = room.playerTouchCard(playerid);
                if(card !== -1){
                    this.sendMessageToAllPlayer(room, _ws => {
                        if (_ws === ws) {
                            _ws.send(JSON.stringify({card, ...msg}));
                        } else {
                            _ws.send(JSON.stringify(msg));
                        }
                    })
                }else{
                    // 黄了
                    this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify({
                        type: 13,
                        playerid
                    })))

                }
                break;
            }
            case 4: {
                // 玩家拾上家的牌
                var player = room.getPlayer(playerid);
                msg.card = player.savePrevPlayerCard();
                msg.from = player.prevPlayer.playerid;
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                var winType = player.isWin();
                if(winType>0){
                    this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify({
                        type: 5,
                        playerid,
                        cards: player.handCards,
                        winType
                    })));
                }
                break;
            }
            case 5: {
                // 玩家胡牌
                var result = room.playerWin(playerid);
                Object.assign(msg, result);
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                break;
            }
            case 6: {
                // 玩家取消准备
                room.getPlayer(playerid).cancelReady();
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                break;
            }
            case 7: {
                // 玩家离开房间
                this.leaveRoom(room.roomid, playerid);
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                break;
            }
            case 8: {
                // 玩家保留摸的牌
                var card = room.playerSaveTouchedCard(playerid);
                this.sendMessageToAllPlayer(room, _ws => {
                    if(_ws === ws){
                        _ws.send(JSON.stringify({card,...msg}))
                    }else{
                        _ws.send(JSON.stringify(msg))
                    }
                });
                var player = room.getPlayer(playerid);
                var winType = player.isWin();
                if(winType>0){
                    this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify({
                        type: 5,
                        playerid,
                        cards: player.handCards,
                        winType
                    })));
                }
                break;
            }
            case 9: {
                // 玩家不要摸的牌
                msg.card = room.playerRejectTouchedCard(playerid);
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                // 让下家考虑
                room.wss.forEach(_ws=>{
                    if(_ws.playerid === room.currentPlayer.playerid){
                        _ws.send(JSON.stringify({type: 15}));
                    }
                })
                break;
            }
            case 10: {
                // 玩家不要上家打的牌
                room.rejectPrevPlayerCard(playerid);
                this.sendMessageToAllPlayer(room, _ws => _ws.send(JSON.stringify(msg)));
                break;
            }
        }
        return playerid;
    }
    sendMessageToAllPlayer(room, messageFn) {
        room.wss.forEach(_ws => messageFn(_ws));
    }

}

module.exports = System;