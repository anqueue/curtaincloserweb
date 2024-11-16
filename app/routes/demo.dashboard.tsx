import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { useEventSource } from "remix-utils/sse/react";
import { sendEvent } from "~/services/sse.server";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import {
  extendToken,
  generateToken,
  revokeToken,
  TOKENS,
} from "~/services/tokens.server";
import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import {
  Button,
  Card,
  Container,
  Flex,
  Paper,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
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
}: {
  token: string;
  expiry: number;
  selected: boolean;
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
    <Card>
      <div>
        <Text fw={selected ? "bold" : "normal"}>{token}</Text>
        <div>
          Expires: {new Date(expiry).toLocaleTimeString()} (
          {expiryTime.toFixed(0)}s)
        </div>
      </div>
      <div>
        <Form method="post" action="/demo/dashboard">
          <input type="hidden" name="action" value="revoke" />
          <input type="hidden" name="token" value={token} />
          <button type="submit">Revoke</button>
        </Form>
        <Form method="post" action="/demo/dashboard">
          <input type="hidden" name="action" value="extend" />
          <input type="hidden" name="token" value={token} />
          <button type="submit">Extend</button>
        </Form>
      </div>
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

  // return (
  //   <div>
  //     <h1>Demo Access Dashboard</h1>

  //     <div>
  //       <Form method="post" action="/demo/dashboard">
  //         <input type="hidden" name="action" value="send-event" />
  //         <div>{message ? <p>{message}</p> : "Waiting for events..."}</div>
  //         <button type="submit">Send Event</button>
  //       </Form>

  //       <Form method="post" action="/demo/dashboard">
  //         <input type="hidden" name="action" value="create-demo-link" />
  //         <button type="submit">Create Demo Link</button>
  //         {actionData?.action === "create-demo-link" && (
  //           <div>
  //             <p>
  //               <a href={actionData.url}>{actionData.url}</a>
  //               <br />
  //               <span>Token: {actionData.token}</span>
  //               <br />

  //               <QRCode value={actionData.url} />
  //             </p>
  //           </div>
  //         )}
  //       </Form>
  //     </div>

  //     <h2>Active Tokens</h2>
  //     <ul>
  //       {tokens.map((token) => (
  //         <TokenItem
  //           key={token.token}
  //           token={token.token}
  //           expiry={token.expiry}
  //         />
  //       ))}
  //     </ul>
  //   </div>
  // );

  return (
    <Container p="xs">
      <Title order={2} ta="center">
        Curtain Closer Demo
      </Title>
      <Form method="post" action="/demo/dashboard">
        <input type="hidden" name="action" value="create-demo-link" />
        <Flex justify="center" align="center" mt="sm">
          <Button type="submit">Create Demo Link</Button>
        </Flex>
        {selectedToken && (
          <QRCode
            style={{ display: "block", margin: "10px auto" }}
            value={`${window.location.origin}/demo/controls?token=${selectedToken}`}
          />
        )}
        {actionData?.action === "create-demo-link" && (
          <div>
            <p>
              <a href={actionData.url}>{actionData.url}</a>
              <br />
              <span>Token: {actionData.token}</span>
              <br />
            </p>
          </div>
        )}
      </Form>
      <Paper withBorder mt="sm" radius="md" p="sm">
        <Text fw="bold" size="lg">
          Active Demo Tokens
        </Text>
        {tokens.map((token) => (
          <UnstyledButton
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              marginBottom: "0.5rem",
            }}
            key={token.token}
            onClick={() => {
              setSelectedToken(token.token);
            }}
          >
            <TokenItem
              selected={selectedToken === token.token}
              token={token.token}
              expiry={token.expiry}
            />
          </UnstyledButton>
        ))}
      </Paper>
    </Container>
  );
}
