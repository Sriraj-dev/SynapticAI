import { TaskRepository } from "../repositories/tasks.repository";
import { NewTask, Task } from "../utils/models";
import { NewTaskRequest, UpdateTaskRequest } from "../utils/apiModels/requestModels";
import { AccessDeniedError } from "../utils/errors";


export const TaskController = {
    async getTasks(userId : string): Promise<Task[]>{
        try{
            const tasks = await TaskRepository.getTasks(userId)
            return tasks
        }catch(err){
            console.log(`Error in getting tasks : ${err}`)
            throw err;
        }
    },

    async addTask(task : NewTaskRequest){
        try{
            const newTask = await TaskRepository.AddTask(task as NewTask)
            return newTask
        }catch(err){
            console.log(`Error in adding task : ${err}`)
            throw err;
        }
    },

    async updateTask(task : UpdateTaskRequest){
        try{
            const updatedTask = await TaskRepository.updateTask(task as Task)
            return updatedTask
        }catch(err){
            console.log(`Error in updating task : ${err}`)
            throw err;
        }
    },

    async deleteTask(userId : string, taskId : string){
        try{
            const task : Task = await TaskRepository.getTaskById(taskId)

            if(task.owner_id != userId){
                throw new AccessDeniedError("You dont have access to delete this Task")
            }

            const deletedTask = await TaskRepository.deleteTask(taskId)
            return deletedTask
        }catch(err){
            console.log(`Error in deleting task : ${err}`)
            throw err;
        }
    }
}

