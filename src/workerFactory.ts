import { Cluster } from "node:cluster";
import { createWriteStream } from "fs";
import { ClusterSettings } from "node:cluster";
import { cpus } from "os";
import { bindCallback, Observable, of } from "rxjs";
import { mapTo, tap } from "rxjs/operators";
const cluster: Cluster = require("cluster");

export class WorkerFactory {
    private jobPath: string = process.cwd() + "tempProcess";

    public createWorkerFile<T>(job: () => T): Observable<string> {
        const stream = createWriteStream(this.jobPath);
        if (stream.write(job)) {
            stream.end();
            return of(this.jobPath);
        } else {
            console.warn("WorkerFactory.createWorkerFile: Writing the worker file is delayed...");
            return bindCallback(stream.on)("drain").pipe(
                tap(() => {
                    stream.end();
                    console.info("WorkerFactory.createWorkerFile: Finished writing worker file.");
                }),
                mapTo(this.jobPath)
            );
        }
    }

    public setup(overrides: ClusterSettings = {}): void {
        const cSettings: ClusterSettings = {
            exec: this.jobPath,
            ...overrides,
        };
        cluster.setupMaster(cSettings);
    }

    public spawnWorkers(limit: number = 0): void {
        this.setup();
        let maxWorkers: number;
        if (limit > 0) {
            maxWorkers = limit;
        } else {
            maxWorkers = cpus().length;
        }
        for (let index = 0; index < maxWorkers; index++) {
            cluster.fork();
        }
    }
}
