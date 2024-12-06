import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { Badge } from "lucide-react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "~/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { authenticator } from "~/services/auth.server";
import Device, { DeviceInterface } from "~/services/models/Device";
import { sendEvent } from "~/services/sse.server";
import { isValidToken } from "~/services/tokens.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token");

  if (!token) {
    throw json({ message: "Token is required" }, { status: 400 });
  }

  if (!isValidToken(token)) {
    throw json({ message: "Invalid token" }, { status: 401 });
  }

  return { token };
}

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.formData();
  const token = body.get("token");
  if (!token) {
    throw json({ message: "Token is required" }, { status: 400 });
  }

  if (!isValidToken(token)) {
    throw json({ message: "Invalid token" }, { status: 401 });
  }

  const action = body.get("action");

  if (action == "open" || action == "close") {
    const device: DeviceInterface | null = await Device.findOne();
    if (!device) {
      throw new Error("No devices found");
    }

    let _action = action;
    if (device.swapOpenClose) {
      _action = action == "open" ? "close" : "open";
    }

    let rotations = 0;
    if (_action == "open") {
      rotations = device.openRotations;
    } else {
      rotations = device.closeRotations;
    }

    sendEvent(`rotate ${_action == "open" ? "+" : "-"}${Math.abs(rotations)}`);
  } else {
    throw json({ message: "Invalid action" }, { status: 400 });
  }

  return null;
}

export default function DemoControls() {
  const { token } = useLoaderData<{ token: string }>();
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/events");

    es.onopen = () => {
      console.log("Connection opened");
      setConnected(true);
    };

    es.onerror = () => {
      console.log("Connection error");
      setConnected(false);
    };

    es.onmessage = (event) => {
      console.log("Message received:", event.data);
      setLastMessage(event.data);
    };

    setEventSource(es);

    // Cleanup on component unmount
    return () => {
      es.close();
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Curtain Closer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              Last message: {lastMessage || "No messages yet"}
            </p>
          </div>
          <Form method="post" action="/demo/controls" navigate={false}>
            <input type="hidden" name="action" value="open" />
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="mb-4 w-full">
              Open
            </Button>
          </Form>
          <Form method="post" action="/demo/controls" navigate={false}>
            <input type="hidden" name="action" value="close" />
            <input type="hidden" name="token" value={token} />
            <Button type="submit" className="mb-4 w-full">
              Close
            </Button>
          </Form>
          <div className="flex items-center justify-center gap-2">
            <div className="relative">
              <div
                className={`w-3 h-3 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <div
                className={`absolute -inset-0.5 rounded-full opacity-50 animate-ping duration-1000 ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />
            </div>
            <span className="text-sm">
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
