class Player {
    // 手中的牌
    handCards = [];
    // 最新打出的牌，仅指从手牌中打出的牌，有抬炮的可能
    removedCard = undefined;
    // 弃的牌（栈）
    removedCards = [];
    // 手中牌的个数
    cardNumber = 0;
    // 上家
    prevPlayer = null;
    // 下家
    nextPlayer = null;
    // 是否准备
    isReady = false;
    // 分数
    score = 0;
    // 座位(由系统分配)
    position = 0;
    // 从上家拾的牌，暂时性标记，一轮后刷新，用于判断胡牌时是否是上家抬炮
    cardFromPrevPlayer = undefined;
    // 从牌堆摸的牌，暂时性标记，一轮后刷新，用于判断胡牌时是否是上家抬炮，当玩家不要时清空
    cardFromCardGroup = undefined;

    constructor(playerid, prevPlayer, nextPlayer, position) {
        this.playerid = playerid;
        this.prevPlayer = prevPlayer;
        this.nextPlayer = nextPlayer;
        this.position = position;
    }
    getCard(card) {
        this.handCards.push(card);
        this.cardNumber++;
        return card;
    }
    getCardFromPrevPlayer() {
        if (this.prevPlayer.removedCards.length > 0) {
            var card = this.prevPlayer.removedCards.pop();
            this.getCard(card);
        }
    }
    touchCard(card) {
        this.cardFromCardGroup = card;
        // 因为都已经摸牌了，即使胡牌也不可能是上家抬炮，所以清除标记
        this.cardFromPrevPlayer = undefined;
        return card;
    }
    saveTouchedCard() {
        // 保留摸的牌
        console.log(`玩家${this.playerid}保留摸的牌${this.cardFromCardGroup}`);
        var card = this.getCard(this.cardFromCardGroup);
        this.cardFromCardGroup = undefined;
        return card;
    }
    rejectTouchedCard() {
        // 不要摸的牌，直接放入removedCards中，不会导致点炮
        var card = this.cardFromCardGroup;
        this.removedCards.push(this.cardFromCardGroup);
        this.cardFromCardGroup = undefined;
        return card;
    }
    savePrevPlayerCard() {
        // 要上家打的牌，做好标记，拿走上家的牌
        var card = this.prevPlayer.removedCard;
        if(card === undefined){
            // 上家丢弃的摸的牌
            card = this.prevPlayer.removedCards.pop();
        }else{
            this.prevPlayer.removedCard = undefined;
            // 上家打出的
            this.cardFromPrevPlayer = this.prevPlayer.removedCard;
        }
        this.getCard(card);
        return card;
    }
    rejectPrevPlayerCard() {
        // 不要上家打的牌
        if (this.prevPlayer.removedCard) {
            this.prevPlayer.removedCards.push(this.prevPlayer.removedCard);
            this.prevPlayer.removedCard = undefined;
        }
    }

    removeCard(cardIndex) {
        // 从手牌中打出牌
        if (cardIndex === -1) throw Error('不合法的index');
        this.cardNumber--;
        // 将此牌移到removedCard（有抬炮可能）
        this.removedCard = this.handCards.splice(cardIndex, 1)[0];
        // 清除标记
        this.cardFromCardGroup = undefined;
        this.cardFromPrevPlayer = undefined;
        return this.removedCard;
    }
    ready() {
        this.isReady = true;
    }
    cancelReady() {
        this.isReady = false;
    }
    isWin() {
        if (this.cardNumber != 9) {
            console.log(`有${this.cardNumber}张牌，不能胡`,this.handCards);
            return -1;
        };
        // 判断是否胡牌
        var counter = {}
        this.handCards.map(card => {
            if(counter[card]===undefined) counter[card] = 0;
            counter[card]++;
        });
        var keys = Object.keys(counter).map(key => parseInt(key));
        if (keys.length > 3) {
            console.log("没有胡牌", this.handCards);
            return -1;
        }
        for (var key in counter) {
            if (counter[key] % 3 !== 0) {
                console.log("没有胡牌", this.handCards);
                return -1
            };
        }
        console.log(`玩家${this.playerid}胡了`,this.handCards);
        // 确认是胡牌，判断具体类型
        var taipao = 0;
        if (this.cardFromPrevPlayer !== undefined) taipao = 10;
        if (keys.length === 3) {
            if ((keys.every(key => key % 2 === 0) || keys.every(key => key % 2 === 1))) return taipao + 2;//清一色
            return taipao + 1; //小胡
        } else if (keys.length === 2) {
            if (keys.includes(0) || (keys[0] + keys[1]) % 2) return taipao + 1; //假极中极
            return taipao + 4; //真极中极
        }
    }
    updateScore(val){
        this.score += val;
        return val;
    }

}

module.exports = Player;