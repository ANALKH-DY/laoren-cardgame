// nodejs服务器

const express = require('express');

const expressWs = require('express-ws');    //websocket
const bodyParser = require('body-parser');
const path = require('path');
const JZLRP = require('./entity/System');

const app = express()

// 使用bodyParser解析req的参数
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))

// 将websocket服务混入app，相当于为app添加.ws方法
expressWs(app);

// 手动设置views文件夹的路径
app.set('views',path.join(__dirname,'/views/'));
// 手动指定view模板引擎
app.set('view engine','pug');
// 手动指定静态文件夹public
app.use(express.static(path.join(__dirname, 'public')))
// 禁用视图缓存
app.disable('view cache');
// ---------------------------------------------------------------------------------------------

app.JZLRP = new JZLRP();

app.get('/',function(req,res){
    res.render('index');
})

app.get('/room/:roomid',function(req,res){
    res.render('room');
})

app.get('/enterroom/:roomid',function(req,res){
    var roomid = parseInt(req.params.roomid);
    if(roomid){
        console.log('请求进入房间'+req.params.roomid);
        var room = app.JZLRP.getRoomById(roomid);
        if(room.isFull()){
            res.json({status:2,msg: "该房间人数已满！"});  
        }else if(room.isInGaming()){
            res.json({status:3,msg: "该房间正在游戏中，无法进入！"});  
        }else{
            res.json({
                status: 0,
                data:{
                    roomid,
                }
            })
        }
    }else{
        res.json({status:1,msg: "请输入正确的房间号"});
    }
})

// 进入房间建立websokcet连接
app.ws('/room/:roomid',function(ws,req){

    var room = app.JZLRP.getRoomById(req.params.roomid);
    var playerid;
    ws.on('message',function(msg){
        console.log("收到玩家信息",msg);
        msgObject = JSON.parse(msg);
        // 处理消息，修改服务器内部的数据,并发送给所有玩家，不同玩家可能会收到不同消息。
        playerid = app.JZLRP.handleMessage(room, msgObject, ws);
        
    })
    
    ws.on('close', function(e){
        console.log('玩家中断连接');
        var index = room.wss.findIndex(_ws=>_ws === ws);
        room.wss.splice(index,1);
        room.removePlayer(playerid);
        console.log("剩余玩家数:",room.playerNumber);
    })

})

// ---------------------------------------------------------------------------------------------
app.listen(8888, ()=>{
    console.log('Server is running on port http://localhost:8888/');
})