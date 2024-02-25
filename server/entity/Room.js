const Player = require('./Player');
const CardGroup = require('./CardGroup');

var playeridCounter = 1;

class Room {
    players = [
    ];
    playerNumber = this.players.length;
    cardGroup = undefined;
    // 头家，默认为players[0],之后谁家胡了，他的下家为头家
    firstPlayer = undefined;
    // 当前该谁打
    currentPlayer = undefined;
    // 当前阶段 0.未开始 1.发牌 2.出牌 3.结束
    stage = 0;
    // ws客户端列表
    wss = [];

    constructor(roomid) {
        this.roomid = roomid;
    }
    isFull() {
        return this.playerNumber >= 4;
    }
    isInGaming() {
        return this.stage > 0;
    }
    //  
    startGame() {
        if (this.players.length < 3) {
            console.log('房间人数不够');
            return;
        }
        console.log("开始游戏");
        for (var i = 0; i < this.playerNumber; i++) {
            this.players[i].nextPlayer = this.players[(i + 1 + this.playerNumber) % this.playerNumber];
            this.players[i].prevPlayer = this.players[(i - 1 + this.playerNumber) % this.playerNumber];
        }
        this.firstPlayer = this.players[0];
        this.currentPlayer = this.firstPlayer;
        this.stage = 1;
        this.cardGroup = new CardGroup();
        // 告诉所有玩家游戏开始了
        this.wss.forEach(_ws => _ws.send(JSON.stringify({
            type: 12,
            currentPlayerid: this.firstPlayer.playerid
        })))
        var timer = setInterval(() => {
            if(this.firstPlayer.prevPlayer.cardNumber <8){
                var card = this.currentPlayer.getCard(this.cardGroup.dealACard());
            }else{
                var card = this.playerTouchCard(this.firstPlayer.playerid);
            }
            
            this.wss.forEach((ws, index) => {
                ws.send(JSON.stringify({
                    type: 3,
                    playerid: this.currentPlayer.playerid,
                    card: this.currentPlayer.playerid === ws.playerid ? card : undefined
                }))
            })
            
            

            if (this.firstPlayer.cardFromCardGroup !== undefined) {
                clearInterval(timer);
                console.log("发牌完毕");
                this.players.forEach(player=>{
                    console.log(player.handCards);
                })
                this.nextStage();
            }else{
                this.currentPlayer = this.currentPlayer.nextPlayer;
            }

        }, 400)

    }
    getPlayer(playerid) {
        var player = this.players.find(player => player.playerid === playerid);
        if (player == undefined) throw Error('没有找到对应的玩家' + playerid);
        return player;
    }
    addPlayer() {
        const player = new Player(playeridCounter++, undefined, undefined, this.playerNumber + 1);
        this.players.push(player);
        this.playerNumber++;
        return player;
    } 
    removePlayer(playerid) {
        var index = this.players.findIndex(player => player.playerid === playerid);
        if (index !== -1) {
            this.players.splice(index, 1);
            this.playerNumber -= 1;
            this.stage = 0;
            this.players.forEach(player=>{
                player.prevPlayer = undefined;
                player.nextPlayer = undefined;
            })

            return true;
        }

        return false;
    }
    playerReady(playerid) {
        this.getPlayer(playerid).ready();
        // 检查是否所有玩家都准备
        if (this.isEnabledStartGame()) {
            this.startGame();
        }
    }
    playerTouchCard(playerid) {
        /* 玩家从牌堆中摸一张牌，注意只是摸出来，还没有放入手牌中。因为牌堆cardGroup不可能在某个玩家中，只能在房间中，
           所以这句代码只能放在这儿
        */
        var card = this.cardGroup.dealACard();
        console.log(`玩家${playerid}摸到${card}` );
        if (card >= 0) this.getPlayer(playerid).touchCard(card);
        return card;
    }
    playerSaveTouchedCard(playerid) {
        return this.getPlayer(playerid).saveTouchedCard();
    }
    playerRejectTouchedCard(playerid) {
        var card = this.getPlayer(playerid).rejectTouchedCard();
        this.nextPlayer();
        return card;
    }
    rejectPrevPlayerCard(playerid){
        this.getPlayer(playerid).rejectPrevPlayerCard();
    }
    isEnabledStartGame() {
        return this.playerNumber >= 3 && this.players.every(player => player.isReady);
    }
    nextStage(){
        this.stage++;
        this.wss.forEach(ws=>ws.send(JSON.stringify({
            type: 14,
            currentPlayerid: this.currentPlayer.playerid,
            stage: this.stage
        })))
    }
    nextPlayer() {
        this.currentPlayer = this.currentPlayer.nextPlayer;
        this.wss.forEach(ws => ws.send(JSON.stringify({
            type: 13,
            currentPlayerid: this.currentPlayer.playerid
        })))
        console.log("当前玩家：",this.currentPlayer.playerid,"上家：", this.currentPlayer.prevPlayer.playerid);
    }
    playerWin(playerid) {
        var result = {};
        var player = this.getPlayer(playerid);
        var val = player.isWin();
        if (val > 10) {
            // 上家抬炮
            result[`${player.prevPlayer.playerid}`] = player.prevPlayer.updateScore(-1 * (val - 10) * (this.playerNumber - 1));
            result[`${playerid}`] = player.updateScore((val - 10) * (this.playerNumber - 1));
        } else if (val > 0) {
            this.players.forEach(player => {
                if (player.playerid === playerid) {
                    result[`${playerid}`] = player.updateScore(val * (this.playerNumber - 1));
                } else {
                    result[`${player.playerid}`] = player.updateScore(-1 * val);
                }
            })
        }
        return {
            type: val,
            cards: player.handCards,
            result
        };
    }
    endGame() {

    }
}

module.exports = Room;