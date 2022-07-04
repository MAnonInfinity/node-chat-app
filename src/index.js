const express = require('express')
const path = require('path')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')

const { generateMessage, generateLocationMessage } = require('./utils/messages')
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users')
const { gunzip } = require('zlib')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 3000
const publicDirPath = path.join(__dirname, '../public')

app.use(express.static(publicDirPath))

/* Socket Code Start */
io.on('connection', (socket) => {
    console.log('New connection')

    socket.on('join', ({ username, room }, callback) => {
        const {error, user } = addUser({ id: socket.id, username, room })
        if (error)
            return callback(error)

        socket.join(user.room)

        socket.emit('message', generateMessage('admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))    
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })
    
    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        if (!user)
            return

        const filter = new Filter()
        if (filter.isProfane(message))
            return callback('Profanity is not allowed!')

        io.to(user.room).emit('message', generateMessage(user.username, message))

        callback()
    })

    socket.on('sendLocation', ({ lat, long }, callback) => {
        const { username, room } = getUser(socket.id)
        console.log(lat, long)
        io.to(room).emit('locationMessage', generateLocationMessage(username, `https://google.com/maps?q=${lat},${long}`   ))

        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage('admin', `${user.username} has left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})
/* Socket Code End */

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})