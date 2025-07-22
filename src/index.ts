import './config/env'
import { prettyJSON } from 'hono/pretty-json'
import { logger } from 'hono/logger'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import webhookRouter from './routes/webhooks'
import notesRouter from './routes/notes'
import { AppError } from './utils/errors'
import { StatusCodes } from './utils/statusCodes'
import taskRouter from './routes/task'
import askAIRouter from './routes/askAI'
import {wsRouter, websocket} from './routes/audioWrapper'
import { logMemory, patchConsoleLogWithTime } from './utils/utility_methods'
import subscriptionsRouter from './routes/subscriptions'
import userRouter from './routes/user'

const app = new Hono()

patchConsoleLogWithTime()

app.use('*', logger())
app.use('*', prettyJSON())
app.use(
  '*',
  cors({
    //TODO, when frontend and chrome extension are deployed, we can modify the cors policy
    origin: '*',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH' ,'PUT', 'DELETE', 'OPTIONS'],
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

logMemory("StartUp")
app.get('/', (c) => c.text('Welcome to SynapticAI'))

app.get('/test', async (c) => {
  console.log("*********************************")
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = c.req.query();

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    return c.body(challenge);
  } else {
    return c.status(403);
  }
});

app.post('/test', async (c)=>{

  const body = await c.req.json();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`\n\nWebhook received ${timestamp}\n`);
  console.log(body);
  return c.body(null)
})

//TODO: Need to change callback url in clerk, once deployed.
app.route('/webhooks', webhookRouter)
app.route('/notes',notesRouter)
app.route('/tasks', taskRouter)
//TODO: Add endpoint to get the user usage metrics.
//TODO: Add endpoints to get chat history and clear chat history
app.route('/user', userRouter)
app.route("/askAI", askAIRouter)
app.route("/audioWrapper", wsRouter)
app.route('/subscriptions', subscriptionsRouter)

Bun.serve({
  fetch: app.fetch,
  websocket,
  port: process.env.PORT? parseInt(process.env.PORT) : 3000,
  idleTimeout: 180 //3 minutes
})

console.log(`✅ SynapticAI server is running at ${process.env.PORT} in ${process.env.ENVIRONMENT} environment`)


