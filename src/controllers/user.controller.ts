import { UsersRepository } from "../repositories/users.repository"

export const UserController = {

    async getUser(userId : string){

        const user = await UsersRepository.getUserById(userId)
        if(user) return user;
    }

}