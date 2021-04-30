import { statSync } from "fs";
import { switchMapTo, tap } from "rxjs/operators";
import { WorkerFactory } from "../src/workerFactory";

describe("WorkerFactory", () => {
    const testFunction = (addend: number) => {
        return addend + 1 ?? 1;
    };
    let classUnderTest: WorkerFactory;
    beforeEach(() => {
        classUnderTest = new WorkerFactory();
    });
    describe("createWorkerFile", () => {
        test("creates a file from a function", (done) => {
            const testFunction = (addend: number) => {
                return addend + 1 ?? 1;
            };
            classUnderTest.createWorkerFile(testFunction).subscribe((path) => {
                expect(() => {
                    statSync(path);
                }).not.toThrow();
                classUnderTest.deleteWorkerFile().subscribe();
                done();
            });
        });
    });
    describe("deleteWorkerFile", () => {
        test("deletes as expected", (done) => {
            let path: string;
            classUnderTest
                .createWorkerFile(testFunction)
                .pipe(
                    tap((x) => (path = x)),
                    switchMapTo(classUnderTest.deleteWorkerFile())
                )
                .subscribe((success) => {
                    expect(success).toBeTruthy();
                    expect(() => {
                        statSync(path);
                    }).toThrow();
                    done();
                });
        });
    });
});
