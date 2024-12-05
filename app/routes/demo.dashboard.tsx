import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { useEventSource } from "remix-utils/sse/react";
import { Button } from "~/components/ui/button";
import { authenticator } from "~/services/auth.server";
import { sendEvent } from "~/services/sse.server";
import {
  extendToken,
  generateToken,
  revokeToken,
  TOKENS,
} from "~/services/tokens.server";

import { Clock, RefreshCwIcon, TrashIcon } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "~/components/ui/dialog";
import Device, { DeviceInterface } from "~/services/models/Device";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { send } from "vite";
import { Mongoose } from "mongoose";
import { Checkbox } from "~/components/ui/checkbox";
// import { IconClock } from "@tabler/icons-react";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  const tokens = Array.from(TOKENS.entries()).map(([token, expiry]) => ({
    token,
    expiry,
  }));

  const devices = await Device.find();
  return json({ tokens, devices });
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

  const url = new URL(request.url);
  const body = await request.formData();
  const action = body.get("action");

  if (action == "send-event") {
    sendEvent(Math.random().toString());
    return { action };
  } else if (action == "create-demo-link") {
    const token = generateToken();
    return json({
      action,
      url: `${url.origin}/demo/controls?token=${token}`,
      token,
    });
  } else if (action == "revoke") {
    revokeToken(body.get("token") as string);
    return { action };
  } else if (action == "extend") {
    const newExpiry = extendToken(body.get("token") as string);
    return { action, newExpiry };
  } else if (action == "create-device") {
    await Device.create({
      openRotations: 0,
      closeRotations: 0,
      openAt: 0,
      closeAt: 0,
    });
    return { action };
  } else if (action == "edit-device") {
    const id = body.get("_id") as string;
    const openRotations = parseInt(body.get("openRotations") as string);
    const closeRotations = parseInt(body.get("closeRotations") as string);
    const openAt = parseInt(body.get("openAt") as string);
    const closeAt = parseInt(body.get("closeAt") as string);
    const swapOpenClose = body.get("swapOpenClose") === "on";
    console.log(openRotations, closeRotations, openAt, closeAt, swapOpenClose);
    await Device.findByIdAndUpdate(id, {
      openRotations,
      closeRotations,
      openAt,
      closeAt,
      swapOpenClose,
    });
    return { action };
  } else if (action == "open" || action == "close") {
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

    sendEvent(`${_action == "open" ? "+" : "-"}${Math.abs(rotations)}`);
  }

  return null;
}

type Action = {
  action: "send-event" | "create-demo-link" | "revoke" | "extend";
} & (
  | {
      action: "create-demo-link";
      url: string;
      token: string;
    }
  | {
      action: "send-event";
    }
  | {
      action: "revoke";
    }
  | {
      action: "extend";
      newExpiry: number;
    }
  | {
      action: "create-device";
    }
  | {
      action: "edit-device";
    }
  | {
      action: "open";
    }
  | {
      action: "close";
    }
);

const TokenItem = ({
  token,
  expiry,
  selected,
  onClick,
}: {
  token: string;
  expiry: number;
  selected: boolean;
  onClick: () => void;
}) => {
  const [expiryTime, setExpiryTime] = useState(
    Math.max(0, expiry - Date.now()) / 1000
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setExpiryTime(Math.max(0, expiry - Date.now()) / 1000);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <Card
      className={`mb-4 cursor-pointer transition-colors hover:bg-slate-50/10 ${
        selected ? "bg-slate-50/10" : ""
      } ${selected ? "border-primary" : "border-slate-200/10"}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className={`font-mono ${selected ? "font-bold" : ""}`}>
              {token}
            </p>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-4 w-4" />
              <span>
                Expires in {Math.floor(expiryTime / 60)}m{" "}
                {Math.floor(expiryTime % 60)}s
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            <Form method="post">
              <input type="hidden" name="action" value="revoke" />
              <input type="hidden" name="token" value={token} />
              <Button variant="destructive" size="sm" type="submit">
                <TrashIcon className="h-4 w-4" />
              </Button>
            </Form>
            <Form method="post">
              <input type="hidden" name="action" value="extend" />
              <input type="hidden" name="token" value={token} />
              <Button variant="outline" size="sm" type="submit">
                <RefreshCwIcon className="h-4 w-4" />
              </Button>
            </Form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Dashboard() {
  const actionData = useActionData<Action>();
  const { tokens, devices } = useLoaderData<typeof loader>();
  const [selectedToken, setSelectedToken] = useState<string | null>("");
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    if (actionData?.action == "create-demo-link") {
      setSelectedToken(actionData.token);
    }
  }, [actionData]);

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
      <div className="font-semibold flex flex-col text-xl mb-4 items-center">
        Curtain Clock
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">QR Code Viewer</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {selectedToken ? (
            <div className="flex flex-col items-center">
              <QRCode
                value={`${window.location.origin}/demo/controls?token=${selectedToken}`}
                style={{
                  background: "white",
                  padding: "14px",
                  borderRadius: "12px",
                }}
                level="L"
                size={512}
              />
              <div className="text-center mt-4">
                <a
                  href={`${window.location.origin}/demo/controls?token=${selectedToken}`}
                  className="text-primary hover:underline break-all"
                >
                  {window.location.origin}/demo/controls?token={selectedToken}
                </a>
                <div className="mt-2">
                  <Badge variant="secondary">Token: {selectedToken}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center">Select a token to generate QR code</p>
          )}
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Active Demo Tokens</CardTitle>
        </CardHeader>

        <CardContent>
          <Form method="post" className="mb-4 flex justify-center">
            <input type="hidden" name="action" value="create-demo-link" />
            <Button type="submit" className="flex flex-col items-center w-52">
              New Demo Link
            </Button>
          </Form>
          <ScrollArea className="pr-4">
            {tokens.map((token) => (
              <TokenItem
                key={token.token}
                token={token.token}
                expiry={token.expiry}
                selected={selectedToken === token.token}
                onClick={() => setSelectedToken(token.token)}
              />
            ))}
          </ScrollArea>
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Options</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="mb-4 text-center">
            {devices.length ? (
              devices.map((device) => (
                <div
                  key={device._id}
                  className="flex items-center justify-between w-full"
                >
                  <Form method="post" className="space-y-4 w-full">
                    <input type="hidden" name="action" value="edit-device" />
                    <input type="hidden" name="_id" value={device._id} />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid grid-cols-2 gap-4 md:col-span-2">
                        <NumberInput
                          id={`openRotations-${device._id}`}
                          name="openRotations"
                          defaultValue={device.openRotations}
                          label="Open Rotations"
                          className="w-full"
                        />
                        <NumberInput
                          id={`closeRotations-${device._id}`}
                          name="closeRotations"
                          defaultValue={device.closeRotations}
                          label="Close Rotations"
                          className="w-full"
                        />
                        <TimeInput
                          id={`openAt-${device._id}`}
                          name="openAt"
                          defaultValue={device.openAt}
                          label="Open At"
                          className="w-full"
                        />
                        <TimeInput
                          id={`closeAt-${device._id}`}
                          name="closeAt"
                          defaultValue={device.closeAt}
                          label="Close At"
                          className="w-full"
                        />
                      </div>

                      <div className="flex flex-col justify-end space-y-16 md:col-span-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`swapOpenClose-${device._id}`}
                            name="swapOpenClose"
                            defaultChecked={device.swapOpenClose}
                          />
                          <label
                            htmlFor={`swapOpenClose-${device._id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            Swap Open/Close
                          </label>
                        </div>

                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </Form>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-600">No devices found</p>
            )}
          </div>
          {devices.length <= 0 && (
            <Form method="post" action="/demo/dashboard" className="mb-4">
              <input type="hidden" name="action" value="create-device" />
              <Button type="submit" className="w-full">
                Create Device
              </Button>
            </Form>
          )}
        </CardContent>
      </Card>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Curtain Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-600">
              Last message: {lastMessage || "No messages yet"}
            </p>
          </div>
          <Form method="post">
            <input type="hidden" name="action" value="open" />
            <Button type="submit" className="mb-4 w-full">
              Open
            </Button>
          </Form>
          <Form method="post">
            <input type="hidden" name="action" value="close" />
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

const TimeInput = ({ id, name, defaultValue, label }) => {
  // Convert number to HH:mm format
  const formatTimeValue = (num) => {
    const hours = Math.floor(num);
    const minutes = Math.round((num % 1) * 60);
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
  };

  // Convert HH:mm to decimal number
  const parseTimeValue = (timeString) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return hours + minutes / 60;
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="time"
        defaultValue={formatTimeValue(defaultValue)}
        className="w-32 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-calendar-picker-indicator]:dark:invert"
        onChange={(e) => {
          // Store the decimal value in a hidden input for form submission
          const hiddenInput = document.getElementById(`${id}-hidden`);
          if (hiddenInput) {
            hiddenInput.value = parseTimeValue(e.target.value);
          }
        }}
      />
      <input
        type="hidden"
        id={`${id}-hidden`}
        name={name}
        defaultValue={defaultValue}
      />
    </div>
  );
};

const NumberInput = ({ id, name, defaultValue, label }) => {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          name={name}
          defaultValue={defaultValue}
          className="w-24 pr-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={0}
          step={1}
          onChange={(e) => {
            e.target.value = Math.max(0, parseInt(e.target.value) || 0);
          }}
        />
      </div>
    </div>
  );
};
