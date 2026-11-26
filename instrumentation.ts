export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startCallbackWorker } = await import("./lib/vision-callbacks");
    startCallbackWorker();
  }
}
