export enum MessageType {
    JOIN = 'join',
    LEAVE = 'leave',
    USER_LIST = 'user_list',
    DIRECT_MESSAGE = 'direct_message',
    CREATE_ROOM = 'create_room',
    ROOM_LIST = 'room_list',
    LEAVE_ROOM = 'leave_room',
    JOIN_ROOM = 'join_room',
    ROOM_MESSAGE = 'room_message'
}

export interface Room {
    id: string,
    name: string,
    users: string[]
}