import { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import { emitter } from "~/services/sse.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return eventStream(request.signal, function setup(send) {
    // async function run() {
    //   for await (let _ of interval(1000, { signal: request.signal })) {
    //     send({ event: "message", data: new Date().toISOString() });
    //   }
    // }

    // run();

    emitter.on("message", (message) => {
      send({ event: "message", data: message });
    });

    return () => {
      emitter.removeAllListeners("message");
    };
  });
}
