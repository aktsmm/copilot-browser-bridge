export interface FileOperationErrorLabels {
  invalidPath: string;
  pathEscapesWorkspace: string;
  notAFile: string;
  fileAlreadyExists: string;
}

export function localizeFileOperationError(
  errorMessage: string | undefined,
  labels: FileOperationErrorLabels,
): string | undefined {
  if (!errorMessage) {
    return errorMessage;
  }

  if (errorMessage.includes("Invalid file path")) {
    return labels.invalidPath;
  }

  if (errorMessage.includes("Path escapes workspace")) {
    return labels.pathEscapesWorkspace;
  }

  if (errorMessage.includes("Target path is not a file")) {
    return labels.notAFile;
  }

  if (errorMessage.includes("File already exists")) {
    return labels.fileAlreadyExists;
  }

  return errorMessage;
}
