const socket = io();

socket.on("connect", ()=> {
    console.log(socket)
    socket.emit("whoami", (username)=>{
        console.log(username)
    })
})


