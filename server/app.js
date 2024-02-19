import express from "express";
import logger from 'morgan'
import { Server } from 'socket.io';
import { createServer } from 'node:http'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'

const port = process.env.PORT ?? 3000

dotenv.config()

const app = express();
const server = createServer(app)
const io = new Server(server, {
  connectionStateRecovery: {
    
  }
})

io.on('connection', async (socket) => {
  console.log('an user has connected!')

  socket.on('disconnect', () => {
    console.log('an user has disconnected!')
  })

  socket.on('chat message', async (msg) => {
    let result = null
    try {
      const username = socket.handshake.auth.username ?? 'anonymous'
      result = await db.execute({
        sql: 'INSERT INTO messages (content, username) VALUES (:content, :username)',
        args: { content: msg, username: username }
      })
    } catch (error) {
      console.error(error)
      return
    }
    
    io.emit('chat message', msg, result.lastInsertRowid.toString())
  })

  if(!socket.recovered) {
    try {
      const results = await db.execute({ 
        sql: 'SELECT id, content FROM messages WHERE id > ?',
        args: [socket.handshake.auth.serverOffset ?? 0]
      })

      results.rows.forEach(row => {
        socket.emit('chat message', row.content, row.id.toString())
      });
    } catch (error) {
      
    }
  }
})

const db = createClient({
  url: 'libsql://happy-rocket-racer-ivancastro.turso.io',
  authToken: process.env.DB_TOKEN
})

await db.execute(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    username NVARCHAR(250)
  )
`)
app.use(logger('dev'))

app.get('/', (req, res) => {
  res.sendFile(`${process.cwd()}/client/index.html`)
})

server.listen(port, () => {
  console.log(`server listening on port http://localhost:${port}`)
})