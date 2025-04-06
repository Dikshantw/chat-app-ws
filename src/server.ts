import http from 'http';

import  { WebSocket,WebSocketServer } from "ws"
import { v4 as uuidv4 } from "uuid"
import { MessageType, Room } from "./types"
const PORT = 8080

const server = http.createServer()
const wss = new WebSocketServer({server:server})

const users = new Map()
const connections = new Map()
const rooms: Map<string, Room> = new Map()

wss.on("connection", (ws: WebSocket)=>{
    const userId = uuidv4();

    ws.on('message', (data: string) => {
        const message = JSON.parse(data);

        switch(message.type){
            case MessageType.JOIN:
                const user = {
                    id: userId,
                    username: message.content
                };
                users.set(userId, user);
                connections.set(userId,ws);

                ws.send(JSON.stringify({
                    type: MessageType.JOIN,
                    senderId: 'server',
                    sender: 'Server',
                    content: `Welcome ${message.content}!`,
                    timeStamp: Date.now(),
                    userId: userId
                }))

                broadcastUserList();
                broadcastRoomList();
            break;
            case MessageType.DIRECT_MESSAGE:
                if(message.receipentId && connections.has(message.receipentId)){
                    const receipentWs = connections.get(message.receipentId);
                    if(receipentWs){
                        receipentWs.send(JSON.stringify({
                            ...message,
                            timeStamp: Date.now()
                        }))
                    }
                }
            break;
            case MessageType.CREATE_ROOM:
                const roomId = uuidv4();
                const room = {
                    id: roomId,
                    name: message.content,
                    users: [userId]
                }
                rooms.set(roomId, room);

                ws.send(JSON.stringify({
                    type: MessageType.CREATE_ROOM,
                    senderId: 'sender',
                    sender: 'Sender',
                    content: `Room ${message.content} created with Id ${roomId}`,
                    timeStamp: Date.now(),
                    roomId: roomId
                }))

                broadcastRoomList();
            break;

            case MessageType.JOIN_ROOM:
                const roomToJoin = rooms.get(message.roomId);
                if(roomToJoin){
                    if(!roomToJoin.users.includes(userId)){
                        roomToJoin.users.push(userId)
                    }

                    ws.send(JSON.stringify({
                            type: MessageType.JOIN_ROOM,
                            senderId: 'sender',
                            sender: 'Sender',
                            content: `You joined room ${roomToJoin.name}`,
                            timeStamp: Date.now(),
                            roomId: roomToJoin.id
                    }))

                    roomToJoin.users.forEach(uid => {
                        if(uid !== userId && connections.has(uid)){
                            const userWs = connections.get(uid);
                            if(userWs){
                                userWs.send(JSON.stringify({
                                    type: MessageType.JOIN_ROOM,
                                    senderId: 'sender',
                                    sender: 'Sender',
                                    content: `${users.get(userId).username} joined the room`,
                                    timeStamp: Date.now(),
                                    roomId: roomToJoin.id
                                }))
                            }
                        }
                    })
                }
            break;
            case MessageType.LEAVE_ROOM:
                const roomToLeave = rooms.get(message.roomId);
                if(roomToLeave){
                    roomToLeave.users = roomToLeave.users.filter(uid => uid !== userId);

                    if(roomToLeave.users.length === 0){
                        rooms.delete(roomToLeave.id);
                        broadcastRoomList()
                    }else {
                        roomToLeave.users.forEach(uid => {
                            if(connections.has(uid)){
                                const userWs = connections.get(uid);
                                if(userWs){
                                    userWs.send(JSON.stringify({
                                        type: MessageType.LEAVE_ROOM,
                                        senderId: 'sender',
                                        sender: 'Sender',
                                        content: `${users.get(userId).username} left the room`,
                                        timeStamp: Date.now(),
                                        roomId: roomToLeave.id
                                    }))
                                }
                            }
                        })
                    }
                }
            break;

            case MessageType.ROOM_MESSAGE:
                const targetRoom = rooms.get(message.roomId);
                if(targetRoom){
                    targetRoom.users.forEach(uid => {
                        if(connections.has(uid)){
                            const userWs = connections.get(uid);
                            if(userWs){
                                userWs.send(JSON.stringify({
                                    ...message,
                                    timeStamp: Date.now()
                                }))
                            }
                        }
                    })
                }
            break;
        }
    })

    ws.on("close",()=>{
        const user = users.get(userId);
        if(user){

            rooms.forEach(room => {
                room.users = room.users.filter(uid => uid !== userId);

                room.users.forEach(uid => {
                    if(connections.has(uid)){
                        const userWs = connections.get(uid);
                        if(userWs){
                            userWs.send(JSON.stringify({
                                type: MessageType.LEAVE_ROOM,
                                senderId: 'sender',
                                sender: 'Sender',
                                content: `${user.username} left the room`,
                                timeStamp: Date.now(),
                                roomId: room.id
                            }))
                        }
                    }
                })

                if(room.users.length === 0){
                    rooms.delete(room.id)
                }
            })

            users.delete(userId);
            connections.delete(userId);

            broadcastUserList();
            broadcastRoomList();
        }
    })

    function broadcastUserList(){
        const userList = Array.from(users.values());
        const message = {
            type: MessageType.USER_LIST,
            senderId: 'server',
            sender: 'Server',
            content: JSON.stringify(userList),
            timeStamp: Date.now()
        };

        connections.forEach(connection => {
            connection.send(JSON.stringify(message))
        });
    }

    function broadcastRoomList(){
        const roomList = Array.from(rooms.values());
        const message = {
            type: MessageType.ROOM_LIST,
            senderId: 'sender',
            sender: 'Sender',
            content: JSON.stringify(roomList),
            timeStamp: Date.now()
        }

        connections.forEach(connection => {
            connection.send(JSON.stringify(message))
        })
    }
})

server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
  });