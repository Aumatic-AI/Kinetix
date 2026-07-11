import { inngest } from "./client";

// This is where you will define your background jobs using inngest.createFunction.
// For example:
// export const helloWorld = inngest.createFunction(
//   { id: "hello-world" },
//   { event: "test/hello.world" },
//   async ({ event, step }) => {
//     await step.sleep("wait-a-moment", "1s");
//     return { event, body: "Hello, World!" };
//   }
// );

export const functions = [
  // helloWorld
];
