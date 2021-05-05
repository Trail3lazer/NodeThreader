import { ClusterSettings, Worker } from "node:cluster";
import * as _fs from "fs";
import * as _os from "os";
import * as _cluster from "cluster";
import { bindCallback, Observable, of } from "rxjs";
import { mapTo, take, tap } from "rxjs/operators";
import { worker } from "./workerBoilerplate";
export interface workerArgs<T> {
    [argName: string]: T[];
}
export interface workerConfig<T, U> {
    jobPath: string;
    job: (arg: U) => T;
    args: workerArgs<U>;
}
export class WorkerFactory {
    public constructor(private readonly fs = _fs, private readonly cluster = _cluster, private readonly os = _os) {}

    public closeWorkers(): void {
        this.cluster.disconnect();
    }

    public spawnWorkers<T, U>(configs: workerConfig<T, U>[], limit: number = 0): void {
        let maxWorkers: number;
        if (limit > 0) {
            maxWorkers = limit;
        } else {
            maxWorkers = this.os.cpus().length;
        }
        for (let index = 0; index < maxWorkers; index++) {
            this.buildWorker(index, configs[index]);
        }
    }

    private buildWorker<T, U>(id: number, config: workerConfig<T, U>): Worker {
        const jobPath: string = `./tempProcess${id}.js`;
        this.createWorkerFile(config);
        this.setup(jobPath);
        return this.cluster.fork();
    }

    private setup(jobPath: string, overrides: ClusterSettings = {}): void {
        const cSettings: ClusterSettings = {
            exec: jobPath,
            ...overrides,
        };
        this.cluster.setupMaster(cSettings);
        this.cluster.on("disconnect", () => this.deleteWorkerFile(jobPath).pipe(take(1)).subscribe());
    }

    private deleteWorkerFile(jobPath: string): Observable<Error | null> {
        return bindCallback(this.fs.unlink)(jobPath);
    }

    private createWorkerFile<T, U>({ jobPath, job, args }: workerConfig<T, U>): Observable<string> {
        const stream = this.fs.createWriteStream(jobPath);
        const jobFileString = `${worker} \n worker(${job}, ${args});`;
        if (stream.write(jobFileString)) {
            stream.end();
            return of(jobPath);
        } else {
            console.warn("WorkerFactory.createWorkerFile: Writing the worker file is delayed...");
            return bindCallback(stream.on)("drain").pipe(
                tap(() => {
                    stream.end();
                    console.info("WorkerFactory.createWorkerFile: Finished writing worker file.");
                }),
                mapTo(jobPath)
            );
        }
    }
}
