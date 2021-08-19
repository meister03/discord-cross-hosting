declare module 'discord-cross-hosting' {
    import {EventEmitter} from "events";
    import mongoose from "mongoose";
    export class Manager extends EventEmitter {
        constructor(connectionurl: string, option: {
            totalShards: number | "auto",
            totalMachines: string | number,
            machineID: string | number,
            master: boolean,
            token: string
        })

        getData(): Promise<{shardList: number[], ShardsperCluster: (shardAmount: string | number) => number, totalShards: number | "auto"}>

        listen(manager: any): any;
    }
    export class Client extends EventEmitter {
        constructor(connectionurl: string, option: {
            totalMachines: number,
            TimeoutforResponses: number,
            parseasShardArray: boolean,
            token: string
        })
        listen(): Promise<mongoose.Mongoose>;
        broadcastEval(script: string | Function, shard: number): Promise<any> | Promise<Array<any>>;
    }
}