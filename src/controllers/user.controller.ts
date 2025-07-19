import { SubscriptionTier } from "../db/schema";
import { UsersRepository } from "../repositories/users.repository"

import { NewUser } from "../utils/models";
import { Context } from "hono";

export const UserController = {

    //TODO: Do not give an option to change email if once created account from clerk.
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

            await UsersRepository.createUserUsageMetrics(userId, SubscriptionTier.Basic)

            return c.json({
                message : `${newUser.name} (${newUser.uid}) successfully inserted into database.`
            }, 200)

        }catch(err){
            return c.json({
                message : `Error inserting ${first_name} (${userId}) into database. ${err}`
            }, 500)
        }
    },

    async getUser(userId : string){

        const user = await UsersRepository.getUserById(userId)
        if(user) return user;
    },

    async getUserUsageMetrics(userId : string){
        let userMetrics = await UsersRepository.getUserUsageMetrics(userId)
        if(userMetrics) return userMetrics;

        userMetrics = await UsersRepository.createUserUsageMetrics(userId, SubscriptionTier.Basic);
        return userMetrics;
    },

    async resetUserUsageMetrics(userId : string){
        const userMetrics = await UsersRepository.resetUserUsageMetrics(userId);
        return userMetrics;
    },

    async incrementUserUsageMetrics(userId : string, chatTokensUsed : number=0, voiceTokensUsed : number=0, internetCallsUsed: number=0, semanticQueriesUsed : number = 0){
        const userMetrics = await UsersRepository.incrementUserUsageMetrics(userId, chatTokensUsed, voiceTokensUsed, internetCallsUsed, semanticQueriesUsed);

        return userMetrics;
    }

}