import { Context, Hono } from "hono";
import { addSessionDetails, authMiddleware } from "../middlewares/auth";
import { TaskController } from "../controllers/tasks.controller";
import { NewTaskRequest, UpdateTaskRequest } from "../utils/apiModels/requestModels";

const taskRouter = new Hono()

taskRouter.use('*', authMiddleware)
taskRouter.use('*', addSessionDetails)

taskRouter.get("/", async (c : Context) => {
    const userId = c.get('userId')

    const tasks = await TaskController.getTasks(userId);

    return c.json({
        message : "Success",
        data : tasks
    }, 200)
})

taskRouter.post("/create", async (c : Context) => {
    const userId = c.get('userId')

    const body = await c.req.json<NewTaskRequest>()
    body.owner_id = userId

    const task = await TaskController.addTask(body)

    return c.json({
        message : "Success",
        data : task
    }, 200)
})

taskRouter.post("/update", async (c : Context) => {
    const userId = c.get('userId')

    const body = await c.req.json<UpdateTaskRequest>()
    body.owner_id = userId

    const task = await TaskController.updateTask(body)

    return c.json({
        message : "Success",
        data : task
    }, 200)
})

taskRouter.delete("/delete/:id", async (c : Context) => {
    const userId = c.get('userId')
    const taskId = c.req.param('id') 

    const task = await TaskController.deleteTask(userId, taskId)

    return c.json({
        message : "Success",
        data : task
    }, 200)
})


export default taskRouter