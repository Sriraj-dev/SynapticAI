import { Context } from "hono";
import { UsersRepository } from "../repositories/users.repository";
import { NewUser } from "../utils/models";


export const CallbackController = {
    async userSignUp(c : Context){
        
        const payload = await c.req.json();
        const user = payload.data;

        const {
            id: userId,
            email_addresses: [{ email_address: email } = {}],
            phone_numbers: [{ phone_number: phone } = {}],
            first_name = '',
            last_name = '',
            username = ''
        } = user;

        try{
            const existingUser = await UsersRepository.getUserById(userId)

            if(existingUser){
                return c.json({
                    message : `${existingUser.name} (${existingUser.uid}) already exists in database.`
                }, 200)
            }

            
            const newUser = await UsersRepository.addNewUser({
                uid : userId,
                username,
                name : first_name + " " + last_name,
                email,
                phone,
            } as NewUser);
    
            return c.json({
                message : `${newUser.name} (${newUser.uid}) successfully inserted into database.`
            }, 200)

        }catch(err){
            return c.json({
                message : `Error inserting ${first_name} (${userId}) into database. ${err}`
            }, 500)
        }

    }
}