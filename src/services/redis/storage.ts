import redis from "./redis"

export const RedisStorage = {

    async getItem(key : string){
        return await redis.get(key)
    },

    setItem(key : string, value : string, duration? : number){
        if(duration !== undefined && duration !== null)
            redis.set(key, value, 'EX', duration)
        else
            redis.set(key, value)
    },

    async setItemAsync(key:string, value:string, duration? : number){
        if(duration !== undefined && duration !== null)
            await redis.set(key, value, 'EX', duration)
        else
            await redis.set(key, value, 'KEEPTTL')
    },

    async removeItem(key : string){
        return await redis.del(key)
    },
    
}