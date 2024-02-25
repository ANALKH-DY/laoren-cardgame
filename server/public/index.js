var input = el("roomIdInput")

// 绑定按钮事件
var enterRoomBtn = el("er");
enterRoomBtn.onclick = function(){
    enterRoom(parseInt(input.value));
}

function enterRoom(roomid){
    axios.get(`/enterroom/${roomid}`).then(res=>{
        // alert(res)
        res = JSON.parse(res);
        if(res.status == 0){
            localStorage.setItem("roomid", res.data.roomid);
            location.href = `/room/${roomid}`;
        }else{
            alert(res.msg);
        }
    });
}

var createRoomBtn = el("cr");
createRoomBtn.onclick = function(){
    axios.post('/create-room').then(res=>{
        res = JSON.parse(res);
        localStorage.setItem("roomid", res.roomid);
        localStorage.setItem("playerid", res.playerid);
        location.href = `/room/${res.roomid}`;
    })
}
