
import { eq } from 'drizzle-orm'
import {db} from '../db/index'
import { tasks } from '../db/schema'
import { NewTask, Task } from '../utils/models'

export const TaskRepository = {

    async getTaskById(taskId : string) : Promise<Task>{
        try{
            const task = await db.select().from(tasks).where(eq(tasks.uid, taskId))

            return task[0]
        }catch(err){
            console.log(`Error in getting task : ${err}`)
            throw err;
        }
    },

    async getTasks(userId : string) : Promise<Task[]>{
        try{
            const user_tasks = await db.select().from(tasks).where(eq(tasks.owner_id,userId))

            return user_tasks
        }catch(err){
            console.log(`Error in getting task : ${err}`)
            throw err;
        }
    },

    async AddTask(task : NewTask) : Promise<Task>{
        try{
            const newTask = await db.insert(tasks).values(task).returning()

            return newTask[0]
        }catch(err){
            console.log(`Error in adding task : ${err}`)
            throw err;
        }
    },

    async updateTask(task : Task) : Promise<Task>{
        try{
            const updatedTask = await db.update(tasks).set(task).where(eq(tasks.uid, task.uid)).returning()

            return updatedTask[0]
        }catch(err){
            console.log(`Error in updating task : ${err}`)
            throw err;
        }
    },

    async deleteTask(taskId : string) : Promise<Task>{
        try{
            const deletedTask = await db.delete(tasks).where(eq(tasks.uid, taskId)).returning()

            return deletedTask[0]
        }catch(err){
            console.log(`Error in deleting task : ${err}`)
            throw err;
        }
    }

}