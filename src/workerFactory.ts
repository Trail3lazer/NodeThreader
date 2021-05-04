import { ClusterSettings } from "node:cluster";
import * as _fs from "fs";
import * as _os from "os";
import * as _cluster from "cluster";
import { bindCallback, Observable, of } from "rxjs";
import { mapTo, tap } from "rxjs/operators";
export class WorkerFactory {
    private jobPath: string = "./tempProcess.js";

    public constructor(private readonly fs = _fs, private readonly cluster = _cluster, private readonly os = _os) {}
    public createWorkerFile<T>(job: (args: any) => T): Observable<string> {
        const stream = this.fs.createWriteStream(this.jobPath);
        const jobFileString = `export const job = ${job}`;
        if (stream.write(jobFileString)) {
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
        this.cluster.setupMaster(cSettings);
        this.cluster.on("exit", this.deleteWorkerFile);
    }

    public spawnWorkers(limit: number = 0): void {
        this.setup();
        let maxWorkers: number;
        if (limit > 0) {
            maxWorkers = limit;
        } else {
            maxWorkers = this.os.cpus().length;
        }
        for (let index = 0; index < maxWorkers; index++) {
            this.cluster.fork();
        }
    }

    public deleteWorkerFile(): Observable<Error | null> {
        return bindCallback(this.fs.unlink)(this.jobPath);
    }
}
