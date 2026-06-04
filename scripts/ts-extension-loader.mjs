const EXTENSIONS = [".ts", ".tsx"]

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    if (
      error?.code !== "ERR_MODULE_NOT_FOUND" ||
      specifier.startsWith("node:") ||
      /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(specifier) ||
      /\.[cm]?[jt]sx?$/.test(specifier)
    ) {
      throw error
    }

    for (const extension of EXTENSIONS) {
      try {
        return await nextResolve(`${specifier}${extension}`, context)
      } catch {
        // Try the next TypeScript extension.
      }
    }

    throw error
  }
}
