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
// import { IconClock } from "@tabler/icons-react";

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
  const tokens = Array.from(TOKENS.entries()).map(([token, expiry]) => ({
    token,
    expiry,
  }));
  return json({ tokens });
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
  const message = useEventSource("/api/events", { event: "message" });
  const actionData = useActionData<Action>();
  const { tokens } = useLoaderData<typeof loader>();
  const [selectedToken, setSelectedToken] = useState<string | null>("");

  useEffect(() => {
    if (actionData?.action == "create-demo-link") {
      setSelectedToken(actionData.token);
    }
  }, [actionData]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-center">Curtain Closer Demo</CardTitle>
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

      <Card>
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
    </div>
  );
}
