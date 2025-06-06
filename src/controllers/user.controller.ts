import { get } from "http";
import { UsersRepository } from "../repositories/users.repository"
import { SubscriptionTier } from "../db/schema";

export const UserController = {

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

    async updateUserUsageMetrics(userId : string, chatTokensUsed : number=0, voiceTokensUsed : number=0, internetCallsUsed: number=0, semanticQueriesUsed : number = 0){
        const userMetrics = await UsersRepository.incrementUserUsageMetrics(userId, chatTokensUsed, voiceTokensUsed, internetCallsUsed, semanticQueriesUsed);

        return userMetrics;
    }

}