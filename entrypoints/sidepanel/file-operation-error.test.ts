import { describe, expect, it } from "vitest";
import { localizeFileOperationError } from "./file-operation-error";

const labels = {
  invalidPath: "invalid path localized",
  pathEscapesWorkspace: "escape localized",
  notAFile: "not a file localized",
  fileAlreadyExists: "exists localized",
};

describe("localizeFileOperationError", () => {
  it("localizes known workspace path errors", () => {
    expect(localizeFileOperationError("Invalid file path", labels)).toBe(
      labels.invalidPath,
    );
    expect(localizeFileOperationError("Path escapes workspace", labels)).toBe(
      labels.pathEscapesWorkspace,
    );
  });

  it("localizes file target errors", () => {
    expect(
      localizeFileOperationError("Target path is not a file", labels),
    ).toBe(labels.notAFile);
    expect(localizeFileOperationError("File already exists", labels)).toBe(
      labels.fileAlreadyExists,
    );
  });

  it("keeps unknown errors as-is", () => {
    expect(localizeFileOperationError("custom message", labels)).toBe(
      "custom message",
    );
  });
});
