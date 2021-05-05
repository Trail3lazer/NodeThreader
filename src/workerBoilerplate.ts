import fs from "fs";
import cluster from "cluster";
import { bindCallback, from, merge, Observable } from "rxjs";
import { finalize, map, switchMap, switchMapTo, take, tap } from "rxjs/operators";
import { workerArgs } from "./workerFactory";

export function worker<T, U>(fn: (x: T) => Promise<U>, args: workerArgs<T>) {
    const writeSteams = [];
    for (let name of Object.keys(args)) {
        const results: Observable<U>[] = [];
        const path = "./" + name + "Result.json";
        const stream = fs.createWriteStream(path);
        const write$: (chunk: any) => Observable<any> = bindCallback(stream.write);

        for (let val of args[name]) {
            results.push(from(fn(val)));
        }

        const fileStream$ = merge(results).pipe(
            take(results.length),
            map((x) => JSON.stringify(x)),
            switchMap((x: string) => write$(x)),
            tap((err: Error | null | undefined) => {
                if (err)
                    console.error(
                        "Worker thread had error writing results. Worker ID: " + cluster.worker.id + ", Topic: " + name + ", Error: " + JSON.stringify(err)
                    );
            }),
            switchMapTo(bindCallback(stream.end)()),
            tap(() => stream.destroy())
        );
        writeSteams.push(fileStream$);
    }
    merge(writeSteams)
        .pipe(
            take(writeSteams.length),
            finalize(() => cluster.worker.kill())
        )
        .subscribe();
}
