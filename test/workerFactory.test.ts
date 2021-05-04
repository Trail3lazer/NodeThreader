import fs, { WriteStream } from "fs";
import { switchMapTo, tap } from "rxjs/operators";
import { WorkerFactory } from "../src/workerFactory";

describe("WorkerFactory", () => {
    const testFunction = (addend: number) => {
        return addend + 1 ?? 1;
    };
    let classUnderTest: WorkerFactory;
    let writeStream: WriteStream;
    jest.mock("cluster");
    jest.mock("os");
    jest.mock("fs");
    beforeEach(() => {
        jest.resetAllMocks();
        buildFsSpies();
        classUnderTest = new WorkerFactory(fs);
    });
    describe("createWorkerFile", () => {
        test("creates a file from a function", (done) => {
            classUnderTest
                .createWorkerFile(testFunction)
                .pipe(
                    tap((path) => {
                        expect(fs.createWriteStream).toHaveBeenCalledWith(path);
                        expect(writeStream.write).toHaveBeenCalled();
                    }),
                    switchMapTo(classUnderTest.deleteWorkerFile())
                )
                .subscribe(() => done());
        });
    });
    describe("deleteWorkerFile", () => {
        test("deletes as expected", (done) => {
            let path = "";
            classUnderTest
                .createWorkerFile(testFunction)
                .pipe(
                    tap((x) => (path = x)),
                    switchMapTo(classUnderTest.deleteWorkerFile())
                )
                .subscribe((err) => {
                    expect(fs.unlink).toBeCalledWith(path, expect.anything());
                    done();
                });
        });
    });

    const buildFsSpies = (): void => {
        writeStream = { write: (_: string) => true, end: () => {} } as WriteStream;
        jest.spyOn(writeStream, "write");
        jest.spyOn(fs, "createWriteStream").mockReturnValue(writeStream);
        jest.spyOn(fs, "unlink").mockImplementation((_, fn) => {
            fn(null);
        });
    };
});
