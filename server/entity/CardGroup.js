//南瓜0 两点黑1 花2 飘三3 一点红4 叉叉5 两杠红6，正数才有颜色，奇黑偶红  
class CardGroup {
    // 所有牌
    cards = [];
    // 牌的数目
    cardNumber = 56;

    constructor() {
        for (var i = 0; i < 7; i++) {
            for (var j = 0; j < 8; j++) {
                this.cards.push(i);
            }
        }
        this.shuffle();
    }
    shuffle() {
        // 洗牌
        for (var k = 0; k < 3; k++) {

            // 1.刀牌
            var mid = parseInt(Math.random() * 10) + 23;
            var leftpart = this.cards.slice(0, mid);
            var rightpart = this.cards.slice(mid);
            this.cards.length = 0;
            // 2.合并
            // lp左半部分牌的游标，rp右半部分牌的游标，gap表间隙(0~5)
            var lp = 0, rp = 0, gap = 0, llen = leftpart.length, rlen = rightpart.length;
            // 两堆牌的起始偏移(-5~5，负数表示rightpart先，非负数表示leftpart先)
            var offset = parseInt(Math.random() * 10) - 5;
            if (offset < 0) {
                while (offset++ < 0) this.cards.push(rightpart[rp++]);
            } else {
                while (offset-- >= 0) this.cards.push(leftpart[lp++]);
            }

            while (lp < llen && rp < rlen) {
                gap = parseInt(Math.random() * 3);
                while (gap-- > 0 && lp < llen)
                    this.cards.push(leftpart[lp++]);
                this.cards.push(rightpart[rp++]);
            }
            // 3.将剩余的牌补入
            if (lp < llen) {
                while (lp < llen) this.cards.push(leftpart[lp++]);
            } else if (rp < rlen) {
                while (rp < rlen) this.cards.push(rightpart[rp++]);
            }
        }
        console.log(this.cards);
    }
    dealACard() {
        // 发牌
        if (this.cardNumber > 0) {
            this.cardNumber--;
            return this.cards.pop();
        } else {
            console.log('没有牌了');
            return -1;
        }
    }
}

module.exports = CardGroup;