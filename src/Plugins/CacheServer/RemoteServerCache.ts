import { Collection } from 'discordeno';
import { CacheServer } from './CacheServer';
export class RemoteServerCache extends Collection<string,any> {
    server: CacheServer;
    path: string;
    constructor(server: CacheServer, options: { path: string, maxSize: number }) {
        super(null, options);
        this.server = server;
        this.path = options.path;
    }
}

