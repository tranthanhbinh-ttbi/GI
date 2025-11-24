const clients = new Set()

function registerSocket(connection) {
  clients.add(connection)
  connection.socket.on('close', () => clients.delete(connection))
}

function broadcast(event, payload) {
  const message = JSON.stringify({ event, payload })
  for (const conn of clients) {
    try {
      conn.socket.send(message)
    } catch (_) {}
  }
}

module.exports = { registerSocket, broadcast }