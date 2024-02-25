// 进入房间后

var roomid = lsint("roomid");
var socket;
var playerid;
var ip = "192.168.0.104"

// phaser牌桌渲染
class Example extends Phaser.Scene {
    // 牌堆gameObject
    cardObjects = [];
    // 玩家
    players = [];
    // 玩家game对象(头像，名称，准备，轮到谁)
    playerObjects = [];
    // 手中的牌 gameObject
    handCards = [];
    // 自己的位置
    position = undefined;
    // 
    removedCard = undefined;
    // 弃牌区位置
    removedCardPosition = [];
    // 玩家位置列表
    playerPosition = [];
    // 牌位置列表
    cardPosition = [];
    // 记录这局谁是头家
    firstPlayerid = undefined;
    // 记录当前该谁
    currentPlayerid = undefined;
    // 阶段
    stage = 0;
    // 摸的牌gameObject
    touchedCard = undefined;
    // 牌等待停留区
    cardWaitPosition = {}
    // 出牌按钮
    discardText = undefined;
    // 位置常量
    positionConfiguration = {}
    // 准备按钮
    readyText = undefined;
    // 退出房间按钮
    exitText = undefined;
    // 取消准备按钮
    cancelreadyText = undefined;
    // 提示
    tipText = undefined;


    preload() {
        this.load.setBaseURL(`http://${ip}:8888/`);
        this.load.image('table', 'img/table2.jpeg')
        this.load.image('p0', 'img/p0.png')
        this.load.image('p1', 'img/p1.png')
        this.load.image('p2', 'img/p2.png')
        this.load.image('p3', 'img/p3.png')
        this.load.image('p4', 'img/p4.png')
        this.load.image('p5', 'img/p5.png')
        this.load.image('p6', 'img/p6.png')
        this.load.image('card-back', 'img/card-back.png');
        this.load.image('player', 'img/player.png');
        this.load.image('ready', 'img/ready.png');
        this.load.image('ready-btn', 'img/ready-btn.png');
        this.load.image("volume-icon", "ui/volume-icon.png");
        this.load.image("volume-icon_off", "ui/volume-icon_off.png");
        // 声音
        this.load.audio("a0", "audio/0.mp3");
        this.load.audio("a1", "audio/1.mp3");
        this.load.audio("a2", "audio/2.mp3");
        this.load.audio("a3", "audio/3.mp3");
        this.load.audio("a4", "audio/4.mp3");
        this.load.audio("a5", "audio/5.mp3");
        this.load.audio("a6", "audio/6.mp3");
        this.load.audio("card-flip", "audio/card-flip.mp3");
        this.load.audio("card-slide", "audio/card-slide.mp3");
        this.load.audio("victory", "audio/victory.mp3");
    }

    create() {
        // 牌桌背景
        this.add.plane(this.sys.scale.width / 2, this.sys.scale.height / 2, 'table').setScale(1);
        // 玩家

        // 房间号和时间
        const roomidText = this.add.text(100, 10,
            `房间号：${roomid}`,
            { align: "center", strokeThickness: 4, fontSize: 20, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)

        this.volumeButton();

        this.cardWaitPosition = {
            x: this.sys.game.scale.width / 2,
            y: this.sys.game.scale.height - 60
        }
        this.positionConfiguration.handCardY = this.sys.game.scale.height;
        this.positionConfiguration.handCardStartX = 50;


        socket = new WebSocket(`ws://${ip}:8888/room/${roomid}`);
        socket.onopen = function () {
            socket.send(JSON.stringify({ type: 0 }))
        }
        socket.onclose = function () {
            console.log('socket closed');
        }
        socket.onmessage = (msgEvent) => {
            var message = JSON.parse(msgEvent.data);
            console.log("from server：", message);
            var player;
            if (message.playerid) {
                player = this.players.find(_pl => _pl.playerid === message.playerid);
            }
            switch (message.type) {
                case 0: {
                    this.players = message.players;
                    if (playerid === undefined) {
                        /*自己进入，
                        */
                        playerid = message.playerid;
                        this.position = message.position;
                        // 渲染房间信息
                        this.createPlayers();
                    } else {
                        // 其他玩家进入
                        this.createPlayers();
                    }
                    break;
                }
                case 1: {
                    // 玩家准备
                    this.createReadyText(message.playerid);
                    if (message.playerid === playerid) {
                        this.readyText.destroy();
                        this.exitText.destroy();
                        this.createCancelReadyButton();
                    }
                    break;
                }
                case 2: {
                    // 玩家出牌
                    var relativePostion = this.getRelPosition(player.position);
                    var randomX = Math.random() * 10 - 5;
                    var randomY = Math.random() * 10 - 5;
                    var randomRotaton = Math.random() * 2 * Math.PI;
                    if (message.playerid === playerid) {
                        var card = this.handCards.splice(message.cardIndex, 1)[0];
                        player.removedCards.push(card);
                        card.gameObject.setDepth(player.removedCards.length + 1);
                        // 自己出牌,牌扔到牌桌上
                        this.disableHandCards();
                        this.sound.play(`a${card.gameObject.name}`);
                        this.add.tween({
                            targets: card.gameObject,
                            x: this.removedCardPosition[relativePostion].x + randomX,
                            y: this.removedCardPosition[relativePostion].y + randomY,
                            scale: .1,
                            rotation: randomRotaton,
                            easing: Phaser.Math.Easing.Elastic.In,
                            duration: 100,
                            onComplete: () => {

                                this.adjustHandCardPosition();
                                card.gameObject.disableInteractive();
                                card.gameObject.setAlpha(1);
                            }
                        })

                    } else {
                        // 其他玩家出牌
                        // 找到对应Object 
                        var card = player.handCards.splice(message.cardIndex, 1)[0];
                        player.removedCards.push(card);
                        card.gameObject.setDepth(player.removedCards.length + 1);
                        card.flip(message.card, () => {
                            this.add.tween({
                                targets: card.gameObject,
                                x: this.removedCardPosition[relativePostion].x + randomX,
                                y: this.removedCardPosition[relativePostion].y + randomY,
                                scale: .1,
                                rotation: randomRotaton,
                                easing: Phaser.Math.Easing.Elastic.In,
                                duration: 100,
                                onComplete: () => {
                                    card.gameObject.setAlpha(1);
                                    card.gameObject.disableInteractive();
                                }
                            })
                        })
                    }
                    break;
                }
                case 3: {
                    // 玩家摸牌，将this.touchedCard 放入 对应的handCards
                    this.sound.play("card-slide");
                    this.touchedCard = this.cardObjects.pop();
                    if (message.playerid === playerid) {
                        // 是自己摸的，顶部的牌翻转，移到中下方
                        this.touchedCard.flip(message.card, () => {
                            if (this.stage === 1) {
                                this.handCards.push(this.touchedCard);
                                this.add.tween({
                                    targets: this.touchedCard.gameObject,
                                    x: this.positionConfiguration.handCardStartX + this.handCards.length * 60,
                                    y: this.positionConfiguration.handCardY,
                                    scale: .2,
                                    easing: Phaser.Math.Easing.Elastic.In,
                                    duration: 100,
                                    onComplete: () => {

                                    }
                                })
                            } else if (this.stage === 2) {
                                // 现在是出牌阶段，摸的牌需要考虑去留

                                this.add.tween({
                                    targets: this.touchedCard.gameObject,
                                    x: this.cardWaitPosition.x,
                                    y: this.cardWaitPosition.y,
                                    scale: .2,
                                    easing: Phaser.Math.Easing.Elastic.In,
                                    duration: 100,
                                    onComplete: () => {
                                        // 显示 《要》 和 《不要》 按钮
                                        this.createDesicionButton(8, 9, "要", "不要");
                                    }
                                })
                            }
                        });

                    } else {
                        // 别人摸的,牌堆最上面的牌移到别人旁边，不翻转

                        var relativePostion = this.getRelPosition(player.position);
                        this.add.tween({
                            targets: this.touchedCard.gameObject,
                            x: this.playerPosition[relativePostion].x,
                            y: this.playerPosition[relativePostion].y + 50,
                            scale: .05,
                            easing: Phaser.Math.Easing.Elastic.In,
                            duration: 100,
                            onComplete: () => {
                                // 将card移到对应玩家的手牌中
                                player.handCards.push(this.touchedCard);
                            }
                        })
                    }
                    break;
                }
                // 玩家拾上家的牌
                case 4: {
                    var card = this.players.find(_pl => _pl.playerid === message.from).removedCards.pop();
                    if (message.playerid === playerid) {
                        // 移到自己手牌上
                        this.handCards.push(card);
                        this.add.tween({
                            targets: card.gameObject,
                            x: this.positionConfiguration.handCardStartX + this.handCards.length * 60,
                            y: this.positionConfiguration.handCardY,
                            scale: .2,
                            rotation: 0,
                            easing: Phaser.Math.Easing.Elastic.In,
                            duration: 100,
                            onComplete: () => {
                                this.enableHandCards();
                            }
                        })
                    } else {

                        player.handCards.push(card);
                        var relativePostion = this.getRelPosition(player.position);
                        this.add.tween({
                            targets: card.gameObject,
                            x: this.playerPosition[relativePostion].x,
                            y: this.playerPosition[relativePostion].y + 50,
                            rotation: 0, //玩家的牌整齐
                            easing: Phaser.Math.Easing.Elastic.In,
                            scale: .05,
                            duration: 100,
                            onComplete: () => {
                                card.gameObject.disableInteractive();
                                card.enabledFlip();
                                card.flip(message.card);
                            }
                        })
                    }
                    break;
                }
                // 玩家胡牌
                case 5: {
                    alert(`玩家${message.playerid}胡了，${message.winType}`);
                    break;
                }
                // 玩家取消准备
                case 6: {
                    this.destroyReadyText(message.playerid);
                    if (message.playerid === playerid) {
                        this.cancelreadyText.destroy();
                        this.createReadyButton();
                        this.createExitButton();
                    }
                    break;
                }
                case 7: {
                    if (message.playerid === playerid) {
                        socket.close(1000);
                        localStorage.removeItem("roomid");
                        location.href = "/";
                    } else {
                        var index = this.players.findIndex(_player => _player.playerid === message.playerid);
                        this.players.splice(index, 1);
                        this.createPlayers();
                    }
                    break;
                }
                case 8: {
                    // 玩家保留摸的牌
                    if (message.playerid === playerid) {
                        this.handCards.push(this.touchedCard);
                        this.add.tween({
                            targets: this.touchedCard.gameObject,
                            x: 50 + this.handCards.length * 60,
                            y: this.positionConfiguration.handCardY,
                            scale: .2,
                            easing: Phaser.Math.Easing.Elastic.In,
                            duration: 200,
                            onComplete: () => {
                                // 要了牌，此时9张牌，该打出一张，故解除禁止
                                this.enableHandCards();
                            }
                        })
                    } else {
                        player.handCards.push(this.touchedCard);
                    }
                    break;
                }
                case 9: {
                    // 玩家不要摸的牌，把牌扔到弃牌区
                    var relativePostion = this.getRelPosition(player.position);
                    var randomX = Math.random() * 10 - 5;
                    var randomY = Math.random() * 10 - 5;
                    var randomRotaton = Math.random() * 2 * Math.PI;
                    if (message.playerid === playerid) {
                        // 自己
                        player.removedCards.push(this.touchedCard);
                        this.touchedCard.gameObject.setDepth(player.removedCards.length + 1);
                        this.sound.play(`a${this.touchedCard.gameObject.name}`)
                        this.add.tween({
                            targets: this.touchedCard.gameObject,
                            x: this.removedCardPosition[relativePostion].x + randomX,
                            y: this.removedCardPosition[relativePostion].y + randomY,
                            rotation: randomRotaton,
                            scale: .1,
                            easing: Phaser.Math.Easing.Elastic.In,
                            duration: 100,
                            onComplete: () => {
                                this.touchedCard.gameObject.setAlpha(1);
                                this.touchedCard.gameObject.disableInteractive();
                                this.disableHandCards();
                            }
                        })

                    } else {
                        // 其他玩家出牌
                        // 找到对应Object 
                        var card = player.handCards.pop();
                        player.removedCards.push(card);
                        card.gameObject.setDepth(player.removedCards.length + 1);
                        card.flip(message.card, () => {
                            this.add.tween({
                                targets: card.gameObject,
                                x: this.removedCardPosition[relativePostion].x + randomX,
                                y: this.removedCardPosition[relativePostion].y + randomY,
                                rotation: randomRotaton,
                                scale: .1,
                                easing: Phaser.Math.Easing.Elastic.In,
                                duration: 100,
                                onComplete: () => {
                                    card.gameObject.disableInteractive();
                                    card.gameObject.setAlpha(1);
                                    
                                }
                            })
                        })
                    }
                    break;
                }
                // 玩家摸一张
                case 10: {
                    if (message.playerid === playerid) {
                        socket.send(JSON.stringify({
                            type: 3,
                            playerid
                        }))
                    }
                    break;
                }
                case 11: {
                    break;
                }
                // 游戏开始
                case 12: {
                    this.currentPlayerid = message.currentPlayerid;
                    this.firstPlayerid = this.currentPlayerid;
                    this.startGame();
                    break;
                }
                case 13: {
                    // 切换玩家
                    this.tipText?.destroy();
                    this.currentPlayerid = message.currentPlayerid;

                    if(this.currentPlayerid === playerid){
                        // 轮到我
                        this.tipText = this.add.text(this.sys.game.scale.width/2, this.sys.game.scale.height/2,
                            `请出牌...`,
                            { align: "center", strokeThickness: 4, fontSize: 20, fontStyle: "bold", color: "#8c7ae6" }
                        )
                            .setOrigin(.5)
                            .setDepth(3)
                    }else{
                    //     // this.enableHandCards();
                        this.tipText = this.add.text(this.sys.game.scale.width/2, this.sys.game.scale.height/2,
                            `等待玩家${this.currentPlayerid}出牌...`,
                            { align: "center", strokeThickness: 4, fontSize: 20, fontStyle: "bold", color: "#8c7ae6" }
                        )
                            .setOrigin(.5)
                            .setDepth(3)
                    }
                    break;
                }
                // 发牌结束
                case 14: {
                    this.currentPlayerid = message.currentPlayerid;
                    this.stage = message.stage;
                    console.log("发牌结束，开始出牌");
                    // 发牌结束后，该头家打出，所以所有人的手牌都禁止操作。
                    this.disableHandCards();
                    break;
                }
                // 询问玩家是否要上家的牌
                case 15: {
                    // 暂时禁止手牌的点击操作
                    this.disableHandCards();
                    // 创建选择按钮
                    this.createDesicionButton(4, 10, "要", "摸一张");
                    break;
                }
            }
        }

        // 创建准备按钮、退出房间按钮、取消准备按钮
        this.createReadyButton();
        this.createExitButton();
    }
    startGame() {
        // this.sound.play()
        console.log(this.playerObjects);
        this.players.forEach(player => {
            this.destroyReadyText(player.playerid)
        });
        this.cancelreadyText.destroy();
        this.cardObjects = this.createCardGroup();
        this.disableCardGroup();
        this.stage = 1;
    }
    volumeButton() {
        const volumeIcon = this.add.image(25, 25, "volume-icon").setName("volume-icon");
        volumeIcon.setInteractive();

        // Mouse enter
        volumeIcon.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.input.setDefaultCursor("pointer");
        });
        // Mouse leave
        volumeIcon.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.input.setDefaultCursor("default");
        });


        volumeIcon.on(Phaser.Input.Events.POINTER_DOWN, () => {
            if (this.sound.volume === 0) {
                this.sound.setVolume(1);
                volumeIcon.setTexture("volume-icon");
                volumeIcon.setAlpha(1);
            } else {
                this.sound.setVolume(0);
                volumeIcon.setTexture("volume-icon_off");
                volumeIcon.setAlpha(.5)
            }
        });
    }
    createCardGroup() {
        var cardGroup = [];
        for (var i = 0; i < 56; i++) {
            const newCard = this.createCard({
                x: this.sys.game.scale.width / 2 + i * .2,
                y: this.sys.game.scale.height / 2 + i * .1,
                // cardName: `p${card}`
            })
            cardGroup.push(newCard);
        }
        return cardGroup;
    }
    createCard({ x, y }) {
        let isFlipping = false;
        const rotation = { y: 0 };
        let isChoosed = false;

        const backTexture = "card-back";

        const card = this.add.plane(x, y, backTexture)
            .setName("X")
            .setInteractive()
            .setScale(.1);

        card.on(Phaser.Input.Events.POINTER_OVER, () => {
            this.input.setDefaultCursor("pointer");
        });
        // Mouse leave
        card.on(Phaser.Input.Events.POINTER_OUT, () => {
            this.input.setDefaultCursor("default");
        });


        // start with the card face down
        card.modelRotationY = 180;

        const flipCard = (cardName, callbackComplete) => {
            if (isFlipping) {
                return;
            }
            const frontTexture = `p${cardName}`;
            this.add.tween({
                targets: [rotation],
                y: (rotation.y === 180) ? 0 : 180,
                ease: Phaser.Math.Easing.Expo.Out,
                duration: 100,
                onStart: () => {
                    isFlipping = true;
                    this.sound.play("card-flip");
                },
                onUpdate: () => {
                    // card.modelRotation.y = Phaser.Math.DegToRad(180) + Phaser.Math.DegToRad(rotation.y);
                    card.rotateY = 180 + rotation.y;
                    const cardRotation = Math.floor(card.rotateY) % 360;
                    if ((cardRotation >= 0 && cardRotation <= 90) || (cardRotation >= 270 && cardRotation <= 359)) {
                        card.setTexture(frontTexture);
                        card.setName(`${cardName}`)
                    }
                    else {
                        card.setTexture(backTexture);
                    }
                },
                onComplete: () => {
                    isFlipping = false;
                    if (callbackComplete) {
                        callbackComplete();
                    }
                    card.on(Phaser.Input.Events.POINTER_DOWN, (pointer) => {
                        if (!isChoosed) {
                            isChoosed = true;
                            const cardIndex = this.handCards.findIndex(card => card.gameObject.hasFaceAt(pointer.x, pointer.y));
                            console.log(cardIndex);
                            this.add.tween({
                                targets: card,
                                y: this.positionConfiguration.handCardY - 20,
                                easing: Phaser.Math.Easing.Elastic.In,
                                duration: 200,
                                onComplete: () => {
                                    this.createDiscardButton(cardIndex);
                                }
                            })
                        } else {
                            isChoosed = false;
                            this.discardText.destroy();
                            this.add.tween({
                                targets: card,
                                y: this.positionConfiguration.handCardY,
                                easing: Phaser.Math.Easing.Elastic.In,
                                duration: 200,
                                onComplete: () => {

                                }
                            })

                        }
                    });
                }
            });
        }

        const destroy = () => {
            scene.add.tween({
                targets: [card],
                y: card.y,
                easing: Phaser.Math.Easing.Elastic.In,
                duration: 500,
                onComplete: () => {
                    card.destroy();
                }
            })
        }

        const enabledFlip = () => {
            isFlipping = false;
        }

        return {
            gameObject: card,
            flip: flipCard,
            enabledFlip,
            destroy
        }
    }
    createPlayerPosition(playerNumber) {
        this.playerPosition[0] = {
            x: this.sys.game.scale.width / 2,
            y: this.sys.game.scale.height - 100
        }
        if (playerNumber < 4) {
            this.playerPosition[1] = {
                x: this.sys.game.scale.width - 50,
                y: 100
            }
            this.playerPosition[2] = {
                x: 50,
                y: 100
            }
        } else {
            this.playerPosition[1] = {
                x: this.sys.game.scale.width - 50,
                y: this.sys.game.scale.height / 2
            }
            this.playerPosition[2] = {
                x: this.sys.game.scale.width / 2,
                y: 100
            }
            this.playerPosition[3] = {
                x: 50,
                y: this.sys.game.scale.height / 2
            }
        }
    }
    createRemovedCardPosition(playerNumber) {
        if (playerNumber < 4) {
            this.removedCardPosition[0] = {
                x: this.sys.game.scale.width - 150,
                y: this.positionConfiguration.handCardY - 220
            }
            this.removedCardPosition[1] = {
                x: this.sys.game.scale.width / 2,
                y: 80
            }
            this.removedCardPosition[2] = {
                x: 150,
                y: this.positionConfiguration.handCardY - 220
            }
        } else {
            this.removedCardPosition[0] = {
                x: this.sys.game.scale.width - 150,
                y: this.sys.game.scale.height / 2 + 100
            }
            this.removedCardPosition[1] = {
                x: this.sys.game.scale.width - 150,
                y: 80
            }
            this.removedCardPosition[2] = {
                x: 150,
                y: 80
            }
            this.removedCardPosition[3] = {
                x: 150,
                y: this.sys.game.scale.height / 2 + 100
            }

        }
    }
    createDiscardButton(cardIndex) {
        // 出牌按钮

        this.discardText = this.add.text(this.sys.game.scale.width / 2, this.positionConfiguration.handCardY - 180,
            "出牌",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive()
        this.discardText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            // 出这张牌
            socket.send(JSON.stringify({
                type: 2,
                playerid,
                cardIndex
            }))
            this.discardText.destroy();
        })
    }
    createPlayers() {
        // const playerNumber = this.players.length;
        this.createPlayerPosition(this.players.length);
        this.createRemovedCardPosition(this.players.length);
        this.playerObjects.forEach(obj => {
            for (var key in obj) {
                obj[key]?.destroy()
            }
        });
        this.playerObjects.length = 0;
        this.players.forEach(player => {
            this.createPlayer(player);
        })

    }
    createPlayer(player) {
        var playerGameObject;

        var relativePostion = this.getRelPosition(player.position);
        playerGameObject = this.add.image(
            this.playerPosition[relativePostion].x,
            this.playerPosition[relativePostion].y,
            'player')
            .setScale(.4);

        var playerNameObject = this.add.text(this.playerPosition[relativePostion].x, this.playerPosition[relativePostion].y + 60,
            `玩家：${player.playerid}`,
            { align: "center", strokeThickness: 4, fontSize: 20, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
        this.playerObjects[player.playerid] = {
            icon: playerGameObject,
            name: playerNameObject,
        };
        if (player.isReady) {
            this.createReadyText(player.playerid);
        }

    }
    getRelPosition(position) {
        return (position - this.position + this.players.length) % this.players.length;
    }
    createReadyText(playerid) {
        var player = this.players.find(_pl => _pl.playerid === playerid);
        var readyTextObject;
        var relativePostion = this.getRelPosition(player.position);
        readyTextObject = this.add.image(
            this.playerPosition[relativePostion].x,
            this.playerPosition[relativePostion].y - 50,
            'ready').setDepth(3).setScale(.8);

        this.playerObjects[playerid].ready = readyTextObject;

    }
    destroyReadyText(playerid) {
        this.playerObjects[playerid].ready?.destroy();
        delete this.playerObjects[playerid].ready;

    }
    createDesicionButton(acceptType, rejectType, acceptText, rejectText) {
        // 禁止点击手牌
        this.disableHandCards();
        var saveButton = this.add.text(this.sys.game.scale.width * 0.4, this.sys.game.scale.height / 2 + 100,
            acceptText,
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive()
        var rejectButton = this.add.text(this.sys.game.scale.width * 0.6, this.sys.game.scale.height / 2 + 100,
            rejectText,
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();
        saveButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
            // 要这张牌
            socket.send(JSON.stringify({
                type: acceptType,
                playerid
            }))
            saveButton.destroy();
            rejectButton.destroy();
        })
        rejectButton.on(Phaser.Input.Events.POINTER_DOWN, () => {
            // 不要这张牌
            socket.send(JSON.stringify({
                type: rejectType,
                playerid
            }))
            saveButton.destroy();
            rejectButton.destroy();
        })
    }
    adjustHandCardPosition() {
        // 调整手牌位置
        this.handCards.forEach((card, index) => {
            this.add.tween({
                targets: card.gameObject,
                x: this.positionConfiguration.handCardStartX + (index + 1) * 60,
                y: this.positionConfiguration.handCardY,
                easing: Phaser.Math.Easing.Elastic.In,
                duration: 100,
                onComplete: () => {

                }
            })
        })
    }
    createReadyButton() {
        this.readyText = this.add.text(this.sys.scale.width / 2 + 100, this.sys.scale.height / 2 + 100,
            "准备",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();
        this.readyText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            socket.send(JSON.stringify({
                type: 1,
                playerid,
            }))
        })
    }
    createExitButton() {
        this.exitText = this.add.text(this.sys.scale.width / 2 - 100, this.sys.scale.height / 2 + 100,
            "退出房间",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();

        this.exitText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            socket.send(JSON.stringify({
                type: 7,
                playerid,
            }))
        })
    }
    createCancelReadyButton() {
        this.cancelreadyText = this.add.text(this.sys.scale.width / 2, this.sys.scale.height / 2 + 100,
            "取消准备",
            { align: "center", strokeThickness: 4, fontSize: 40, fontStyle: "bold", color: "#8c7ae6" }
        )
            .setOrigin(.5)
            .setDepth(3)
            .setInteractive();
        this.cancelreadyText.on(Phaser.Input.Events.POINTER_DOWN, () => {
            socket.send(JSON.stringify({
                type: 6,
                playerid,
            }))
        })
    }
    disableHandCards() {
        this.handCards.forEach(card => {
            this.add.tween({
                targets: card.gameObject,
                easing: Phaser.Math.Easing.Elastic.In,
                duration: 100,
                alpha: .7,
                onComplete: () => {
                    card.gameObject.disableInteractive();
                }
            })
        });
    }
    enableHandCards() {
        this.handCards.forEach(card => {
            this.add.tween({
                targets: card.gameObject,
                easing: Phaser.Math.Easing.Elastic.In,
                duration: 100,
                alpha: 1,
                onComplete: () => {
                    card.gameObject.setInteractive();
                }
            })

        });
    }
    disableCardGroup() {
        this.cardObjects.forEach(card => {
            this.add.tween({
                targets: card.gameObject,
                easing: Phaser.Math.Easing.Elastic.In,
                duration: 100,
                onComplete: () => {
                    card.gameObject.disableInteractive();
                }
            })
        })
    }
    discard(card, player) {
        // 玩家打出一张牌

    }
}

const config = {
    type: Phaser.AUTO,
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,
    scene: Example,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    }
};
const game = new Phaser.Game(config);

