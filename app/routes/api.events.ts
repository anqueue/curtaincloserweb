import { LoaderFunctionArgs } from "@remix-run/node";
import { eventStream } from "remix-utils/sse/server";
import { emitter } from "~/services/sse.server";

export async function loader({ request }: LoaderFunctionArgs) {
  return eventStream(request.signal, function setup(send) {
    send({ event: "keep-alive", data: `hello` });

    emitter.on("message", (message) => {
      send({ event: "message", data: message });
    });

    return () => {
      emitter.removeAllListeners("message");
    };
  });
}
