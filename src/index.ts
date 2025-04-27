import './config/env'
import { serve } from '@hono/node-server'
import { prettyJSON } from 'hono/pretty-json'
import { logger } from 'hono/logger'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import callbackRouter from './routes/callback'
import notesRouter from './routes/notes'
import { AppError } from './utils/errors'
import { StatusCodes } from './utils/statusCodes'
import taskRouter from './routes/task'
import askAIRouter from './routes/askAI'

const app = new Hono()

app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    //TODO, when frontend and chrome extension are deployed, we can modify the cors policy
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  })
);

app.onError((err, c) => {
	if (err instanceof AppError) { 
		return c.json({ message: err.message }, err.statusCode )
	}

  if(err instanceof SyntaxError) {
    return c.json({ message: 'Invalid JSON body in the request' }, StatusCodes.BAD_REQUEST)
  }

	console.error('[Sever ERROR]:', err)
	return c.json({ message: 'Internal Server Error' , detail: `Name: ${err.name},Message : ${err.message}, Stack: ${err.stack}, Cause: ${err.cause}`}, 500)
})

app.get('/', (c) => c.text('Welcome to SynapticAI'))


app.route('/callback', callbackRouter)
app.route('/notes',notesRouter)
app.route('/tasks', taskRouter)
app.route("/askAI", askAIRouter)

serve({
  fetch: app.fetch,
  port: process.env.PORT? parseInt(process.env.PORT) : 3000
})

console.log(`SynapticAI server is running at ${process.env.PORT} in ${process.env.ENVIRONMENT} environment`)
