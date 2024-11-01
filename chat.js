const setupChat = (io) => {
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
  
      socket.on('joinRoom', (room) => {
        socket.join(room);
        socket.currentRoom = room;
        console.log(`User ${socket.id} joined room ${room}`);
        socket.to(room).emit('message', `User ${socket.id} has joined the room.`);
      });
  
      socket.on('sendMessage', (message) => {
        const room = socket.currentRoom;
        console.log(`Message from ${socket.id} in room ${room}: ${message}`);
        io.to(room).emit('clientMessage', message);
      });
  
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  };
  
  module.exports = setupChat;
  