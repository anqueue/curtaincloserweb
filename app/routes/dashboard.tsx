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
  const body = await request.formData();
  const action = body.get("action");
  if (action == "send-event") {
    sendEvent(Math.random().toString());
    return { action };
  } else if (action == "create-demo-link") {
    const token = generateToken();
    return json({
      action,
      url: `http://localhost:3000/demo?token=${token}`,
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

const TokenItem = ({ token, expiry }: { token: string; expiry: number }) => {
  return (
    <li>
      <div>
        <div>
          <div>{token}</div>
          <div>Expires: {new Date(expiry).toLocaleString()} (</div>
        </div>
        <div>
          <Form method="post" action="/dashboard">
            <input type="hidden" name="action" value="revoke" />
            <input type="hidden" name="token" value={token} />
            <button type="submit">Revoke</button>
          </Form>
          <Form method="post" action="/dashboard">
            <input type="hidden" name="action" value="extend" />
            <input type="hidden" name="token" value={token} />
            <button type="submit">Extend</button>
          </Form>
        </div>
      </div>
    </li>
  );
};

export default function Dashboard() {
  const message = useEventSource("/api/events", { event: "message" });
  const actionData = useActionData<Action>();
  const { tokens } = useLoaderData<typeof loader>();

  return (
    <div>
      <h1>Dashboard</h1>

      <div>
        <Form method="post" action="/dashboard">
          <input type="hidden" name="action" value="send-event" />
          <div>{message ? <p>{message}</p> : "Waiting for events..."}</div>
          <button type="submit">Send Event</button>
        </Form>

        <Form method="post" action="/dashboard">
          <input type="hidden" name="action" value="create-demo-link" />
          <button type="submit">Create Demo Link</button>
          {actionData?.action === "create-demo-link" && (
            <div>
              <p>
                <a href={actionData.url}>Demo Link</a>
                <br />
                <span>Token: {actionData.token}</span>
              </p>
            </div>
          )}
        </Form>
      </div>

      <h2>Active Tokens</h2>
      <ul>
        {tokens.map((token) => (
          <TokenItem
            key={token.token}
            token={token.token}
            expiry={token.expiry}
          />
        ))}
      </ul>
    </div>
  );
}
