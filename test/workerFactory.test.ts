import { statSync } from "fs";
import { WorkerFactory } from "../src/workerFactory";

describe("WorkerFactory", () => {
    let classUnderTest: WorkerFactory;
    beforeEach(() => {
        classUnderTest = new WorkerFactory();
    });
    describe("createWorkerFile", () => {
        test("makes a file from a function", () => {
            const testFunction = (addends: number[]) => {
                const last = addends?.pop();
                return last ? last + 1 : 1;
            };
            classUnderTest.createWorkerFile(testFunction).subscribe((path) => expect(statSync(path)).toBeTruthy());
        });
    });
});
